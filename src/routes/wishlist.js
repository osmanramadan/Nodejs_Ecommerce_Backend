import express from 'express'
import pool from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.get('/wishlist', requireAuth, async (req, res) => {
  try {
    const { userId, productId } = req.query
    const targetUserId = userId ? Number(userId) : req.user.id
    const targetProductId = productId !== undefined ? Number(productId) : null

    let query = 'SELECT * FROM wishlist WHERE user_id = $1'
    const params = [targetUserId]

    if (Number.isFinite(targetProductId)) {
      query += ' AND product_id = $2'
      params.push(targetProductId)
    }

    query += ' ORDER BY id ASC'

    const result = await pool.query(query, params)
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        productId: row.product_id,
      }))
    )
  } catch (error) {
    res.status(500).json({ message: 'Wishlist fetch failed', error: error.message })
  }
})

router.post('/wishlist', requireAuth, async (req, res) => {
  try {
    const { productId } = req.body
    const userId = Number(req.user.id)

    if (!productId) {
      return res.status(400).json({ message: 'productId is required' })
    }

    const result = await pool.query(
      'INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2) ON CONFLICT (user_id, product_id) DO NOTHING RETURNING *',
      [userId, productId]
    )

    res.status(201).json(result.rows[0] || { userId, productId })
  } catch (error) {
    res.status(500).json({ message: 'Wishlist save failed', error: error.message })
  }
})

router.delete('/wishlist/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM wishlist WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id])

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Wishlist item not found' })
    }

    res.json({ message: 'Removed from wishlist' })
  } catch (error) {
    res.status(500).json({ message: 'Wishlist delete failed', error: error.message })
  }
})

export default router
