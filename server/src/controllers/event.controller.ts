import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const createEvent = async (req: AuthRequest, res: Response) => {
  const { title, description, date, time, venueId, categoryPrices } = req.body;

  if (!title || !description || !date || !time || !venueId || !categoryPrices) {
    return res.status(400).json({ error: 'All event details and category pricing are required' });
  }

  try {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { seats: true },
    });

    if (!venue) {
      return res.status(404).json({ error: 'Selected venue not found' });
    }

    if (venue.seats.length === 0) {
      return res.status(400).json({ error: 'Venue has no seats configured' });
    }

    const organiserId = req.user?.id;
    if (!organiserId) {
      return res.status(401).json({ error: 'Organiser ID not found in token' });
    }

    // Wrap event creation, pricing, and show seat generation in a transaction
    const event = await prisma.$transaction(async (tx) => {
      // 1. Create Event
      const ev = await tx.event.create({
        data: {
          title,
          description,
          date,
          time,
          venueId,
          organiserId,
        },
      });

      // 2. Create Category Prices
      // categoryPrices format: [{ category: "STANDARD", price: 100 }, { category: "PREMIUM", price: 200 }]
      const pricingData = categoryPrices.map((cp: { category: string; price: number }) => ({
        eventId: ev.id,
        category: cp.category,
        price: parseFloat(cp.price as any),
      }));

      await tx.eventCategoryPrice.createMany({
        data: pricingData,
      });

      // 3. Create Show Seats for all venue seats
      const showSeatsData = venue.seats.map((seat) => ({
        eventId: ev.id,
        seatId: seat.id,
        status: 'AVAILABLE',
      }));

      await tx.showSeat.createMany({
        data: showSeatsData,
      });

      return ev;
    });

    res.status(201).json(event);
  } catch (error: any) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listEvents = async (req: AuthRequest, res: Response) => {
  const { date, search } = req.query;

  try {
    const filters: any = {};
    if (date) {
      filters.date = date as string;
    }
    if (search) {
      filters.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const events = await prisma.event.findMany({
      where: filters,
      include: {
        venue: {
          select: { name: true },
        },
        categoryPrices: true,
        _count: {
          select: {
            showSeats: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // For each event, calculate available seats count
    const eventsWithAvailability = await Promise.all(
      events.map(async (event) => {
        // A seat is available if status is AVAILABLE or (status is HELD and heldUntil has passed)
        const totalSeats = event._count.showSeats;
        const bookedOrHeldSeatsCount = await prisma.showSeat.count({
          where: {
            eventId: event.id,
            OR: [
              { status: 'BOOKED' },
              {
                status: 'HELD',
                heldUntil: { gte: new Date() },
              },
            ],
          },
        });

        const availableSeats = totalSeats - bookedOrHeldSeatsCount;

        return {
          ...event,
          availableSeats,
          isSoldOut: availableSeats <= 0,
        };
      })
    );

    res.status(200).json(eventsWithAvailability);
  } catch (error: any) {
    console.error('Error listing events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEventDetails = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
        categoryPrices: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get show seats with layout details
    const showSeats = await prisma.showSeat.findMany({
      where: { eventId: id },
      include: {
        seat: true,
      },
    });

    // Check waitlist position if user is logged in
    let waitlistStatus = null;
    if (currentUserId) {
      const waitlistEntries = await prisma.waitlist.findMany({
        where: { eventId: id, userId: currentUserId },
        orderBy: { createdAt: 'desc' },
      });
      if (waitlistEntries.length > 0) {
        waitlistStatus = waitlistEntries[0];
      }
    }

    // Format show seats for visual grid render
    const formattedSeats = showSeats.map((ss) => {
      // Determine if active hold has expired
      const isHoldActive = ss.status === 'HELD' && ss.heldUntil && ss.heldUntil >= new Date();
      const actualStatus = ss.status === 'BOOKED' ? 'BOOKED' : isHoldActive ? 'HELD' : 'AVAILABLE';

      return {
        id: ss.id,
        seatId: ss.seatId,
        rowName: ss.seat.rowName,
        colNumber: ss.seat.colNumber,
        category: ss.seat.category,
        status: actualStatus,
        isOwnHold: actualStatus === 'HELD' && ss.heldByUserId === currentUserId,
        heldUntil: ss.heldUntil,
      };
    });

    res.status(200).json({
      event,
      seats: formattedSeats,
      waitlistStatus,
    });
  } catch (error: any) {
    console.error('Error getting event details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrganiserSummary = async (req: AuthRequest, res: Response) => {
  const organiserId = req.user?.id;
  if (!organiserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const events = await prisma.event.findMany({
      where: { organiserId },
      include: {
        bookings: {
          where: { status: 'CONFIRMED' },
        },
        venue: {
          select: { name: true },
        },
        _count: {
          select: {
            showSeats: {
              where: { status: 'BOOKED' },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const summary = events.map((event) => {
      const totalTicketsSold = event._count.showSeats;
      const totalRevenue = event.bookings.reduce((sum, b) => sum + b.totalAmount, 0);

      return {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        venueName: event.venue.name,
        ticketsSold: totalTicketsSold,
        revenue: totalRevenue,
      };
    });

    res.status(200).json(summary);
  } catch (error: any) {
    console.error('Error getting organiser summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
