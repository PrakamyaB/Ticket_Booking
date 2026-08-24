import { Router } from 'express';
import { createEvent, listEvents, getEventDetails, getOrganiserSummary } from '../controllers/event.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Public lists
router.get('/', listEvents);

// Organiser summary (must be before :id to prevent matching as param)
router.get('/summary', authenticateToken, requireRole(['ORGANISER']), getOrganiserSummary);

// Event Details (allows optional token for checking own seat holds/waitlist status)
router.get('/:id', (req, res, next) => {
  // If authorization header exists, authenticate it, otherwise proceed
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.split(' ')[1]) {
    authenticateToken(req, res, next);
  } else {
    next();
  }
}, getEventDetails);

// Create Event
router.post('/', authenticateToken, requireRole(['ORGANISER']), createEvent);

export default router;
