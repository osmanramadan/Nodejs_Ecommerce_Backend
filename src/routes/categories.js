import express from 'express'
import pool from '../config/db.js'

const router = express.Router()

router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id ASC')
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Categories fetch failed', error: error.message })
  }
})

export default router
