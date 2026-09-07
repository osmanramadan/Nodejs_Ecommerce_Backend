import pool from '../config/db.js'

const initDb = async () => {
  const client = await pool.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        image TEXT
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        rating NUMERIC(3,1) DEFAULT 0,
        review_count INT DEFAULT 0,
        image TEXT,
        badge VARCHAR(50),
        in_stock BOOLEAN DEFAULT true,
        num_in_stock INT DEFAULT 0
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id INT NOT NULL,
        UNIQUE (user_id, product_id)
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        items JSONB NOT NULL,
        total NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'pending'
      );
    `)

    console.log('Database tables ready')
  } finally {
    client.release()
    await pool.end()
  }
}

initDb().catch((err) => {
  console.error('DB init failed:', err)
  process.exit(1)
})
