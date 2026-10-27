import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { db } from './db/db.js';

dotenv.config();

const app: Express = express();

// Middlewares
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:8443,http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman) or matching allowed origins
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for college project testing
    }
  },
  credentials: true
}));

app.use(express.json());

// Public Health Check Endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const health = await db.checkHealth();
    res.status(200).json({
      success: true,
      service: 'Smart Store Management System API',
      version: '1.1.0',
      status: 'UP',
      database: health
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      service: 'Smart Store Management System API',
      status: 'DEGRADED',
      error: err.message
    });
  }
});

// Mount Feature API Routers
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api', analyticsRoutes);

// Global 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found.'
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error occurred.'
  });
});

export default app;
