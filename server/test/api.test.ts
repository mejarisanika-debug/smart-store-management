import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';

describe('Smart Store Management System — Complete API Test Suite', () => {
  let authToken = '';

  before(async () => {
    // 1. Authenticate Admin
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@smartstore.in', password: 'admin123' });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token);
    authToken = `Bearer ${res.body.token}`;
  });

  after(() => {
    // Clean process exit so node test runner does not wait for pool idleTimeout
    setTimeout(() => process.exit(0), 500);
  });

  test('GET /api/health should return UP status and DB engine', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'UP');
    assert.ok(res.body.database);
  });

  test('Product Management: Create SKU with nullable expiry_date for non-perishable goods', async () => {
    const testSkuId = `PRD-T-${Date.now().toString().slice(-6)}`;
    const newSku = {
      id: testSkuId,
      name: 'Stainless Steel Whisk',
      category: 'Kitchenware',
      price: 150,
      cost: 100,
      stock: 20,
      expiry_date: null, // Non-perishable product
      threshold: 5,
      is_active: true
    };

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', authToken)
      .send(newSku);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.id, testSkuId);
    assert.strictEqual(res.body.data.expiry_date, null);

    // Clean up temporary test SKU so it does not pollute the live database catalogue
    await request(app)
      .delete(`/api/products/${testSkuId}`)
      .set('Authorization', authToken);
  });

  test('Price Management: Update selling price and calculate gross margin', async () => {
    // Update active product PRD-002
    const res = await request(app)
      .patch('/api/products/PRD-002/price')
      .set('Authorization', authToken)
      .send({ price: 160 });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.newPrice, 160);
    assert.ok(res.body.data.margin > 0);
  });

  test('Restocking: Increase product stock count', async () => {
    const productBefore = await request(app)
      .get('/api/products/PRD-002')
      .set('Authorization', authToken);
    const initialStock = productBefore.body.data.stock;

    const res = await request(app)
      .post('/api/inventory/restock')
      .set('Authorization', authToken)
      .send({ productId: 'PRD-002', quantity: 10, notes: 'Supplier delivery batch' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.stock, initialStock + 10);
  });

  test('Billing Engine: Checkout non-perishable product (NULL expiry) succeeds', async () => {
    const res = await request(app)
      .post('/api/sales/checkout')
      .set('Authorization', authToken)
      .send({
        items: [{ productId: 'PRD-012', quantity: 1 }], // Milton Plastic Storage Container (expiry_date = null)
        paymentMethod: 'UPI'
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data.id.startsWith('INV-'));
    assert.strictEqual(res.body.data.total_amount, 120);
  });

  test('Billing Engine: Rejects checkout when product has expired (expiry_date < TODAY)', async () => {
    // 1. Create a temporary expired SKU
    const expiredSkuId = `PRD-EXP-${Date.now().toString().slice(-6)}`;
    await request(app)
      .post('/api/products')
      .set('Authorization', authToken)
      .send({
        id: expiredSkuId,
        name: 'Expired Test Milk',
        category: 'Dairy',
        price: 50,
        cost: 40,
        stock: 10,
        expiry_date: '2020-01-01',
        threshold: 2,
        is_active: true
      });

    const res = await request(app)
      .post('/api/sales/checkout')
      .set('Authorization', authToken)
      .send({
        items: [{ productId: expiredSkuId, quantity: 1 }],
        paymentMethod: 'Cash'
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes('expired'));

    // Clean up temporary SKU
    await request(app)
      .delete(`/api/products/${expiredSkuId}`)
      .set('Authorization', authToken);
  });

  test('Billing Engine: Rejects checkout when requested quantity exceeds available stock', async () => {
    const res = await request(app)
      .post('/api/sales/checkout')
      .set('Authorization', authToken)
      .send({
        items: [{ productId: 'PRD-007', quantity: 9999 }], // Exceeds stock
        paymentMethod: 'Card'
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.toLowerCase().includes('insufficient stock'));
  });

  test('Billing Engine: Successful transaction decrements stock and preserves price/cost snapshot', async () => {
    const productBefore = await request(app)
      .get('/api/products/PRD-003')
      .set('Authorization', authToken);
    const stockBefore = productBefore.body.data.stock;

    const res = await request(app)
      .post('/api/sales/checkout')
      .set('Authorization', authToken)
      .send({
        items: [{ productId: 'PRD-003', quantity: 3 }],
        paymentMethod: 'UPI',
        notes: 'Counter Test Bill'
      });

    assert.strictEqual(res.status, 201);
    const bill = res.body.data;
    assert.strictEqual(bill.items.length, 1);
    assert.strictEqual(bill.items[0].unit_price, 28);
    assert.strictEqual(bill.items[0].unit_cost, 22);

    // Verify stock decremented
    const productAfter = await request(app)
      .get('/api/products/PRD-003')
      .set('Authorization', authToken);
    assert.strictEqual(productAfter.body.data.stock, stockBefore - 3);
  });

  test('Stock Update: Deduct damaged stock with reason & negative-stock prevention', async () => {
    const res = await request(app)
      .post('/api/inventory/deduct')
      .set('Authorization', authToken)
      .send({ productId: 'PRD-005', quantity: 2, reason: 'Damaged packing' });

    assert.strictEqual(res.status, 200);

    // Attempting to deduct more than available must fail
    const failRes = await request(app)
      .post('/api/inventory/deduct')
      .set('Authorization', authToken)
      .send({ productId: 'PRD-005', quantity: 9999, reason: 'Invalid deduction' });

    assert.strictEqual(failRes.status, 400);
  });

  test('Inventory Alerts & Low-Stock: Returns active shortage list', async () => {
    const res = await request(app)
      .get('/api/inventory/alerts')
      .set('Authorization', authToken);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  test('Demand Forecasting: Returns stock-out predictions and risk badges', async () => {
    const res = await request(app)
      .get('/api/inventory/prediction')
      .set('Authorization', authToken);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data[0].dailyVelocity !== undefined);
  });

  test('Smart Reorder Suggestions: Recommends buffer stock without placing orders', async () => {
    const res = await request(app)
      .get('/api/inventory/reorder')
      .set('Authorization', authToken);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    if (res.body.data.length > 0) {
      assert.ok(res.body.data[0].suggestedQuantity > 0);
    }
  });

  test('Expenses & Net Profit: Record expense and compute accurate financial margins', async () => {
    const expenseRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', authToken)
      .send({
        title: 'Packaging Bags',
        category: 'Logistics',
        amount: 250,
        expense_date: new Date().toISOString().slice(0, 10)
      });

    assert.strictEqual(expenseRes.status, 201);

    const financeRes = await request(app)
      .get('/api/finances/profit')
      .set('Authorization', authToken);

    assert.strictEqual(financeRes.status, 200);
    const f = financeRes.body.data;
    assert.ok(f.totalRevenue > 0);
    assert.ok(f.costOfGoodsSold > 0);
    assert.strictEqual(f.grossProfit, f.totalRevenue - f.costOfGoodsSold);
    assert.strictEqual(f.netProfit, f.grossProfit - f.operatingExpenses);
  });

  test('Smart Dashboard: Aggregates real-time KPIs, trend charts, and alert previews', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', authToken);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.kpis);
    assert.ok(res.body.data.revenueTrend);
    assert.ok(res.body.data.topPredictions);
  });

  test('Soft Delete & Inactive Filtering: Deactivated product is excluded from active lists but preserved in sales history', async () => {
    // 1. Create a distinct test product
    const testSku = `PRD-DEL-${Date.now().toString().slice(-6)}`;
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', authToken)
      .send({
        id: testSku,
        name: 'Organic Honey 500g',
        category: 'Staples',
        price: 220,
        cost: 160,
        stock: 15,
        expiry_date: null,
        threshold: 5,
        is_active: true
      });
    assert.strictEqual(createRes.status, 201);

    // 2. Sell 2 units via checkout to create historical bill
    const checkoutRes = await request(app)
      .post('/api/sales/checkout')
      .set('Authorization', authToken)
      .send({
        items: [{ productId: testSku, quantity: 2 }],
        paymentMethod: 'UPI',
        notes: 'Pre-deactivation sale'
      });
    assert.strictEqual(checkoutRes.status, 201);
    const saleId = checkoutRes.body.data.id;

    // 3. Confirm product is in active lists prior to deactivation
    const activeProductsBefore = await request(app)
      .get('/api/products')
      .set('Authorization', authToken);
    assert.ok(activeProductsBefore.body.data.some((p: any) => p.id === testSku));

    // 4. Soft-delete the product
    const deleteRes = await request(app)
      .delete(`/api/products/${testSku}`)
      .set('Authorization', authToken);
    assert.strictEqual(deleteRes.status, 200);

    // 5. Verify product is excluded from active Product Management list
    const activeProductsAfter = await request(app)
      .get('/api/products')
      .set('Authorization', authToken);
    assert.strictEqual(
      activeProductsAfter.body.data.some((p: any) => p.id === testSku),
      false,
      'Deleted product must not appear in GET /api/products'
    );

    // 6. Verify product is excluded from Inventory list
    const inventoryRes = await request(app)
      .get('/api/inventory')
      .set('Authorization', authToken);
    assert.strictEqual(
      inventoryRes.body.data.some((p: any) => p.id === testSku),
      false,
      'Deleted product must not appear in GET /api/inventory'
    );

    // 7. Verify product is excluded from Low-Stock Alerts
    const alertsRes = await request(app)
      .get('/api/inventory/alerts')
      .set('Authorization', authToken);
    assert.strictEqual(
      alertsRes.body.data.some((item: any) => item.product.id === testSku),
      false,
      'Deleted product must not appear in Low-Stock Alerts'
    );

    // 8. Verify product is excluded from Reorder Suggestions
    const reorderRes = await request(app)
      .get('/api/inventory/reorder')
      .set('Authorization', authToken);
    assert.strictEqual(
      reorderRes.body.data.some((item: any) => item.product.id === testSku),
      false,
      'Deleted product must not appear in Reorder Suggestions'
    );

    // 9. Verify direct operations on deactivated product fail
    const getSingleRes = await request(app)
      .get(`/api/products/${testSku}`)
      .set('Authorization', authToken);
    assert.strictEqual(getSingleRes.status, 404);

    const reCheckoutRes = await request(app)
      .post('/api/sales/checkout')
      .set('Authorization', authToken)
      .send({
        items: [{ productId: testSku, quantity: 1 }],
        paymentMethod: 'Cash'
      });
    assert.strictEqual(reCheckoutRes.status, 400);

    // 10. Check that sales history still displays the bill and its line items
    const salesRes = await request(app)
      .get('/api/sales')
      .set('Authorization', authToken);
    assert.strictEqual(salesRes.status, 200);

    const targetSale = salesRes.body.data.find((s: any) => s.id === saleId);
    assert.ok(targetSale, 'Historical sale record must exist');
    assert.strictEqual(targetSale.items.length, 1);
    assert.strictEqual(targetSale.items[0].product_name, 'Organic Honey 500g');
    assert.strictEqual(targetSale.items[0].unit_price, 220);
    assert.strictEqual(targetSale.items[0].quantity, 2);
  });
});
