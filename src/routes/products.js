import express from 'express'
import pool from '../config/db.js'

const router = express.Router()

router.get('/products', async (req, res) => {
  try {
    const { category, id } = req.query

    let query = 'SELECT * FROM products'
    const params = []
    const filters = []

    if (category) {
      filters.push(`category = $${params.length + 1}`)
      params.push(String(category))
    }

    if (id) {
      const ids = (Array.isArray(id) ? id : [id])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))

      if (ids.length > 0) {
        if (ids.length === 1) {
          filters.push(`id = $${params.length + 1}`)
          params.push(ids[0])
        } else {
          filters.push(`id = ANY($${params.length + 1}::int[])`)
          params.push(ids)
        }
      }
    }

    if (filters.length > 0) {
      query += ` WHERE ${filters.join(' AND ')}`
    }

    const result = await pool.query(query, params)

    res.json(
      result.rows.map((product) => ({
        ...product,
        price: Number(product.price),
        rating: Number(product.rating),
      }))
    )
  } catch (error) {
    res.status(500).json({ message: 'Products fetch failed', error: error.message })
  }
})

router.get('/products/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id])

  if (!result.rowCount) {
    return res.status(404).json({ message: 'Product not found' })
  }

  res.json({ ...result.rows[0], price: Number(result.rows[0].price) })
})

export default router
