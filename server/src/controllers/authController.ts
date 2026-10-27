import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import dotenv from 'dotenv';
import { AuthenticatedRequest } from '../middleware/auth.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});

export const login = async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid email or password format.',
      details: parseResult.error.format()
    });
    return;
  }

  const { email, password } = parseResult.data;

  // Supabase Auth Integration
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        res.status(401).json({
          success: false,
          error: error.message
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        token: data.session?.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          storeName: 'Smart Mart',
          location: 'Pune, Maharashtra'
        }
      });
      return;
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Authentication service error: ' + err.message
      });
      return;
    }
  }

  // Pre-configured Admin Demo Auth (Ensures viva presentation never fails)
  if (email === 'admin@smartstore.in' && password === 'admin123') {
    res.status(200).json({
      success: true,
      message: 'Authentication successful (Demo Store Owner Session)',
      token: 'smart-mart-admin-jwt',
      user: {
        id: 'admin-001',
        email: 'admin@smartstore.in',
        storeName: 'Smart Mart',
        location: 'Pune, Maharashtra'
      }
    });
    return;
  }

  res.status(401).json({
    success: false,
    error: 'Invalid store owner credentials.'
  });
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user?.id || 'admin-001',
      email: req.user?.email || 'admin@smartstore.in',
      storeName: 'Smart Mart',
      location: 'Pune, Maharashtra'
    }
  });
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Store owner session terminated.'
  });
};
