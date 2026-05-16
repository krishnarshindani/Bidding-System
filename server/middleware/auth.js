// server/middleware/auth.js
import jwt from 'jsonwebtoken';

export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_here');
    return decoded;
  } catch (error) {
    return null;
  }
};

export const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'secret_key_here',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Socket.IO middleware for authentication
export const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error('Invalid token'));
  }

  socket.userId = decoded.userId;
  socket.email = decoded.email;
  next();
};
