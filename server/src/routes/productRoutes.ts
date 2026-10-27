import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updatePrice,
  updateExpiry
} from '../controllers/productController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

// Products can be retrieved by counter
router.get('/', authenticateAdmin, getProducts);
router.get('/:id', authenticateAdmin, getProductById);
router.post('/', authenticateAdmin, createProduct);
router.put('/:id', authenticateAdmin, updateProduct);
router.delete('/:id', authenticateAdmin, deleteProduct);
router.patch('/:id/price', authenticateAdmin, updatePrice);
router.patch('/:id/expiry', authenticateAdmin, updateExpiry);

export default router;
