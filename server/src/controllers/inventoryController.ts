import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/db.js';
import { ExpiryStatus, Product } from '../types/index.js';

const restockSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Restock quantity must be greater than 0'),
  notes: z.string().optional()
});

const deductSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Deduction quantity must be greater than 0'),
  reason: z.string().min(1, 'Reason for deduction is required')
});

export const computeExpiryStatus = (expiryDate: string | null): ExpiryStatus => {
  if (!expiryDate) {
    return {
      daysRemaining: null,
      status: 'Non-perishable',
      tone: 'neutral',
      saleAllowed: true
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(23, 59, 59, 999);

  const diffTime = exp.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return {
      daysRemaining: days,
      status: 'Expired',
      tone: 'danger',
      saleAllowed: false // BLOCKED
    };
  }

  if (days <= 7) {
    return {
      daysRemaining: days,
      status: 'Near expiry',
      tone: 'warning',
      saleAllowed: true
    };
  }

  return {
    daysRemaining: days,
    status: 'Valid',
    tone: 'success',
    saleAllowed: true
  };
};

export const getInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;
    const products = await db.getProducts(undefined, search as string);

    let items = products.map(p => {
      const expiry = computeExpiryStatus(p.expiry_date);
      const isLowStock = p.stock <= p.threshold;
      return {
        ...p,
        expiryStatus: expiry,
        isLowStock,
        stockStatus: p.stock === 0 ? 'Out of stock' : isLowStock ? 'Low stock' : 'Adequate'
      };
    });

    if (status && status !== 'All') {
      if (status === 'Low stock') {
        items = items.filter(i => i.isLowStock);
      } else if (status === 'Out of stock') {
        items = items.filter(i => i.stock === 0);
      } else {
        items = items.filter(i => i.expiryStatus.status.toLowerCase() === (status as string).toLowerCase());
      }
    }

    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const restock = async (req: Request, res: Response): Promise<void> => {
  const result = restockSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: 'Validation failed', details: result.error.format() });
    return;
  }

  try {
    const existing = await db.getProductById(result.data.productId);
    if (!existing || !existing.is_active) {
      res.status(404).json({ success: false, error: `Product "${result.data.productId}" not found or is inactive.` });
      return;
    }
    const updated = await db.restockProduct(result.data.productId, result.data.quantity, result.data.notes);
    if (!updated) {
      res.status(404).json({ success: false, error: `Product "${result.data.productId}" not found.` });
      return;
    }
    res.status(200).json({
      success: true,
      message: `Successfully restocked ${result.data.quantity} units for ${updated.name}.`,
      data: updated
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const deductStock = async (req: Request, res: Response): Promise<void> => {
  const result = deductSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: 'Validation failed', details: result.error.format() });
    return;
  }

  try {
    const existing = await db.getProductById(result.data.productId);
    if (!existing || !existing.is_active) {
      res.status(404).json({ success: false, error: `Product "${result.data.productId}" not found or is inactive.` });
      return;
    }
    const updated = await db.deductStock(result.data.productId, result.data.quantity, result.data.reason);
    if (!updated) {
      res.status(404).json({ success: false, error: `Product "${result.data.productId}" not found.` });
      return;
    }
    res.status(200).json({
      success: true,
      message: `Recorded deduction of ${result.data.quantity} units for ${updated.name} (${result.data.reason}).`,
      data: updated
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const getLowStockAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await db.getProducts();
    const lowStock = products
      .filter(p => p.stock <= p.threshold)
      .map(p => {
        const severity = p.stock <= Math.floor(p.threshold / 2) ? 'Critical' : 'Low';
        const shortage = Math.max(p.threshold * 2 - p.stock, 0);
        return {
          product: p,
          currentStock: p.stock,
          threshold: p.threshold,
          shortage,
          severity,
          estimatedReorderCost: shortage * p.cost
        };
      })
      .sort((a, b) => (a.currentStock - a.threshold) - (b.currentStock - b.threshold));

    res.status(200).json({
      success: true,
      count: lowStock.length,
      totalShortageUnits: lowStock.reduce((sum, item) => sum + item.shortage, 0),
      totalEstimatedCost: lowStock.reduce((sum, item) => sum + item.estimatedReorderCost, 0),
      data: lowStock
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getExpiryRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const products = await db.getProducts();

    let list = products.map(p => ({
      product: p,
      expiryStatus: computeExpiryStatus(p.expiry_date)
    }));

    if (status && status !== 'All') {
      list = list.filter(item => item.expiryStatus.status.toLowerCase() === (status as string).toLowerCase());
    }

    list.sort((a, b) => {
      if (!a.product.expiry_date) return 1;
      if (!b.product.expiry_date) return -1;
      return a.product.expiry_date.localeCompare(b.product.expiry_date);
    });

    const summary = {
      all: products.length,
      expired: products.filter(p => computeExpiryStatus(p.expiry_date).status === 'Expired').length,
      nearExpiry: products.filter(p => computeExpiryStatus(p.expiry_date).status === 'Near expiry').length,
      valid: products.filter(p => computeExpiryStatus(p.expiry_date).status === 'Valid').length,
      nonPerishable: products.filter(p => p.expiry_date === null).length
    };

    res.status(200).json({
      success: true,
      summary,
      data: list
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * FEATURE 10: Demand-Based Stock Prediction
 * Explainable Velocity Method:
 * Daily Velocity = (Units Sold over Last N Days) / N
 * Estimated Days to Stockout = Current Stock / Daily Velocity
 */
export const getStockPredictions = async (req: Request, res: Response): Promise<void> => {
  try {
    const windowDays = Number(req.query.windowDays) || 7;
    const products = await db.getProducts();
    const sales = await db.getSales(undefined, 200);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);

    // Sum product units sold within the window
    const soldMap = new Map<string, number>();
    sales.forEach(sale => {
      const saleTime = new Date(sale.sale_date);
      if (saleTime >= cutoffDate && sale.items) {
        sale.items.forEach(item => {
          soldMap.set(item.product_id, (soldMap.get(item.product_id) || 0) + item.quantity);
        });
      }
    });

    const predictions = products.map(product => {
      const totalUnitsSold = soldMap.get(product.id) || 0;
      const dailyVelocity = totalUnitsSold / windowDays;
      let daysToStockout: number | null = null;
      let riskLevel: 'High Risk' | 'Watch' | 'Healthy' | 'No Demand';

      if (product.stock === 0) {
        daysToStockout = 0;
        riskLevel = 'High Risk';
      } else if (dailyVelocity > 0) {
        daysToStockout = Math.ceil(product.stock / dailyVelocity);
        if (daysToStockout <= 5) riskLevel = 'High Risk';
        else if (daysToStockout <= 12) riskLevel = 'Watch';
        else riskLevel = 'Healthy';
      } else {
        riskLevel = 'No Demand';
      }

      return {
        product,
        totalUnitsSold,
        dailyVelocity: Number(dailyVelocity.toFixed(2)),
        daysToStockout,
        riskLevel
      };
    }).sort((a, b) => {
      if (a.daysToStockout === null) return 1;
      if (b.daysToStockout === null) return -1;
      return a.daysToStockout - b.daysToStockout;
    });

    res.status(200).json({
      success: true,
      windowDays,
      data: predictions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * FEATURE 13: Smart Reorder Suggestions
 * Quantity = max(2 * threshold - stock, threshold)
 */
export const getReorderSuggestions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await db.getProducts();
    const suggestions = products
      .filter(p => p.stock <= p.threshold)
      .map(product => {
        const suggestedQuantity = Math.max(product.threshold * 2 - product.stock, product.threshold);
        const estimatedCost = suggestedQuantity * product.cost;
        const priority = product.stock <= Math.floor(product.threshold / 2) ? 'High' : 'Medium';

        return {
          product,
          currentStock: product.stock,
          threshold: product.threshold,
          suggestedQuantity,
          estimatedCost,
          priority
        };
      })
      .sort((a, b) => a.currentStock - b.currentStock);

    res.status(200).json({
      success: true,
      count: suggestions.length,
      totalEstimatedProcurementCost: suggestions.reduce((sum, s) => sum + s.estimatedCost, 0),
      data: suggestions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getInventoryLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.query;
    const logs = await db.getInventoryLogs(productId as string);
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
