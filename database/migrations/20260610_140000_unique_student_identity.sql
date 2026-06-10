ALTER TABLE students
  ADD CONSTRAINT students_dni_unique UNIQUE (dni),
  ADD CONSTRAINT students_email_unique UNIQUE (email);

ALTER TABLE auth.users
  ADD CONSTRAINT users_email_unique UNIQUE (email);
