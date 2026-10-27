# Database Setup Guide — Supabase PostgreSQL

This directory contains the database migration and initial seed data scripts for the **Smart Store Management System**.

## Files
- `schema.sql`: Complete DDL schema creating `products`, `sales`, `sale_items`, `expenses`, and `inventory_logs` tables with constraints, indexes, and foreign keys.
- `seed.sql`: Rich initial demo dataset modeled for an Indian grocery store (*Smart Mart, Pune*), including perishables, non-perishables (`expiry_date IS NULL`), past sales, and operating expenses.

## Step-by-Step Instructions to Apply in Supabase

1. **Sign in to Supabase:**
   - Go to [https://supabase.com](https://supabase.com) and create or open your project.
2. **Open the SQL Editor:**
   - In your Supabase project dashboard, navigate to the **SQL Editor** tab from the left sidebar.
3. **Run Schema Script:**
   - Open `server/db/schema.sql`, copy its entire content, paste it into a new query window in Supabase, and click **Run**.
   - Verify that all 5 tables are created successfully.
4. **Run Seed Script (Optional but Recommended for Viva Demo):**
   - Open `server/db/seed.sql`, copy its content, paste it into the SQL Editor, and click **Run**.
5. **Obtain Connection Credentials:**
   - Go to **Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Connection string** (URI). Copy the connection URI.
   - Go to **Project Settings** $\rightarrow$ **API** to retrieve:
     - `Project URL`
     - `anon` `public` key (for frontend)
     - `service_role` secret key (for backend `.env`)
6. **Configure Environment Variables:**
   - Copy `server/.env.example` to `server/.env` and insert your credentials.
