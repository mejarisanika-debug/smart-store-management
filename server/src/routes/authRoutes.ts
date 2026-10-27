import { Router } from 'express';
import { login, getCurrentUser, logout } from '../controllers/authController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticateAdmin, getCurrentUser);

export default router;
