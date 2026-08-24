import { Router } from 'express';
import { holdSeats, confirmBooking, cancelBooking, joinWaitlist, getCustomerHistory } from '../controllers/booking.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/history', getCustomerHistory);
router.post('/hold', holdSeats);
router.post('/confirm', confirmBooking);
router.post('/waitlist', joinWaitlist);
router.post('/:id/cancel', cancelBooking);

export default router;
