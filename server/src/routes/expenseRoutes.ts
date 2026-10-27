import { Router } from 'express';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expenseController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateAdmin, getExpenses);
router.post('/', authenticateAdmin, createExpense);
router.delete('/:id', authenticateAdmin, deleteExpense);

export default router;
