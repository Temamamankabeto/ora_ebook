CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE ebook_status AS ENUM (
    'SUBMITTED','SCREENING','RETURNED_FOR_CORRECTION','UNDER_REVIEW','REVISION_REQUIRED',
    'ACCEPTED','REJECTED','FINANCE_PENDING','FINANCE_CLEARED','IN_PRODUCTION','PUBLISHED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE revision_type AS ENUM ('MINOR','MAJOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reviewer_recommendation AS ENUM ('ACCEPT','MINOR','MAJOR','REJECT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE access_type AS ENUM ('OPEN','RESTRICTED','EMBARGOED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('NOT_REQUIRED','PENDING','PAID','WAIVED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE access_action AS ENUM ('VIEWED','DOWNLOADED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ROLES + USER_ROLES
CREATE TABLE IF NOT EXISTS roles (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(uuid) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(uuid) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- EBOOKS
CREATE TABLE IF NOT EXISTS ebooks (
  ebook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(uuid) ON DELETE RESTRICT,
  editor_id UUID NULL REFERENCES users(uuid) ON DELETE SET NULL,

  title TEXT NOT NULL,
  abstract TEXT,
  keywords TEXT[],

  status ebook_status NOT NULL DEFAULT 'SUBMITTED',
  access access_type NOT NULL DEFAULT 'RESTRICTED',
  embargo_until DATE NULL,

  isbn VARCHAR(30),
  doi VARCHAR(120),

  published_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ebooks_status ON ebooks(status);
CREATE INDEX IF NOT EXISTS idx_ebooks_author ON ebooks(author_id);

-- VERSIONS
CREATE TABLE IF NOT EXISTS ebook_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES ebooks(ebook_id) ON DELETE CASCADE,
  version_no INT NOT NULL,
  is_final BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_by UUID NOT NULL REFERENCES users(uuid) ON DELETE RESTRICT,
  revision_requested revision_type NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(ebook_id, version_no)
);

ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS current_version_id UUID NULL;
ALTER TABLE ebooks
  ADD CONSTRAINT fk_ebooks_current_version
  FOREIGN KEY (current_version_id) REFERENCES ebook_versions(version_id)
  DEFERRABLE INITIALLY DEFERRED;

-- FILES
CREATE TABLE IF NOT EXISTS ebook_files (
  file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES ebooks(ebook_id) ON DELETE CASCADE,
  version_id UUID NULL REFERENCES ebook_versions(version_id) ON DELETE CASCADE,

  file_type VARCHAR(30) NOT NULL, -- MANUSCRIPT, REVISED, PROOF, PDF, EPUB, COVER, RECEIPT
  original_name TEXT,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  uploaded_by UUID NOT NULL REFERENCES users(uuid) ON DELETE RESTRICT,
  uploaded_at TIMESTAMP NOT NULL DEFAULT now(),
  is_published_output BOOLEAN NOT NULL DEFAULT FALSE
);

-- DECISIONS
CREATE TABLE IF NOT EXISTS ebook_decisions (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES ebooks(ebook_id) ON DELETE CASCADE,
  decided_by UUID NOT NULL REFERENCES users(uuid) ON DELETE RESTRICT,
  decision VARCHAR(30) NOT NULL, -- SEND_TO_REVIEW, RETURN_FOR_CORRECTION, MINOR_REVISION, MAJOR_REVISION, ACCEPT, REJECT
  remarks TEXT,
  decided_at TIMESTAMP NOT NULL DEFAULT now()
);

-- REVIEWER ASSIGNMENTS + REVIEWS
CREATE TABLE IF NOT EXISTS ebook_reviewer_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES ebooks(ebook_id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(uuid) ON DELETE RESTRICT,
  assigned_by UUID NOT NULL REFERENCES users(uuid) ON DELETE RESTRICT,
  assigned_at TIMESTAMP NOT NULL DEFAULT now(),
  due_at TIMESTAMP NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'INVITED', -- INVITED|ACCEPTED|DECLINED|SUBMITTED|CANCELLED
  UNIQUE(ebook_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS ebook_reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES ebook_reviewer_assignments(assignment_id) ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES ebooks(ebook_id) ON DELETE CASCADE,
  recommendation reviewer_recommendation NOT NULL,
  confidential_comments_to_editor TEXT,
  comments_to_author TEXT,
  submitted_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(assignment_id)
);

-- FINANCE
CREATE TABLE IF NOT EXISTS ebook_payments (
  payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL UNIQUE REFERENCES ebooks(ebook_id) ON DELETE CASCADE,
  bpc_amount NUMERIC(12,2),
  currency VARCHAR(10) DEFAULT 'ETB',
  status payment_status NOT NULL DEFAULT 'PENDING',
  invoice_number VARCHAR(60),
  receipt_file_id UUID NULL REFERENCES ebook_files(file_id) ON DELETE SET NULL,
  waiver_requested BOOLEAN NOT NULL DEFAULT FALSE,
  waiver_reason TEXT,
  waiver_decided_by UUID NULL REFERENCES users(uuid) ON DELETE SET NULL,
  waiver_decided_at TIMESTAMP NULL,
  finance_officer_id UUID NULL REFERENCES users(uuid) ON DELETE SET NULL,
  finance_cleared_at TIMESTAMP NULL,
  finance_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- PRODUCTION
CREATE TABLE IF NOT EXISTS ebook_production (
  production_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL UNIQUE REFERENCES ebooks(ebook_id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(uuid) ON DELETE RESTRICT,
  layout_checked BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_verified BOOLEAN NOT NULL DEFAULT FALSE,
  pdf_file_id UUID NULL REFERENCES ebook_files(file_id) ON DELETE SET NULL,
  epub_file_id UUID NULL REFERENCES ebook_files(file_id) ON DELETE SET NULL,
  cover_file_id UUID NULL REFERENCES ebook_files(file_id) ON DELETE SET NULL,
  production_notes TEXT,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- WORKFLOW HISTORY
CREATE TABLE IF NOT EXISTS ebook_workflow_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES ebooks(ebook_id) ON DELETE CASCADE,
  previous_status ebook_status NULL,
  new_status ebook_status NOT NULL,
  changed_by UUID NULL REFERENCES users(uuid) ON DELETE SET NULL,
  comments TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ACCESS LOGS
CREATE TABLE IF NOT EXISTS ebook_access_logs (
  access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES ebooks(ebook_id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES users(uuid) ON DELETE SET NULL,
  action access_action NOT NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
