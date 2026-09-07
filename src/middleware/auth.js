import jwt from 'jsonwebtoken'

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey')
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  next()
}
