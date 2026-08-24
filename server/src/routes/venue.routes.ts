import { Router } from 'express';
import { createVenue, listVenues } from '../controllers/venue.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, listVenues);
router.post('/', authenticateToken, requireRole(['ADMIN']), createVenue);

export default router;
