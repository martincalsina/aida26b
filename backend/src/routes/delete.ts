app.delete('/api/students/:numero_libreta', async (req, res) => {
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

app.delete('/api/subjects/:cod_mat', async (req, res) => {
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

app.delete('/api/enrollments/:numero_libreta/:cod_mat', async (req, res) => {
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
