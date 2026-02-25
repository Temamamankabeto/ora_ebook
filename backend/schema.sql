-- backend/sql/003_finance_schema.sql
-- Add finance-specific tables to existing schema

-- BPC (Book Processing Charges) configuration
CREATE TABLE bpc_config (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default BPC amount
INSERT INTO bpc_config (amount, effective_from) VALUES (1500.00, CURRENT_DATE);

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    manuscript_id UUID REFERENCES manuscripts(id) ON DELETE SET NULL,
    author_id UUID REFERENCES users(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    notes TEXT,
    pdf_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Waiver requests
CREATE TABLE waiver_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) NOT NULL,
    reason TEXT NOT NULL,
    supporting_document_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    review_date TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial transactions log
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manuscript_id UUID REFERENCES manuscripts(id),
    invoice_id UUID REFERENCES invoices(id),
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('payment', 'waiver', 'refund')),
    amount DECIMAL(10,2),
    currency VARCHAR(3),
    status VARCHAR(50),
    gateway_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add finance columns to manuscripts table (if not exists)
ALTER TABLE manuscripts 
ADD COLUMN IF NOT EXISTS bpc_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS financial_clearance_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS financial_notes TEXT;