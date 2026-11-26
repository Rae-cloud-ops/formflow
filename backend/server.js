const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { randomBytes, scrypt } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);
const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'formflow',
  password: process.env.DB_PASSWORD || 'formflow123',
  database: process.env.DB_NAME || 'formflow_db',
  port: 5432,
});

let databaseReady;

function ensureUsersTable() {
  if (!databaseReady) {
    databaseReady = pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(254) NOT NULL UNIQUE,
        password_hash VARCHAR(256) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  return databaseReady;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'formflow-backend' });
});

app.post('/api/users', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' ||
      !email.trim() || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email and password are required.' });
  }

  try {
    await ensureUsersTable();
    const normalizedEmail = email.trim().toLowerCase();
    const salt = randomBytes(16).toString('hex');
    const hash = await scryptAsync(password, salt, 64);
    const passwordHash = `scrypt$${salt}$${hash.toString('hex')}`;
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [normalizedEmail, passwordHash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    console.error('User creation error:', err.message);
    res.status(500).json({ error: 'Unable to add user.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`FormFlow Backend running on http://0.0.0.0:${PORT}`);
});
