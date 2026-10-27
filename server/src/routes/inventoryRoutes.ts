import { Router } from 'express';
import {
  getInventory,
  restock,
  deductStock,
  getLowStockAlerts,
  getExpiryRegister,
  getStockPredictions,
  getReorderSuggestions,
  getInventoryLogs
} from '../controllers/inventoryController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateAdmin, getInventory);
router.post('/restock', authenticateAdmin, restock);
router.post('/deduct', authenticateAdmin, deductStock);
router.get('/alerts', authenticateAdmin, getLowStockAlerts);
router.get('/expiry', authenticateAdmin, getExpiryRegister);
router.get('/prediction', authenticateAdmin, getStockPredictions);
router.get('/reorder', authenticateAdmin, getReorderSuggestions);
router.get('/logs', authenticateAdmin, getInventoryLogs);

export default router;
