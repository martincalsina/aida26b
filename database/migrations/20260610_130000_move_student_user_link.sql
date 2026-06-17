ALTER TABLE students
  ADD COLUMN user_id BIGINT;

WITH ranked_student_users AS (
  SELECT
    id,
    student_numero_libreta,
    ROW_NUMBER() OVER (
      PARTITION BY student_numero_libreta
      ORDER BY id
    ) AS row_number
  FROM auth.users
  WHERE student_numero_libreta IS NOT NULL
)
UPDATE students
SET user_id = ranked_student_users.id
FROM ranked_student_users
WHERE students.numero_libreta = ranked_student_users.student_numero_libreta
  AND ranked_student_users.row_number = 1;

ALTER TABLE students
  ADD CONSTRAINT students_user_id_unique UNIQUE (user_id),
  ADD CONSTRAINT students_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

ALTER TABLE auth.users
  DROP COLUMN student_numero_libreta;
