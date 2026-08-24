import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// GET all simulated emails for evaluation convenience
router.get('/', async (req: Request, res: Response) => {
  const { recipient } = req.query;

  try {
    const filters: any = {};
    if (recipient) {
      filters.recipient = recipient as string;
    }

    const emails = await prisma.emailLog.findMany({
      where: filters,
      orderBy: { sentAt: 'desc' },
    });

    res.status(200).json(emails);
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE all emails (useful for clearing mailbox history)
router.delete('/', async (req: Request, res: Response) => {
  try {
    await prisma.emailLog.deleteMany({});
    res.status(200).json({ message: 'Mailbox cleared' });
  } catch (error) {
    console.error('Error clearing emails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
