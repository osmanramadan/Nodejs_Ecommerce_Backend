import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import authRoutes from './routes/auth.js'
import productsRoutes from './routes/products.js'
import categoriesRoutes from './routes/categories.js'
import wishlistRoutes from './routes/wishlist.js'
import ordersRoutes from './routes/orders.js'
import adminRoutes from './routes/admin.js'
import pool from './config/db.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 5005

const ensureAdminUser = async () => {
  try {
    await pool.query(`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'`)

    const normalizedEmail = 'admin@eco-mark.com'
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10)

    const existingAdmin = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail])
    if (existingAdmin.rowCount > 0) {
      await pool.query(
        'UPDATE users SET role = $1, password_hash = $2 WHERE LOWER(email) = $3',
        ['admin', adminPasswordHash, normalizedEmail]
      )
      return
    }

    await pool.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      ['System', 'Admin', normalizedEmail, adminPasswordHash, 'admin']
    )
  } catch (error) {
    console.error('Admin seed failed:', error)
  }
}

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'ecommerce API is running' })
})

app.use('/api', authRoutes)
app.use('/api', productsRoutes)
app.use('/api', categoriesRoutes)
app.use('/api', wishlistRoutes)
app.use('/api', ordersRoutes)
app.use('/api', adminRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
})

app.listen(port, async () => {
  await ensureAdminUser()
  console.log(`Server running on http://localhost:${port}`)
})
