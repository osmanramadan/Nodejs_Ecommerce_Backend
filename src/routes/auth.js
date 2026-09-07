import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/db.js'

const router = express.Router()

const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase()

const createToken = (user) => jwt.sign(
  {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role || 'user',
  },
  process.env.JWT_SECRET || 'supersecretjwtkey',
  { expiresIn: '7d' }
)

const hasSpecialCharacter = (value) => /[!@#$%^&*()_+{}\[\]|\\:";'<>?,./-]/.test(value)

router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body
    const normalizedEmail = normalizeEmail(email)

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    if (password.length < 8 || !hasSpecialCharacter(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and contain at least 1 special character',
      })
    }

    const exists = await pool.query('SELECT 1 FROM users WHERE LOWER(email) = $1', [normalizedEmail])
    if (exists.rowCount > 0) {
      return res.status(409).json({ message: 'Email already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await pool.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, first_name, last_name, email, role',
      [firstName, lastName, normalizedEmail, passwordHash, 'user']
    )

    const user = result.rows[0]
    res.status(201).json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role || 'user',
      },
      accessToken: createToken(user),
    })
  } catch (error) {
    res.status(500).json({ message: 'Signup failed', error: error.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const normalizedEmail = normalizeEmail(email)

    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail])
    const user = result.rows[0]

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    res.json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role || 'user',
      },
      accessToken: createToken(user),
    })
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message })
  }
})

router.get('/users', async (req, res) => {
  const { email } = req.query

  if (!email) {
    return res.status(400).json({ message: 'Email is required' })
  }

  const result = await pool.query('SELECT id, email, first_name, last_name, role FROM users WHERE email = $1', [email])
  res.json(result.rows)
})

router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { firstName, lastName, email } = req.body

    const result = await pool.query(
      'UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), email = COALESCE($3, email) WHERE id = $4 RETURNING id, first_name, last_name, email, role',
      [firstName, lastName, email, id]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = result.rows[0]
    res.json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role || 'user',
    })
  } catch (error) {
    res.status(500).json({ message: 'Update failed', error: error.message })
  }
})

export default router
