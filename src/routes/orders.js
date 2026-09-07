import express from 'express'
import pool from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.get('/orders', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    )

    res.json(
      result.rows.map((order) => ({
        id: order.id,
        userId: order.user_id,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
        total: Number(order.total),
        createdAt: order.created_at,
        status: order.status,
      }))
    )
  } catch (error) {
    res.status(500).json({ message: 'Orders fetch failed', error: error.message })
  }
})

router.post('/orders', requireAuth, async (req, res) => {
  try {
    const { items, total, status = 'pending' } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items are required' })
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const stockUpdates = []

      for (const item of items) {
        const productId = Number(item.productId ?? item.product_id)
        const quantity = Number(item.quantity ?? 0)

        if (!Number.isFinite(productId) || !Number.isFinite(quantity) || quantity <= 0) {
          throw new Error('Each order item must include a valid productId and quantity')
        }

        const productResult = await client.query(
          'SELECT id, num_in_stock FROM products WHERE id = $1 FOR UPDATE',
          [productId]
        )

        if (!productResult.rowCount) {
          throw new Error(`Product ${productId} not found`)
        }

        const currentStock = Number(productResult.rows[0].num_in_stock ?? 0)

        if (currentStock < quantity) {
          throw new Error(`Not enough stock for product ${productId}`)
        }

        stockUpdates.push({
          productId,
          nextStock: currentStock - quantity,
        })
      }

      for (const stockUpdate of stockUpdates) {
        await client.query(
          'UPDATE products SET num_in_stock = $1, in_stock = $2 WHERE id = $3',
          [stockUpdate.nextStock, stockUpdate.nextStock > 0, stockUpdate.productId]
        )
      }

      const result = await client.query(
        'INSERT INTO orders (user_id, items, total, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.user.id, JSON.stringify(items), Number(total), status]
      )

      await client.query('COMMIT')

      const order = result.rows[0]
      res.status(201).json({
        id: order.id,
        userId: order.user_id,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
        total: Number(order.total),
        createdAt: order.created_at,
        status: order.status,
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    res.status(400).json({ message: error.message || 'Order save failed' })
  }
})

export default router
