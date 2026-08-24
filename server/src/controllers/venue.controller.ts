import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// Helper to convert row index to character (0 -> A, 1 -> B, etc.)
function getRowName(index: number): string {
  let name = '';
  let temp = index;
  while (temp >= 0) {
    name = String.fromCharCode((temp % 26) + 65) + name;
    temp = Math.floor(temp / 26) - 1;
  }
  return name;
}

export const createVenue = async (req: AuthRequest, res: Response) => {
  const { name, rows, cols, premiumRowsCount } = req.body;

  if (!name || !rows || !cols) {
    return res.status(400).json({ error: 'Name, rows, and cols are required' });
  }

  const numRows = parseInt(rows);
  const numCols = parseInt(cols);
  const premRows = parseInt(premiumRowsCount || 0);

  if (isNaN(numRows) || numRows <= 0 || isNaN(numCols) || numCols <= 0) {
    return res.status(400).json({ error: 'Rows and columns must be positive numbers' });
  }

  try {
    const venue = await prisma.venue.create({
      data: {
        name,
        rows: numRows,
        cols: numCols,
      },
    });

    const seatsData = [];
    for (let r = 0; r < numRows; r++) {
      const rowName = getRowName(r);
      const category = r < premRows ? 'PREMIUM' : 'STANDARD';

      for (let c = 1; c <= numCols; c++) {
        seatsData.push({
          venueId: venue.id,
          rowName,
          colNumber: c,
          category,
        });
      }
    }

    await prisma.seat.createMany({
      data: seatsData,
    });

    const createdSeats = await prisma.seat.findMany({
      where: { venueId: venue.id },
    });

    res.status(201).json({
      venue,
      seatsCount: createdSeats.length,
    });
  } catch (error: any) {
    console.error('Error creating venue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listVenues = async (req: AuthRequest, res: Response) => {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        _count: {
          select: { seats: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(venues);
  } catch (error: any) {
    console.error('Error listing venues:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
