-- AUTO-GENERATED. DO NOT EDIT BY HAND.
-- Source: prisma/schema.prisma
-- Generator: scripts/generate-rls-migration.ts
--
-- Phase 0 Track B2.3 — Postgres Row-Level Security policies.
-- Layer-2 defense-in-depth (Layer 1 is the Prisma extension in
-- src/lib/api/with-tenant.ts).
--
-- HOW TO APPLY:
--   npx prisma migrate dev --create-only --name enable_tenant_rls
--   # then splice the body of this file into the generated migration.sql
--   npx prisma migrate dev
--
-- The Prisma extension sets `app.current_tenant_id` per request via
-- SET LOCAL (wired in Track B2.4). Outside that wrapper the session
-- variable is unset and every SELECT/UPDATE/DELETE returns zero rows —
-- fail-closed.
--
-- Migration / superuser roles bypass RLS (no FORCE). This keeps
-- prisma migrate, prisma db seed, and ops runbooks working.

ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "accounts"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "activities"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "ai_configs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ai_configs"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "ai_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ai_logs"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "api_tokens" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "api_tokens"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "applications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "applications"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "approval_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "approval_logs"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "asset_maintenances" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "asset_maintenances"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "assets"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "attendances" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "attendances"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "audit_logs"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "batch_releases" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "batch_releases"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "batch_traceabilities" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "batch_traceabilities"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "bill_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bill_items"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "bill_of_materials" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bill_of_materials"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "bills" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bills"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "bom_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bom_items"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "budget_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "budget_lines"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "budgets"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "business_unit_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "business_unit_members"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "business_unit_products" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "business_unit_products"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "business_unit_territories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "business_unit_territories"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "business_units" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "business_units"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "campaigns"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "candidates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "candidates"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "capa_actions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "capa_actions"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "capas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "capas"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "change_controls" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "change_controls"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "chart_of_accounts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "chart_of_accounts"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "cheques" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cheques"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "cleaning_validations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cleaning_validations"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "contacts"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "contracts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "contracts"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "cost_centers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "cost_centers"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "custom_field_values" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "custom_field_values"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "custom_fields" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "custom_fields"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "deal_activities" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "deal_activities"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "deals"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "delivery_notes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "delivery_notes"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "departments"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "deviations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "deviations"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "doctors" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "doctors"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "documents"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "employees"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "environmental_monitorings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "environmental_monitorings"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "equipment_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "equipment_records"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "expenses"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "field_visits" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "field_visits"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "fiscal_periods" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "fiscal_periods"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "goods_receipts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "goods_receipts"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "gps_locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "gps_locations"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "hvac_readings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "hvac_readings"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "interviews" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "interviews"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "invoice_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invoice_items"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invoices"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "jobs"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "journal_entries"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "journal_entry_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "journal_entry_lines"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "knowledge_articles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "knowledge_articles"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "kpis" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "kpis"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "leads"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "leave_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "leave_requests"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "loyalty_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "loyalty_members"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "loyalty_programs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "loyalty_programs"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "loyalty_transactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "loyalty_transactions"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "manufacturing_batch_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "manufacturing_batch_records"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "market_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "market_requests"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "messages"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "notifications"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "offer_letters" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "offer_letters"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "onboarding_checklists" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "onboarding_checklists"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "onboarding_tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "onboarding_tasks"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "oos_investigations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "oos_investigations"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "opportunities" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "opportunities"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payments"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "payrolls" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "payrolls"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "positions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "positions"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "products"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "project_tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "project_tasks"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "projects"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "purchase_order_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "purchase_order_items"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "purchase_orders"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "q_audit_findings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "q_audit_findings"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "q_audits" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "q_audits"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "q_complaints" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "q_complaints"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "q_document_versions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "q_document_versions"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "q_documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "q_documents"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "recalls" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "recalls"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "rfqs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "rfqs"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "risk_assessments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "risk_assessments"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "sales_order_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "sales_order_items"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "sales_orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "sales_orders"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "shipments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "shipments"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "spc_charts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "spc_charts"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "spc_data_points" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "spc_data_points"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "stability_studies" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "stability_studies"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "stability_timepoints" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "stability_timepoints"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "standalone_tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "standalone_tasks"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "stock_movements"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "supplier_qualities" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "supplier_qualities"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "suppliers"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "system_settings"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "tax_configurations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tax_configurations"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "territories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "territories"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "three_way_matches" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "three_way_matches"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tickets"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "time_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "time_entries"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "training_courses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "training_courses"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "training_enrollments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "training_enrollments"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "training_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "training_records"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "users"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "vendor_scores" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "vendor_scores"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "visits" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "visits"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "warehouse_zones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "warehouse_zones"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "warehouses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "warehouses"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "water_system_readings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "water_system_readings"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "weekly_plans" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "weekly_plans"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "work_orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "work_orders"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "workflow_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "workflow_logs"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "workflows" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "workflows"
  USING ("tenantId" = current_setting('app.current_tenant_id', true));
