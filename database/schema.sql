-- Database schema for Faculty Student Management System
-- Code and comments in English, documentation in Spanish

CREATE USER aida26_owner;
CREATE USER aida26_user WITH PASSWORD 'CambiaEsta!';

-- Create database
CREATE DATABASE faculty_management;
alter database faculty_management owner to aida26_owner;

-- Use the database
\c faculty_management;
set role to aida26_owner;
GRANT connect on database faculty_management to aida26_user;

-- Students table
-- numero_libreta is the primary key, not auto-incrementing
CREATE TABLE students (
    numero_libreta VARCHAR(20) PRIMARY KEY,
    dni VARCHAR(20) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    enrollment_date DATE,
    status VARCHAR(50) -- e.g., active, graduated, interrupted
);

-- Subjects table
-- cod_mat is the primary key
CREATE TABLE subjects (
    cod_mat VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    credits INTEGER,
    department VARCHAR(100)
);

-- Enrollments table
-- Composite primary key: numero_libreta and cod_mat
CREATE TABLE enrollments (
    numero_libreta VARCHAR(20) REFERENCES students(numero_libreta),
    cod_mat VARCHAR(20) REFERENCES subjects(cod_mat),
    enrollment_date DATE NOT NULL,
    grade DECIMAL(5,2), -- e.g., 8.5
    status VARCHAR(50), -- e.g., enrolled, completed, failed
    PRIMARY KEY (numero_libreta, cod_mat)
);

-- Authentication schema
CREATE SCHEMA auth;

CREATE TABLE auth.users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(255),
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'editor', 'reader')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    student_numero_libreta VARCHAR(20) REFERENCES students(numero_libreta) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth.sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth.audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id BIGINT REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(80) NOT NULL,
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('success', 'failure', 'denied')),
    ip TEXT,
    user_agent TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON SCHEMA auth FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM PUBLIC;

-- Indexes for performance
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_auth_sessions_expires_at ON auth.sessions(expires_at);
CREATE INDEX idx_auth_audit_log_created_at ON auth.audit_log(created_at);
CREATE INDEX idx_auth_audit_log_actor_user_id ON auth.audit_log(actor_user_id);

GRANT SELECT, UPDATE, INSERT, DELETE ON students TO aida26_user;
GRANT SELECT, UPDATE, INSERT, DELETE ON enrollments TO aida26_user;
GRANT SELECT, UPDATE, INSERT, DELETE ON subjects TO aida26_user;
GRANT USAGE ON SCHEMA auth TO aida26_user;
GRANT SELECT, UPDATE, INSERT, DELETE ON ALL TABLES IN SCHEMA auth TO aida26_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO aida26_user;
