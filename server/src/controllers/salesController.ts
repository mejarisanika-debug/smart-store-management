import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/db.js';

const checkoutItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be at least 1')
});

const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'Cart must contain at least one item'),
  paymentMethod: z.enum(['UPI', 'Cash', 'Card']),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional()
});

export const checkout = async (req: Request, res: Response): Promise<void> => {
  const result = checkoutSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid checkout request',
      details: result.error.format()
    });
    return;
  }

  try {
    const sale = await db.executeCheckout(result.data);
    res.status(201).json({
      success: true,
      message: `Bill ${sale.id} generated successfully. Stock deducted automatically.`,
      data: sale
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Checkout failed'
    });
  }
};

export const getSales = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, limit } = req.query;
    const sales = await db.getSales(search as string, limit ? Number(limit) : 100);
    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getSaleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sale = await db.getSaleById(id);
    if (!sale) {
      res.status(404).json({ success: false, error: `Sale record "${id}" not found.` });
      return;
    }
    res.status(200).json({ success: true, data: sale });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
