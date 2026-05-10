-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas for multi-tenant isolation
CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS audit;

-- Audit log table (high-performance, separate schema)
CREATE TABLE IF NOT EXISTS audit.audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition audit log by month for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_date ON audit.audit_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit.audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit.audit_log (user_id, created_at DESC);

-- Full-text search index (for future use)
-- CREATE INDEX IF NOT EXISTS idx_audit_log_search ON audit.audit_log USING gin(to_tsvector('english', old_values::text || ' ' || new_values::text));
