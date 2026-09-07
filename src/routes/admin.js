import express from 'express'
import pool from '../config/db.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

router.use(requireAuth)
router.use(requireAdmin)

router.get('/admin/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC')

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
    res.status(500).json({ message: 'Admin orders fetch failed', error: error.message })
  }
})

router.patch('/admin/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const validStatuses = ['pending', 'paid', 'shipped', 'completed']

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' })
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const updatedOrder = result.rows[0]
    res.json({
      id: updatedOrder.id,
      userId: updatedOrder.user_id,
      items: typeof updatedOrder.items === 'string' ? JSON.parse(updatedOrder.items) : updatedOrder.items,
      total: Number(updatedOrder.total),
      createdAt: updatedOrder.created_at,
      status: updatedOrder.status,
    })
  } catch (error) {
    res.status(500).json({ message: 'Order status update failed', error: error.message })
  }
})

router.get('/admin/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC')

    res.json(
      result.rows.map((product) => ({
        ...product,
        price: Number(product.price),
        rating: Number(product.rating),
      }))
    )
  } catch (error) {
    res.status(500).json({ message: 'Admin products fetch failed', error: error.message })
  }
})

router.post('/admin/products', async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      rating = 0,
      reviewCount = 0,
      image,
      badge,
      inStock = true,
      numInStock = 0,
    } = req.body

    if (!name || !category || !price) {
      return res.status(400).json({ message: 'Name, category and price are required' })
    }

    const result = await pool.query(
      `INSERT INTO products (name, category, price, rating, review_count, image, badge, in_stock, num_in_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        name,
        category,
        Number(price),
        Number(rating),
        Number(reviewCount),
        image || '',
        badge || null,
        Boolean(inStock),
        Number(numInStock),
      ]
    )

    const product = result.rows[0]
    res.status(201).json({
      ...product,
      price: Number(product.price),
      rating: Number(product.rating),
      reviewCount: Number(product.review_count ?? 0),
    })
  } catch (error) {
    res.status(500).json({ message: 'Product creation failed', error: error.message })
  }
})

router.patch('/admin/products/:id', async (req, res) => {
  try {
    const { name, category, price, rating, reviewCount, image, badge, inStock, numInStock } = req.body

    const result = await pool.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           price = COALESCE($3, price),
           rating = COALESCE($4, rating),
           review_count = COALESCE($5, review_count),
           image = COALESCE($6, image),
           badge = COALESCE($7, badge),
           in_stock = COALESCE($8, in_stock),
           num_in_stock = COALESCE($9, num_in_stock)
       WHERE id = $10 RETURNING *`,
      [
        name,
        category,
        price !== undefined ? Number(price) : undefined,
        rating !== undefined ? Number(rating) : undefined,
        reviewCount !== undefined ? Number(reviewCount) : undefined,
        image,
        badge,
        inStock,
        numInStock !== undefined ? Number(numInStock) : undefined,
        req.params.id,
      ]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Product not found' })
    }

    const product = result.rows[0]
    res.json({
      ...product,
      price: Number(product.price),
      rating: Number(product.rating),
      reviewCount: Number(product.review_count ?? 0),
    })
  } catch (error) {
    res.status(500).json({ message: 'Product update failed', error: error.message })
  }
})

router.delete('/admin/products/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id])

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Product not found' })
    }

    res.json({ message: 'Product deleted successfully', id: Number(req.params.id) })
  } catch (error) {
    res.status(500).json({ message: 'Product delete failed', error: error.message })
  }
})

export default router
