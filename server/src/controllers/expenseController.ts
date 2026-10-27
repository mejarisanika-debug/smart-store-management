import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/db.js';

const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.enum(['Utilities', 'Rent', 'Logistics', 'Maintenance', 'Staff', 'Other']),
  amount: z.number().positive('Expense amount must be greater than 0'),
  expense_date: z.string().min(10, 'Valid date (YYYY-MM-DD) is required')
});

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;
    const expenses = await db.getExpenses(category as string);
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryBreakdown = expenses.reduce<Record<string, number>>((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: expenses.length,
      totalAmount,
      categoryBreakdown,
      data: expenses
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createExpense = async (req: Request, res: Response): Promise<void> => {
  const result = expenseSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: 'Validation failed', details: result.error.format() });
    return;
  }

  try {
    const created = await db.createExpense(result.data);
    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: created
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const deleted = await db.deleteExpense(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: `Expense "${id}" not found.` });
      return;
    }
    res.status(200).json({ success: true, message: `Expense "${id}" deleted successfully.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
