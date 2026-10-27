import { Router } from 'express';
import {
  getProfitFinances,
  getRevenueTrends,
  getSalesPerformance,
  getDashboardStats
} from '../controllers/analyticsController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard/stats', authenticateAdmin, getDashboardStats);
router.get('/finances/profit', authenticateAdmin, getProfitFinances);
router.get('/analytics/revenue', authenticateAdmin, getRevenueTrends);
router.get('/analytics/performance', authenticateAdmin, getSalesPerformance);

export default router;
