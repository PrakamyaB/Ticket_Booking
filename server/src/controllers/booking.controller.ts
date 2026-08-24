import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const HOLD_TTL_SECONDS = parseInt(process.env.HOLD_TTL_SECONDS || '600');
const WAITLIST_OFFER_TTL_SECONDS = parseInt(process.env.WAITLIST_OFFER_TTL_SECONDS || '300');

// Broadcast function helper
const broadcastSeatMapUpdate = async (req: AuthRequest, eventId: string) => {
  const io = req.app.get('io');
  if (!io) return;

  try {
    const showSeats = await prisma.showSeat.findMany({
      where: { eventId },
      include: { seat: true },
    });

    const formattedSeats = showSeats.map((ss) => {
      const isHoldActive = ss.status === 'HELD' && ss.heldUntil && ss.heldUntil >= new Date();
      const actualStatus = ss.status === 'BOOKED' ? 'BOOKED' : isHoldActive ? 'HELD' : 'AVAILABLE';

      return {
        id: ss.id,
        seatId: ss.seatId,
        rowName: ss.seat.rowName,
        colNumber: ss.seat.colNumber,
        category: ss.seat.category,
        status: actualStatus,
        heldByUserId: actualStatus === 'HELD' ? ss.heldByUserId : null,
        heldUntil: ss.heldUntil,
      };
    });

    io.to(`event_${eventId}`).emit('seat-update', formattedSeats);
  } catch (err) {
    console.error('Error broadcasting update:', err);
  }
};

// Generate a random booking reference
function generateReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'TKT-';
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

