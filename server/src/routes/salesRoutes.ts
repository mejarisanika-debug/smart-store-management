import { Router } from 'express';
import { checkout, getSales, getSaleById } from '../controllers/salesController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/checkout', authenticateAdmin, checkout);
router.get('/', authenticateAdmin, getSales);
router.get('/:id', authenticateAdmin, getSaleById);

export default router;
