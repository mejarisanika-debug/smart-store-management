import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/db.js';

const productSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.number().positive('Selling price must be greater than 0'),
  cost: z.number().nonnegative('Cost price must be greater than or equal to 0'),
  stock: z.number().int().nonnegative('Stock cannot be negative'),
  expiry_date: z.string().nullable().optional(), // Nullable for non-perishables!
  threshold: z.number().int().nonnegative('Threshold cannot be negative').default(5),
  is_active: z.boolean().default(true)
});

const updatePriceSchema = z.object({
  price: z.number().positive('New selling price must be greater than 0')
});

const updateExpirySchema = z.object({
  expiry_date: z.string().nullable()
});

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;
    const products = await db.getProducts(category as string, search as string);
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await db.getProductById(id);
    if (!product || !product.is_active) {
      res.status(404).json({ success: false, error: `Product "${id}" not found or inactive.` });
      return;
    }
    res.status(200).json({ success: true, data: product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  const result = productSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: 'Validation failed', details: result.error.format() });
    return;
  }

  try {
    const productData = {
      ...result.data,
      expiry_date: result.data.expiry_date || null
    };
    const created = await db.createProduct(productData);
    res.status(201).json({ success: true, message: 'Product created successfully', data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const existing = await db.getProductById(id);
    if (!existing || !existing.is_active) {
      res.status(404).json({ success: false, error: `Product "${id}" not found or is inactive.` });
      return;
    }
    const updated = await db.updateProduct(id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: `Product "${id}" not found.` });
      return;
    }
    res.status(200).json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const success = await db.softDeleteProduct(id);
    if (!success) {
      res.status(404).json({ success: false, error: `Product "${id}" not found.` });
      return;
    }
    res.status(200).json({ success: true, message: `Product "${id}" deactivated successfully. Past sales records preserved.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updatePrice = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = updatePriceSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: 'Valid selling price required', details: result.error.format() });
    return;
  }

  try {
    const existing = await db.getProductById(id);
    if (!existing || !existing.is_active) {
      res.status(404).json({ success: false, error: `Product "${id}" not found or is inactive.` });
      return;
    }
    const updateResult = await db.updatePrice(id, result.data.price);
    if (!updateResult) {
      res.status(404).json({ success: false, error: `Product "${id}" not found.` });
      return;
    }
    res.status(200).json({
      success: true,
      message: `Price updated from ₹${updateResult.oldPrice} to ₹${updateResult.newPrice}`,
      data: updateResult
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateExpiry = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = updateExpirySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: 'Valid expiry date required' });
    return;
  }

  try {
    const existing = await db.getProductById(id);
    if (!existing || !existing.is_active) {
      res.status(404).json({ success: false, error: `Product "${id}" not found or is inactive.` });
      return;
    }
    const updated = await db.updateExpiry(id, result.data.expiry_date);
    if (!updated) {
      res.status(404).json({ success: false, error: `Product "${id}" not found.` });
      return;
    }
    res.status(200).json({ success: true, message: 'Expiry date updated successfully', data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
