-- AUTO-GENERATED. DO NOT EDIT BY HAND.
-- Rollback companion to rls-enable.sql.

DROP POLICY IF EXISTS tenant_isolation ON "accounts";
ALTER TABLE "accounts" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "activities";
ALTER TABLE "activities" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "ai_configs";
ALTER TABLE "ai_configs" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "ai_logs";
ALTER TABLE "ai_logs" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "api_tokens";
ALTER TABLE "api_tokens" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "applications";
ALTER TABLE "applications" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "approval_logs";
ALTER TABLE "approval_logs" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "asset_maintenances";
ALTER TABLE "asset_maintenances" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "assets";
ALTER TABLE "assets" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "attendances";
ALTER TABLE "attendances" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "audit_logs";
ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "batch_releases";
ALTER TABLE "batch_releases" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "batch_traceabilities";
ALTER TABLE "batch_traceabilities" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "bill_items";
ALTER TABLE "bill_items" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "bill_of_materials";
ALTER TABLE "bill_of_materials" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "bills";
ALTER TABLE "bills" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "bom_items";
ALTER TABLE "bom_items" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "budget_lines";
ALTER TABLE "budget_lines" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "budgets";
ALTER TABLE "budgets" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "business_unit_members";
ALTER TABLE "business_unit_members" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "business_unit_products";
ALTER TABLE "business_unit_products" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "business_unit_territories";
ALTER TABLE "business_unit_territories" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "business_units";
ALTER TABLE "business_units" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "campaigns";
ALTER TABLE "campaigns" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "candidates";
ALTER TABLE "candidates" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "capa_actions";
ALTER TABLE "capa_actions" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "capas";
ALTER TABLE "capas" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "change_controls";
ALTER TABLE "change_controls" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "chart_of_accounts";
ALTER TABLE "chart_of_accounts" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "cheques";
ALTER TABLE "cheques" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "cleaning_validations";
ALTER TABLE "cleaning_validations" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "contacts";
ALTER TABLE "contacts" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "contracts";
ALTER TABLE "contracts" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "cost_centers";
ALTER TABLE "cost_centers" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "custom_field_values";
ALTER TABLE "custom_field_values" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "custom_fields";
ALTER TABLE "custom_fields" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "deal_activities";
ALTER TABLE "deal_activities" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "deals";
ALTER TABLE "deals" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "delivery_notes";
ALTER TABLE "delivery_notes" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "departments";
ALTER TABLE "departments" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "deviations";
ALTER TABLE "deviations" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "doctors";
ALTER TABLE "doctors" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "documents";
ALTER TABLE "documents" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "employees";
ALTER TABLE "employees" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "environmental_monitorings";
ALTER TABLE "environmental_monitorings" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "equipment_records";
ALTER TABLE "equipment_records" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "expenses";
ALTER TABLE "expenses" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "field_visits";
ALTER TABLE "field_visits" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "fiscal_periods";
ALTER TABLE "fiscal_periods" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "goods_receipts";
ALTER TABLE "goods_receipts" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "gps_locations";
ALTER TABLE "gps_locations" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "hvac_readings";
ALTER TABLE "hvac_readings" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "interviews";
ALTER TABLE "interviews" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "invoice_items";
ALTER TABLE "invoice_items" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "invoices";
ALTER TABLE "invoices" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "jobs";
ALTER TABLE "jobs" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "journal_entries";
ALTER TABLE "journal_entries" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "journal_entry_lines";
ALTER TABLE "journal_entry_lines" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "knowledge_articles";
ALTER TABLE "knowledge_articles" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "kpis";
ALTER TABLE "kpis" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "leads";
ALTER TABLE "leads" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "leave_requests";
ALTER TABLE "leave_requests" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "loyalty_members";
ALTER TABLE "loyalty_members" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "loyalty_programs";
ALTER TABLE "loyalty_programs" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "loyalty_transactions";
ALTER TABLE "loyalty_transactions" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "manufacturing_batch_records";
ALTER TABLE "manufacturing_batch_records" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "market_requests";
ALTER TABLE "market_requests" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "messages";
ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "notifications";
ALTER TABLE "notifications" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "offer_letters";
ALTER TABLE "offer_letters" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "onboarding_checklists";
ALTER TABLE "onboarding_checklists" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "onboarding_tasks";
ALTER TABLE "onboarding_tasks" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "oos_investigations";
ALTER TABLE "oos_investigations" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "opportunities";
ALTER TABLE "opportunities" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "payments";
ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "payrolls";
ALTER TABLE "payrolls" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "positions";
ALTER TABLE "positions" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "products";
ALTER TABLE "products" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "project_tasks";
ALTER TABLE "project_tasks" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "projects";
ALTER TABLE "projects" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "purchase_order_items";
ALTER TABLE "purchase_order_items" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "purchase_orders";
ALTER TABLE "purchase_orders" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "q_audit_findings";
ALTER TABLE "q_audit_findings" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "q_audits";
ALTER TABLE "q_audits" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "q_complaints";
ALTER TABLE "q_complaints" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "q_document_versions";
ALTER TABLE "q_document_versions" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "q_documents";
ALTER TABLE "q_documents" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "recalls";
ALTER TABLE "recalls" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "rfqs";
ALTER TABLE "rfqs" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "risk_assessments";
ALTER TABLE "risk_assessments" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "sales_order_items";
ALTER TABLE "sales_order_items" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "sales_orders";
ALTER TABLE "sales_orders" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "shipments";
ALTER TABLE "shipments" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "spc_charts";
ALTER TABLE "spc_charts" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "spc_data_points";
ALTER TABLE "spc_data_points" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "stability_studies";
ALTER TABLE "stability_studies" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "stability_timepoints";
ALTER TABLE "stability_timepoints" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "standalone_tasks";
ALTER TABLE "standalone_tasks" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "stock_movements";
ALTER TABLE "stock_movements" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "supplier_qualities";
ALTER TABLE "supplier_qualities" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "suppliers";
ALTER TABLE "suppliers" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "system_settings";
ALTER TABLE "system_settings" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "tax_configurations";
ALTER TABLE "tax_configurations" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "territories";
ALTER TABLE "territories" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "three_way_matches";
ALTER TABLE "three_way_matches" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "tickets";
ALTER TABLE "tickets" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "time_entries";
ALTER TABLE "time_entries" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "training_courses";
ALTER TABLE "training_courses" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "training_enrollments";
ALTER TABLE "training_enrollments" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "training_records";
ALTER TABLE "training_records" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "users";
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "vendor_scores";
ALTER TABLE "vendor_scores" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "visits";
ALTER TABLE "visits" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "warehouse_zones";
ALTER TABLE "warehouse_zones" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "warehouses";
ALTER TABLE "warehouses" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "water_system_readings";
ALTER TABLE "water_system_readings" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "weekly_plans";
ALTER TABLE "weekly_plans" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "work_orders";
ALTER TABLE "work_orders" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "workflow_logs";
ALTER TABLE "workflow_logs" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "workflows";
ALTER TABLE "workflows" DISABLE ROW LEVEL SECURITY;
