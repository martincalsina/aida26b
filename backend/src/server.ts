import express from 'express';
import type { Request, RequestHandler } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import * as auth from './auth';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware
app.use(cors());
app.use(express.json());

type AuthedRequest = Request & { user?: auth.AuthUser };

function getSessionToken(req: Request) {
  return auth.parseCookies(req.headers.cookie)[auth.SESSION_COOKIE];
}

function readPassword(value: unknown) {
  return typeof value === 'string' && value.length >= 8 ? value : null;
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

async function audit(req: Request, eventType: string, outcome: string, details: Record<string, unknown> = {}) {
  try {
    await pool.query(
      'INSERT INTO auth.audit_log (actor_user_id, event_type, outcome, ip, user_agent, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [(req as AuthedRequest).user?.id ?? null, eventType, outcome, req.ip, req.get('user-agent') ?? null, JSON.stringify(details)],
    );
  } catch (error) {
    console.error('Error writing audit log:', error);
  }
}

async function loadSession(req: Request) {
  const token = getSessionToken(req);
  if (!token) return null;

  const result = await pool.query(
    `SELECT s.id AS session_id, u.id, u.username, u.email, u.role, u.is_active, u.must_change_password
     FROM auth.sessions s
     JOIN auth.users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.is_active = true`,
    [auth.hashToken(token)],
  );

  return result.rows[0] ? auth.publicUser(result.rows[0]) : null;
}

const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const user = await loadSession(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    (req as AuthedRequest).user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const requirePasswordReady: RequestHandler = (req, res, next) => {
  if ((req as AuthedRequest).user?.must_change_password) {
    return res.status(403).json({ error: 'Password change required' });
  }
  next();
};

const requireAdmin: RequestHandler = async (req, res, next) => {
  if ((req as AuthedRequest).user?.role === 'admin') return next();
  await audit(req, 'permission_denied', 'denied', { path: req.path, method: req.method });
  res.status(403).json({ error: 'Forbidden' });
};

const requireAcademicWrite: RequestHandler = async (req, res, next) => {
  const role = (req as AuthedRequest).user?.role;
  if (role === 'admin' || role === 'editor') return next();
  await audit(req, 'permission_denied', 'denied', { path: req.path, method: req.method });
  res.status(403).json({ error: 'Forbidden' });
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const result = await pool.query(
      'SELECT id, username, email, password_hash, password_salt, role, is_active, must_change_password FROM auth.users WHERE username = $1',
      [username],
    );
    const row = result.rows[0];
    const ok = row && row.is_active === true && await auth.verifyPassword(password, row.password_salt, row.password_hash);

    if (!ok) {
      await audit(req, 'login_failed', 'failure', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = auth.publicUser(row);
    const token = auth.newSessionToken();
    await pool.query(
      'INSERT INTO auth.sessions (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval \'7 days\')',
      [user.id, auth.hashToken(token)],
    );
    (req as AuthedRequest).user = user;
    await audit(req, 'login_success', 'success');
    res.setHeader('Set-Cookie', auth.sessionCookie(token, process.env.NODE_ENV === 'production'));
    res.json({ user });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = getSessionToken(req);
    if (token) {
      const user = await loadSession(req);
      if (user) (req as AuthedRequest).user = user;
      await pool.query('DELETE FROM auth.sessions WHERE token_hash = $1', [auth.hashToken(token)]);
      await audit(req, 'logout', 'success');
    }
    res.setHeader('Set-Cookie', auth.clearSessionCookie(process.env.NODE_ENV === 'production'));
    res.status(204).send();
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: (req as AuthedRequest).user });
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const currentPassword = typeof req.body.current_password === 'string' ? req.body.current_password : '';
    const newPassword = readPassword(req.body.new_password);
    const user = (req as AuthedRequest).user!;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and a valid new password are required' });
    }

    const current = await pool.query('SELECT password_hash, password_salt FROM auth.users WHERE id = $1', [user.id]);
    const row = current.rows[0];
    const ok = row && await auth.verifyPassword(currentPassword, row.password_salt, row.password_hash);
    if (!ok) {
      await audit(req, 'password_change_failed', 'failure');
      return res.status(401).json({ error: 'Invalid current password' });
    }

    const { passwordHash, passwordSalt } = await auth.hashPassword(newPassword);
    const result = await pool.query(
      `UPDATE auth.users
       SET password_hash = $1, password_salt = $2, must_change_password = false, updated_at = now()
       WHERE id = $3
       RETURNING id, username, email, role, is_active, must_change_password`,
      [passwordHash, passwordSalt, user.id],
    );
    (req as AuthedRequest).user = auth.publicUser(result.rows[0]);
    await audit(req, 'password_changed', 'success');
    res.json({ user: (req as AuthedRequest).user });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/users', requireAuth, requirePasswordReady, requireAdmin, async (req, res) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body.email === 'string' && req.body.email.trim() ? req.body.email.trim() : null;
    const password = readPassword(req.body.password);
    const role = req.body.role;

    if (!username || !password || !auth.isRole(role)) {
      return res.status(400).json({ error: 'Valid username, password and role are required' });
    }

    const { passwordHash, passwordSalt } = await auth.hashPassword(password);
    const result = await pool.query(
      `INSERT INTO auth.users (username, email, password_hash, password_salt, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, role, is_active, must_change_password`,
      [username, email, passwordHash, passwordSalt, role],
    );
    await audit(req, 'user_created', 'success', { user_id: result.rows[0].id, role });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Username already exists' });
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/users/:id/reset-password', requireAuth, requirePasswordReady, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const password = readPassword(req.body.password);
    if (!Number.isInteger(userId) || !password) {
      return res.status(400).json({ error: 'Valid user id and password are required' });
    }

    const { passwordHash, passwordSalt } = await auth.hashPassword(password);
    const result = await pool.query(
      `UPDATE auth.users
       SET password_hash = $1, password_salt = $2, must_change_password = true, updated_at = now()
       WHERE id = $3
       RETURNING id, username, email, role, is_active, must_change_password`,
      [passwordHash, passwordSalt, userId],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    await pool.query('DELETE FROM auth.sessions WHERE user_id = $1', [userId]);
    await audit(req, 'password_reset', 'success', { user_id: userId });
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Routes
app.get('/api/students', requireAuth, requirePasswordReady, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY numero_libreta');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/students/:numero_libreta', requireAuth, requirePasswordReady, async (req, res) => {
  try {
    const { numero_libreta } = req.params;
    const result = await pool.query('SELECT * FROM students WHERE numero_libreta = $1', [numero_libreta]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/students', requireAuth, requirePasswordReady, requireAcademicWrite, async (req, res) => {
  try {
    const { numero_libreta, dni, first_name, last_name, email, enrollment_date, status } = req.body;
    const password = readPassword(req.body.password);
    if (!password) {
      return res.status(400).json({ error: 'Valid student password is required' });
    }

    const { passwordHash, passwordSalt } = await auth.hashPassword(password);
    const result = await pool.query(
      'INSERT INTO students (numero_libreta, dni, first_name, last_name, email, enrollment_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [numero_libreta, dni, first_name, last_name, email, enrollment_date, status]
    );
    await pool.query(
      `INSERT INTO auth.users (username, email, password_hash, password_salt, role, must_change_password, student_numero_libreta)
       VALUES ($1, $2, $3, $4, 'reader', true, $1)`,
      [numero_libreta, email || null, passwordHash, passwordSalt],
    );
    await audit(req, 'student_user_created', 'success', { username: numero_libreta });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) return res.status(409).json({ error: 'Student or username already exists' });
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/students/:numero_libreta', requireAuth, requirePasswordReady, requireAcademicWrite, async (req, res) => {
  try {
    const { numero_libreta } = req.params;
    const { dni, first_name, last_name, email, enrollment_date, status } = req.body;
    const result = await pool.query(
      'UPDATE students SET dni = $1, first_name = $2, last_name = $3, email = $4, enrollment_date = $5, status = $6 WHERE numero_libreta = $7 RETURNING *',
      [dni, first_name, last_name, email, enrollment_date, status, numero_libreta]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/students/:numero_libreta', requireAuth, requirePasswordReady, requireAcademicWrite, async (req, res) => {
  try {
    const { numero_libreta } = req.params;
    const result = await pool.query('DELETE FROM students WHERE numero_libreta = $1 RETURNING *', [numero_libreta]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Subjects routes
app.get('/api/subjects', requireAuth, requirePasswordReady, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subjects ORDER BY cod_mat');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/subjects/:cod_mat', requireAuth, requirePasswordReady, async (req, res) => {
  try {
    const { cod_mat } = req.params;
    const result = await pool.query('SELECT * FROM subjects WHERE cod_mat = $1', [cod_mat]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/subjects', requireAuth, requirePasswordReady, requireAcademicWrite, async (req, res) => {
  try {
    const { cod_mat, name, description, credits, department } = req.body;
    const result = await pool.query(
      'INSERT INTO subjects (cod_mat, name, description, credits, department) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [cod_mat, name, description, credits, department]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/subjects/:cod_mat', requireAuth, requirePasswordReady, requireAcademicWrite, async (req, res) => {
  try {
    const { cod_mat } = req.params;
    const { name, description, credits, department } = req.body;
    const result = await pool.query(
      'UPDATE subjects SET name = $1, description = $2, credits = $3, department = $4 WHERE cod_mat = $5 RETURNING *',
      [name, description, credits, department, cod_mat]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/subjects/:cod_mat', requireAuth, requirePasswordReady, requireAcademicWrite, async (req, res) => {
  try {
    const { cod_mat } = req.params;
    const result = await pool.query('DELETE FROM subjects WHERE cod_mat = $1 RETURNING *', [cod_mat]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enrollments routes
app.get('/api/enrollments', requireAuth, requirePasswordReady, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, s.first_name, s.last_name, sub.name as subject_name
      FROM enrollments e
      JOIN students s ON e.numero_libreta = s.numero_libreta
      JOIN subjects sub ON e.cod_mat = sub.cod_mat
      ORDER BY e.numero_libreta, e.cod_mat
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/enrollments/:numero_libreta/:cod_mat', requireAuth, requirePasswordReady, async (req, res) => {
  try {
    const { numero_libreta, cod_mat } = req.params;
    const result = await pool.query('SELECT * FROM enrollments WHERE numero_libreta = $1 AND cod_mat = $2', [numero_libreta, cod_mat]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/enrollments', requireAuth, requirePasswordReady, requireAcademicWrite, async (req, res) => {
  try {
    const { numero_libreta, cod_mat, enrollment_date, grade, status } = req.body;
    const result = await pool.query(
      'INSERT INTO enrollments (numero_libreta, cod_mat, enrollment_date, grade, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [numero_libreta, cod_mat, enrollment_date, grade, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/enrollments/:numero_libreta/:cod_mat', requireAuth, requirePasswordReady, requireAcademicWrite, async (req, res) => {
  try {
    const { numero_libreta, cod_mat } = req.params;
    const { enrollment_date, grade, status } = req.body;
    const result = await pool.query(
      'UPDATE enrollments SET enrollment_date = $1, grade = $2, status = $3 WHERE numero_libreta = $4 AND cod_mat = $5 RETURNING *',
      [enrollment_date, grade, status, numero_libreta, cod_mat]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/enrollments/:numero_libreta/:cod_mat', requireAuth, requirePasswordReady, requireAcademicWrite, async (req, res) => {
  try {
    const { numero_libreta, cod_mat } = req.params;
    const result = await pool.query('DELETE FROM enrollments WHERE numero_libreta = $1 AND cod_mat = $2 RETURNING *', [numero_libreta, cod_mat]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    res.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files from frontend dist
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Catch-all handler: send back index.html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

export { app, pool };

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
