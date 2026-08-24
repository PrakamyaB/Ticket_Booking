import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const WAITLIST_OFFER_TTL_SECONDS = parseInt(process.env.WAITLIST_OFFER_TTL_SECONDS || '300');

let socketIoInstance: any = null;

export const setSocketIoInstance = (io: any) => {
  socketIoInstance = io;
};

// Helper to broadcast seat updates
const broadcastUpdate = async (eventId: string) => {
  if (!socketIoInstance) return;

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

    socketIoInstance.to(`event_${eventId}`).emit('seat-update', formattedSeats);
  } catch (err) {
    console.error('Error broadcasting update in scheduler:', err);
  }
};

/**
 * Scan for and promote waitlisted users for any available seats in an event.
 */
export const checkAndPromoteWaitlist = async (eventId: string) => {
  try {
    // 1. Get all show seats for this event that are AVAILABLE
    // Note: status is AVAILABLE, OR status is HELD but heldUntil has expired
    const allSeats = await prisma.showSeat.findMany({
      where: {
        eventId,
        OR: [
          { status: 'AVAILABLE' },
          {
            status: 'HELD',
            heldUntil: { lt: new Date() },
          },
        ],
      },
      include: { seat: true },
    });

    if (allSeats.length === 0) return;

    // Group available seats by category
    const seatsByCategory: Record<string, typeof allSeats> = {};
    for (const seat of allSeats) {
      if (!seatsByCategory[seat.seat.category]) {
        seatsByCategory[seat.seat.category] = [];
      }
      seatsByCategory[seat.seat.category].push(seat);
    }

    // Process each category
    for (const category of Object.keys(seatsByCategory)) {
      const availableSeats = seatsByCategory[category];

      // Find active waitlist queue for this category
      const waitlistQueue = await prisma.waitlist.findMany({
        where: {
          eventId,
          category,
          status: 'WAITING',
        },
        orderBy: { position: 'asc' },
      });

      if (waitlistQueue.length === 0) continue;

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      const eventTitle = event?.title || 'Event';

      // Assign available seats to waitlist in FIFO order
      const limit = Math.min(availableSeats.length, waitlistQueue.length);
      for (let i = 0; i < limit; i++) {
        const seat = availableSeats[i];
        const waitlistEntry = waitlistQueue[i];
        const offerExpiresAt = new Date(Date.now() + WAITLIST_OFFER_TTL_SECONDS * 1000);

        await prisma.$transaction(async (tx) => {
          // Double check if seat is still available in tx
          const currentSeat = await tx.showSeat.findUnique({
            where: { id: seat.id },
          });

          const isSeatTrulyAvailable =
            currentSeat?.status === 'AVAILABLE' ||
            (currentSeat?.status === 'HELD' && currentSeat.heldUntil && currentSeat.heldUntil < new Date());

          if (!isSeatTrulyAvailable) return;

          // Transition waitlist status to OFFERED
          await tx.waitlist.update({
            where: { id: waitlistEntry.id },
            data: {
              status: 'OFFERED',
              offeredShowSeatId: seat.id,
              offeredAt: new Date(),
              offerExpiresAt,
            },
          });

          // Lock the seat with HELD for this waitlist user
          await tx.showSeat.update({
            where: { id: seat.id },
            data: {
              status: 'HELD',
              heldByUserId: waitlistEntry.userId,
              heldUntil: offerExpiresAt,
            },
          });

          // Fetch user details for email
          const user = await tx.user.findUnique({
            where: { id: waitlistEntry.userId },
          });

          if (user) {
            const checkoutLink = `http://localhost:3000/checkout?eventId=${eventId}&waitlistId=${waitlistEntry.id}&seats=${seat.id}`;
            const emailBody = `
              <h3>Good news! A seat is available</h3>
              <p>Dear ${user.name},</p>
              <p>A seat in the <strong>${category}</strong> category has opened up for <strong>${eventTitle}</strong>.</p>
              <p>We have reserved seat <strong>${seat.seat.rowName}-${seat.seat.colNumber}</strong> for you.</p>
              <p>You have <strong>${Math.floor(WAITLIST_OFFER_TTL_SECONDS / 60)} minutes</strong> to complete your checkout.</p>
              <p>Click the link below to complete your booking:</p>
              <p><a href="${checkoutLink}" style="padding: 10px 20px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Booking Now</a></p>
              <p>Or copy this link: <br/>${checkoutLink}</p>
              <p>If you do not complete the booking in time, the seat will be offered to the next customer in line.</p>
            `;

            await tx.emailLog.create({
              data: {
                recipient: user.email,
                subject: `Waitlist Offer: ${eventTitle} - Seat Available Now!`,
                body: emailBody,
              },
            });
          }
        });
      }

      // Broadcast changes for the event
      await broadcastUpdate(eventId);
    }
  } catch (error) {
    console.error('Error promoting waitlist:', error);
  }
};

/**
 * Periodically release expired holds and expired waitlist offers
 */
export const cleanupJobs = async () => {
  try {
    const now = new Date();

    // 1. Find all expired seat holds that are NOT waitlist offers
    // (a seat hold is a waitlist offer if there is an active waitlist record with offeredShowSeatId and status OFFERED)
    const expiredSeats = await prisma.showSeat.findMany({
      where: {
        status: 'HELD',
        heldUntil: { lt: now },
      },
      include: {
        waitlistOffers: {
          where: { status: 'OFFERED' },
        },
      },
    });

    const affectedEvents = new Set<string>();

    for (const ss of expiredSeats) {
      // If it is a waitlist offer, let the waitlist expiration job handle it
      if (ss.waitlistOffers.length > 0) continue;

      // Otherwise, release it back to AVAILABLE
      await prisma.showSeat.update({
        where: { id: ss.id },
        data: {
          status: 'AVAILABLE',
          heldByUserId: null,
          heldUntil: null,
        },
      });
      affectedEvents.add(ss.eventId);
    }

    // 2. Find expired waitlist offers
    const expiredOffers = await prisma.waitlist.findMany({
      where: {
        status: 'OFFERED',
        offerExpiresAt: { lt: now },
      },
    });

    for (const offer of expiredOffers) {
      await prisma.$transaction(async (tx) => {
        // Mark waitlist entry EXPIRED
        await tx.waitlist.update({
          where: { id: offer.id },
          data: { status: 'EXPIRED' },
        });

        // Release the seat back to AVAILABLE
        if (offer.offeredShowSeatId) {
          await tx.showSeat.update({
            where: { id: offer.offeredShowSeatId },
            data: {
              status: 'AVAILABLE',
              heldByUserId: null,
              heldUntil: null,
            },
          });
        }
      });
      affectedEvents.add(offer.eventId);
    }

    // 3. For each affected event, run waitlist promotions and broadcast map updates
    for (const eventId of affectedEvents) {
      await checkAndPromoteWaitlist(eventId);
      await broadcastUpdate(eventId);
    }
  } catch (error) {
    console.error('Error running hold cleanup jobs:', error);
  }
};

/**
 * Start cleanup background interval
 */
export const startHoldCleanupScheduler = () => {
  console.log('Starting Hold & Waitlist Scheduler (5s interval)...');
  setInterval(async () => {
    await cleanupJobs();
  }, 5000);
};