export const holdSeats = async (req: AuthRequest, res: Response) => {
  const { eventId, showSeatIds } = req.body;
  const userId = req.user?.id;

  if (!eventId || !showSeatIds || !Array.isArray(showSeatIds) || showSeatIds.length === 0) {
    return res.status(400).json({ error: 'Event ID and seat IDs are required' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const heldUntil = new Date(Date.now() + HOLD_TTL_SECONDS * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the seats and lock/read them
      const seats = await tx.showSeat.findMany({
        where: {
          id: { in: showSeatIds },
          eventId: eventId,
        },
        include: { seat: true },
      });

      if (seats.length !== showSeatIds.length) {
        throw new Error('Some seats do not exist for this event');
      }

      // 2. Validate seat availability
      for (const seat of seats) {
        const isHoldActive = seat.status === 'HELD' && seat.heldUntil && seat.heldUntil >= new Date();
        if (seat.status === 'BOOKED' || isHoldActive) {
          throw new Error(`Seat ${seat.seat.rowName}-${seat.seat.colNumber} is no longer available`);
        }
      }

      // 3. Place hold
      await tx.showSeat.updateMany({
        where: {
          id: { in: showSeatIds },
        },
        data: {
          status: 'HELD',
          heldByUserId: userId,
          heldUntil: heldUntil,
        },
      });

      return { success: true, heldUntil };
    });

    // Broadcast change in real-time
    await broadcastSeatMapUpdate(req, eventId);

    res.status(200).json(result);
  } catch (error: any) {
    console.warn('Hold seats attempt failed:', error.message);
    res.status(409).json({ error: error.message || 'Seat hold conflict occurred' });
  }
};

export const confirmBooking = async (req: AuthRequest, res: Response) => {
  const { eventId, showSeatIds, waitlistId } = req.body;
  const userId = req.user?.id;

  if (!eventId || !showSeatIds || !Array.isArray(showSeatIds) || showSeatIds.length === 0) {
    return res.status(400).json({ error: 'Event ID and seat IDs are required' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Verify seats are held by this user and holds are active
      const seats = await tx.showSeat.findMany({
        where: {
          id: { in: showSeatIds },
          eventId: eventId,
          status: 'HELD',
          heldByUserId: userId,
          heldUntil: { gte: new Date() },
        },
        include: { seat: true },
      });

      if (seats.length !== showSeatIds.length) {
        throw new Error('Hold expired or seats are not reserved by you. Please select again.');
      }

      // 2. Fetch event and pricing
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: { categoryPrices: true },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Calculate total pricing
      let totalAmount = 0;
      for (const seat of seats) {
        const pricing = event.categoryPrices.find((p) => p.category === seat.seat.category);
        if (!pricing) {
          throw new Error(`Pricing not configured for seat category ${seat.seat.category}`);
        }
        totalAmount += pricing.price;
      }

      // 3. Create Booking
      const bookingRef = generateReference();
      const newBooking = await tx.booking.create({
        data: {
          eventId,
          userId,
          bookingReference: bookingRef,
          status: 'CONFIRMED',
          totalAmount,
        },
      });

      // 4. Update Show Seats to BOOKED and link to booking
      await tx.showSeat.updateMany({
        where: {
          id: { in: showSeatIds },
        },
        data: {
          status: 'BOOKED',
          bookingId: newBooking.id,
          heldUntil: null,
        },
      });

      // 5. If this booking is completing a waitlist offer, close the waitlist record
      if (waitlistId) {
        const waitlistEntry = await tx.waitlist.findUnique({
          where: { id: waitlistId },
        });

        if (waitlistEntry && waitlistEntry.userId === userId) {
          await tx.waitlist.update({
            where: { id: waitlistId },
            data: { status: 'COMPLETED' },
          });
        }
      }

      // 6. Create Email Log with simulated QR Code ticket
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingRef}`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      const emailBody = `
        <h3>Ticket Confirmed!</h3>
        <p>Dear ${user?.name || 'Customer'},</p>
        <p>Your booking for <strong>${event.title}</strong> is confirmed!</p>
        <p><strong>Booking Ref:</strong> ${bookingRef}</p>
        <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
        <p><strong>Seats:</strong> ${seats.map((s) => `${s.seat.rowName}-${s.seat.colNumber}`).join(', ')}</p>
        <p>Please present the QR code below at the venue entrance:</p>
        <img src="${qrCodeUrl}" alt="Booking QR Ticket" width="150" height="150" />
      `;

      await tx.emailLog.create({
        data: {
          recipient: user?.email || '',
          subject: `Your Ticket Confirmation for ${event.title} - ${bookingRef}`,
          body: emailBody,
        },
      });

      return newBooking;
    });

    // Broadcast seat status update
    await broadcastSeatMapUpdate(req, eventId);

    res.status(201).json(booking);
  } catch (error: any) {
    console.error('Confirm booking failed:', error);
    res.status(400).json({ error: error.message || 'Failed to confirm booking' });
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        showSeats: {
          include: { seat: true },
        },
        event: true,
        user: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Access control: only customer who booked, organiser, or admin can cancel
    if (booking.userId !== userId && req.user?.role !== 'ADMIN' && req.user?.role !== 'ORGANISER') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    const cancelledBooking = await prisma.$transaction(async (tx) => {
      // 1. Cancel the Booking record
      const updated = await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // 2. Release all associated Show Seats
      await tx.showSeat.updateMany({
        where: { bookingId: id },
        data: {
          status: 'AVAILABLE',
          bookingId: null,
          heldByUserId: null,
          heldUntil: null,
        },
      });

      // 3. Write Email Log for cancellation notification
      const emailBody = `
        <h3>Booking Cancelled</h3>
        <p>Dear ${booking.user.name},</p>
        <p>Your booking <strong>${booking.bookingReference}</strong> for <strong>${booking.event.title}</strong> has been successfully cancelled.</p>
        <p>A refund of $${booking.totalAmount.toFixed(2)} has been initiated to your account.</p>
      `;

      await tx.emailLog.create({
        data: {
          recipient: booking.user.email,
          subject: `Cancellation Confirmation: Booking ${booking.bookingReference}`,
          body: emailBody,
        },
      });

      return updated;
    });

    // Broadcast seat status update
    await broadcastSeatMapUpdate(req, booking.eventId);

    // Dynamic import/trigger of waitlist auto-assignment logic
    // We will implement this check in a separate hold-cleanup service that runs in the background.
    // However, we can also trigger it instantly here for a faster response.
    // Let's call the checker service (we will write the service next)
    const { checkAndPromoteWaitlist } = require('../services/hold-cleanup.service');
    // Note: Since cancellations happen synchronously, calling it instantly makes waitlist allocation feel lightning-fast!
    // We run it as fire-and-forget or await it. Let's do it safely
    checkAndPromoteWaitlist(booking.eventId).catch((err: any) => {
      console.error('Waitlist promotion trigger failed:', err);
    });

    res.status(200).json(cancelledBooking);
  } catch (error: any) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const joinWaitlist = async (req: AuthRequest, res: Response) => {
  const { eventId, category } = req.body;
  const userId = req.user?.id;

  if (!eventId || !category) {
    return res.status(400).json({ error: 'Event ID and seat category are required' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Verify that the event category is indeed sold out
    // A category is sold out if there are no AVAILABLE seats in that category
    // (Available means status is AVAILABLE, or HELD but expired)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: {
          include: {
            seats: { where: { category } },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.venue.seats.length === 0) {
      return res.status(400).json({ error: 'Category does not exist for this venue' });
    }

    const availableSeatsCount = await prisma.showSeat.count({
      where: {
        eventId,
        seat: { category },
        status: 'AVAILABLE',
      },
    });

    const activeHeldSeatsCount = await prisma.showSeat.count({
      where: {
        eventId,
        seat: { category },
        status: 'HELD',
        heldUntil: { gte: new Date() },
      },
    });

    const totalAvailable = availableSeatsCount + (event.venue.seats.length - (availableSeatsCount + activeHeldSeatsCount)); // Wait, let's look up directly
    
    // Simplest query for available seats in this category:
    // status is AVAILABLE, or status is HELD but heldUntil is expired (which counts as available)
    const trulyAvailableSeats = await prisma.showSeat.count({
      where: {
        eventId,
        seat: { category },
        OR: [
          { status: 'AVAILABLE' },
          {
            status: 'HELD',
            heldUntil: { lt: new Date() },
          },
        ],
      },
    });

    if (trulyAvailableSeats > 0) {
      return res.status(400).json({
        error: 'Seats are still available in this category. You do not need to join the waitlist.',
      });
    }

    // 2. Check if the user is already on the waitlist for this event + category
    const existingWaitlist = await prisma.waitlist.findFirst({
      where: {
        eventId,
        userId,
        category,
        status: { in: ['WAITING', 'OFFERED'] },
      },
    });

    if (existingWaitlist) {
      return res.status(400).json({ error: 'You are already on the active waitlist for this seat category' });
    }

    // 3. Join inside a transaction to prevent race condition on position counter
    const waitlistEntry = await prisma.$transaction(async (tx) => {
      const activeEntries = await tx.waitlist.count({
        where: {
          eventId,
          category,
          status: { in: ['WAITING', 'OFFERED'] },
        },
      });

      return tx.waitlist.create({
        data: {
          eventId,
          userId,
          category,
          position: activeEntries + 1,
          status: 'WAITING',
        },
      });
    });

    res.status(201).json(waitlistEntry);
  } catch (error: any) {
    console.error('Join waitlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomerHistory = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            venue: { select: { name: true } },
          },
        },
        showSeats: {
          include: { seat: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const waitlists = await prisma.waitlist.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            venue: { select: { name: true } },
          },
        },
        offeredShowSeat: {
          include: { seat: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ bookings, waitlists });
  } catch (error: any) {
    console.error('Error fetching customer history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
