import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { getStudentsHandler, getSubjectsHandler, getEnrollmentsHandler } from './routes/get';
import { updateStudent, updateSubject, updateEnrollment } from './routes/put';
import { insertStudent, insertSubject, insertEnrollment } from './routes/post';
import { deleteStudent, deleteSubject, deleteEnrollment } from './routes/delete';

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

// Student routes
app.get('/api/students', async (req, res) => getStudentsHandler(req, res, pool));

app.post('/api/students', async (req, res) => insertStudent(req, res, pool));

app.put('/api/students', async (req, res) => updateStudent(req, res, pool));

app.delete('/api/students', async (req, res) => deleteStudent(req, res, pool));

// Departments routes
app.get('/api/departments', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM departments ORDER BY cod_dep'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/departments/:cod_dep', async (req, res) => {
  try {
    const { cod_dep } = req.params;

    const result = await pool.query(
      'SELECT * FROM departments WHERE cod_dep = $1',
      [cod_dep]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/departments', async (req, res) => {
  try {
    const { cod_dep, name } = req.body;
    const result = await pool.query(
      'INSERT INTO departments (cod_dep, name) VALUES ($1, $2) RETURNING *',
      [cod_dep, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/departments/:cod_dep', async (req, res) => {
  try {
    const { cod_dep } = req.params;
    const { name } = req.body;

    const result = await pool.query(
      `UPDATE departments
       SET name = $1
       WHERE cod_dep = $2
       RETURNING *`,
      [name, cod_dep]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating departments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/departments/:cod_dep', async (req, res) => {
  try {
    const { cod_dep } = req.params;

    const result = await pool.query(
      'DELETE FROM departments WHERE cod_dep = $1 RETURNING *',
      [cod_dep]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting departments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Subjects routes
/*
app.get('/api/subjects', async (req, res) => {
  try {

    const { cod_dep } = req.query;

    let query = `
      SELECT s.*, d.name AS department_name
      FROM subjects s
      LEFT JOIN departments d ON s.cod_dep = d.cod_dep
    `;

    const params: any[] = [];

    if (cod_dep) {
      query += ` WHERE s.cod_dep = $1 `;
      params.push(cod_dep);
    }

    query += ` ORDER BY s.cod_mat`;

    const result = await pool.query(query, params);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/subjects/:cod_mat', async (req, res) => {
  try {
    const { cod_mat } = req.params;

    const result = await pool.query(`
      SELECT s.*, d.name AS department_name
      FROM subjects s
      LEFT JOIN departments d ON s.cod_dep = d.cod_dep
      WHERE s.cod_mat = $1
    `, [cod_mat]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/subjects', async (req, res) => {
  try {
    const { cod_mat, name, description, credits, cod_dep } = req.body;

    const result = await pool.query(
      `INSERT INTO subjects
       (cod_mat, name, description, credits, cod_dep)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [cod_mat, name, description, credits, cod_dep]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/subjects/:cod_mat', async (req, res) => {
  try {
    const { cod_mat } = req.params;
    const { name, description, credits, cod_dep } = req.body;

    const result = await pool.query(
      `UPDATE subjects
       SET name = $1,
           description = $2,
           credits = $3,
           cod_dep = $4
       WHERE cod_mat = $5
       RETURNING *`,
      [name, description, credits, cod_dep, cod_mat]
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

app.delete('/api/subjects/:cod_mat', async (req, res) => {
  try {
    const { cod_mat } = req.params;

    const result = await pool.query(
      'DELETE FROM subjects WHERE cod_mat = $1 RETURNING *',
      [cod_mat]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
*/

// Subjects routes
app.get('/api/subjects', async (req, res) => getSubjectsHandler(req, res, pool));

app.post('/api/subjects', async (req, res) => insertSubject(req, res, pool));

app.put('/api/subjects', async (req, res) => updateSubject(req, res, pool));

app.delete('/api/subjects', async (req, res) => deleteSubject(req, res, pool));


// Enrollments routes
app.get('/api/enrollments', async (req, res) => getEnrollmentsHandler(req, res, pool));

app.post('/api/enrollments', async (req, res) => insertEnrollment(req, res, pool));

app.put('/api/enrollments', async (req, res) => updateEnrollment(req, res, pool));

app.delete('/api/enrollments', async (req, res) => deleteEnrollment(req, res, pool));

// Serve static files from frontend dist
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Catch-all handler: send back index.html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
