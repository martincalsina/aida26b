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

CREATE TABLE departments (
    cod_dep VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL
);

-- Subjects table
-- cod_mat is the primary key
CREATE TABLE subjects (
    cod_mat VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    credits INTEGER,
    cod_dep VARCHAR(20) REFERENCES departments(cod_dep)
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

-- Indexes for performance
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_enrollments_status ON enrollments(status);

GRANT SELECT, UPDATE, INSERT, DELETE ON students TO aida26_user;
GRANT SELECT, UPDATE, INSERT, DELETE ON enrollments TO aida26_user;
GRANT SELECT, UPDATE, INSERT, DELETE ON subjects TO aida26_user;
GRANT SELECT, UPDATE, INSERT, DELETE ON departments TO aida26_user;
