import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Missing or malformed Bearer token.'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Demo token support for testing and local college viva presentation
  if (token === 'demo-admin-token' || token === 'smart-mart-admin-jwt') {
    req.user = {
      id: 'admin-001',
      email: 'admin@smartstore.in',
      role: 'store_owner'
    };
    return next();
  }

  // If Supabase credentials are configured, verify using Supabase Auth
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired Supabase authentication token.'
        });
        return;
      }

      req.user = {
        id: user.id,
        email: user.email || 'admin@smartstore.in',
        role: 'store_owner'
      };
      return next();
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: 'Authentication verification failed: ' + (err.message || 'Unknown error')
      });
      return;
    }
  }

  // Fallback for valid token format in standalone test mode
  if (token.length > 10) {
    req.user = {
      id: 'admin-001',
      email: 'admin@smartstore.in',
      role: 'store_owner'
    };
    return next();
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized access.'
  });
};
