import { Request, Response } from 'express';
import { db } from '../db/db.js';
import { computeExpiryStatus } from './inventoryController.js';

export const getProfitFinances = async (req: Request, res: Response): Promise<void> => {
  try {
    const { range } = req.query; // '7d', '30d', '90d', 'all'
    const sales = await db.getSales();
    const expenses = await db.getExpenses();

    let filteredSales = sales;
    let filteredExpenses = expenses;

    if (range && range !== 'all') {
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      filteredSales = sales.filter(s => String(s.sale_date).slice(0, 10) >= cutoffStr);
      filteredExpenses = expenses.filter(e => String(e.expense_date).slice(0, 10) >= cutoffStr);
    }

    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);

    let totalCogs = 0;
    let grossProfit = 0;

    filteredSales.forEach(s => {
      if (s.items) {
        s.items.forEach(item => {
          const cogs = item.unit_cost * item.quantity;
          const rev = item.unit_price * item.quantity;
          totalCogs += cogs;
          grossProfit += (rev - cogs);
        });
      }
    });

    const totalOperatingExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = grossProfit - totalOperatingExpenses;
    const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        costOfGoodsSold: totalCogs,
        grossProfit,
        grossMarginPercent: Number(grossMarginPercent.toFixed(1)),
        operatingExpenses: totalOperatingExpenses,
        netProfit,
        netMarginPercent: Number(netMarginPercent.toFixed(1)),
        salesCount: filteredSales.length,
        expenseCount: filteredExpenses.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getRevenueTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const range = (req.query.range as string) || '7d';
    const numDays = range === '30d' ? 30 : range === '90d' ? 90 : 7;
    const sales = await db.getSales();

    const trend: { date: string; label: string; value: number; count: number }[] = [];
    const dateMap = new Map<string, { value: number; count: number }>();

    sales.forEach(s => {
      const d = String(s.sale_date).slice(0, 10);
      const cur = dateMap.get(d) || { value: 0, count: 0 };
      dateMap.set(d, { value: cur.value + s.total_amount, count: cur.count + 1 });
    });

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayData = dateMap.get(dateStr) || { value: 0, count: 0 };
      const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

      trend.push({
        date: dateStr,
        label,
        value: dayData.value,
        count: dayData.count
      });
    }

    const totalRevenue = trend.reduce((sum, t) => sum + t.value, 0);
    const totalTransactions = trend.reduce((sum, t) => sum + t.count, 0);
    const averageBill = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const bestDay = [...trend].sort((a, b) => b.value - a.value)[0] || { label: 'None', value: 0 };

    res.status(200).json({
      success: true,
      data: {
        range,
        totalRevenue,
        totalTransactions,
        averageBill: Number(averageBill.toFixed(2)),
        bestDay,
        trend
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getSalesPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const range = (req.query.range as string) || '7d';
    const category = (req.query.category as string) || 'All';
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;

    const products = await db.getProducts();
    const sales = await db.getSales();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const filteredSales = sales.filter(s => String(s.sale_date).slice(0, 10) >= cutoffStr);

    const productSalesMap = new Map<string, { unitsSold: number; revenue: number; profit: number }>();

    filteredSales.forEach(s => {
      if (s.items) {
        s.items.forEach(item => {
          const cur = productSalesMap.get(item.product_id) || { unitsSold: 0, revenue: 0, profit: 0 };
          const rev = item.unit_price * item.quantity;
          const cost = item.unit_cost * item.quantity;
          productSalesMap.set(item.product_id, {
            unitsSold: cur.unitsSold + item.quantity,
            revenue: cur.revenue + rev,
            profit: cur.profit + (rev - cost)
          });
        });
      }
    });

    let performance = products.map(product => {
      const stat = productSalesMap.get(product.id) || { unitsSold: 0, revenue: 0, profit: 0 };
      return {
        product,
        unitsSold: stat.unitsSold,
        revenue: stat.revenue,
        profit: stat.profit
      };
    });

    if (category !== 'All') {
      performance = performance.filter(p => p.product.category.toLowerCase() === category.toLowerCase());
    }

    performance.sort((a, b) => b.unitsSold - a.unitsSold);

    const bestSeller = performance[0] || null;
    const leastSeller = [...performance].filter(p => p.unitsSold > 0).sort((a, b) => a.unitsSold - b.unitsSold)[0] || null;

    res.status(200).json({
      success: true,
      data: {
        range,
        category,
        bestSeller,
        leastSeller,
        leaderboard: performance
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * FEATURE 16: Smart Dashboard Overview
 * Single high-performance endpoint powering the store executive dashboard
 */
export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await db.getProducts();
    const sales = await db.getSales();
    const expenses = await db.getExpenses();

    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter(s => String(s.sale_date).slice(0, 10) === todayStr);

    // Total Financials
    const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
    let grossProfit = 0;
    sales.forEach(s => {
      if (s.items) {
        s.items.forEach(item => {
          grossProfit += (item.unit_price - item.unit_cost) * item.quantity;
        });
      }
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;

    // Inventory Alerts & Counts
    const lowStockProducts = products.filter(p => p.stock <= p.threshold);
    const expiringProducts = products.filter(p => {
      const exp = computeExpiryStatus(p.expiry_date);
      return exp.status === 'Expired' || exp.status === 'Near expiry';
    });

    // 7-day revenue trend
    const recentRevenueTrend: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const val = sales
        .filter(s => String(s.sale_date).slice(0, 10) === dateStr)
        .reduce((sum, s) => sum + s.total_amount, 0);
      recentRevenueTrend.push({
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        value: val
      });
    }

    // Top Reorder Suggestions
    const reorderSuggestions = lowStockProducts.slice(0, 4).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      stock: p.stock,
      threshold: p.threshold,
      suggestedQty: Math.max(p.threshold * 2 - p.stock, p.threshold)
    }));

    // Top 3 urgent stock-out predictions
    const topPredictions = lowStockProducts.slice(0, 3).map(p => {
      // Calculate 7-day velocity
      const sold = sales
        .filter(s => {
          const diffDays = (Date.now() - new Date(s.sale_date).getTime()) / (1000 * 3600 * 24);
          return diffDays <= 7;
        })
        .reduce((sum, s) => sum + (s.items?.filter(i => i.product_id === p.id).reduce((t, i) => t + i.quantity, 0) || 0), 0);
      const velocity = sold / 7 || 0.25;
      const days = Math.ceil(p.stock / velocity);
      return {
        id: p.id,
        name: p.name,
        stock: p.stock,
        daysToRunout: days,
        urgency: days < 5 ? 'High' : 'Medium'
      };
    });

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalRevenue,
          grossProfit,
          totalExpenses,
          netProfit,
          todaySalesCount: todaySales.length,
          todaySalesAmount: todaySales.reduce((sum, s) => sum + s.total_amount, 0),
          lowStockCount: lowStockProducts.length,
          expiringCount: expiringProducts.length,
          totalProductsCount: products.length
        },
        revenueTrend: recentRevenueTrend,
        reorderSuggestions,
        topPredictions,
        activeAlerts: [
          ...lowStockProducts.slice(0, 3).map(p => ({
            type: 'low_stock',
            productId: p.id,
            title: `${p.name} is running low`,
            subtitle: `${p.stock} units left · threshold ${p.threshold}`,
            action: 'Restock'
          })),
          ...expiringProducts.slice(0, 2).map(p => {
            const exp = computeExpiryStatus(p.expiry_date);
            return {
              type: 'expiry',
              productId: p.id,
              title: `${p.name} ${exp.status === 'Expired' ? 'has expired' : 'expires soon'}`,
              subtitle: `Expires ${p.expiry_date} · POS sale protection active`,
              action: 'Review'
            };
          })
        ]
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
