import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as queries from '../services/queries.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    // Check if user already exists
    const existingUser = await queries.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Map frontend role to DB user_type
    let userType = 'buyer';
    if (role === 'seller') userType = 'seller';
    else if (role === 'admin') userType = 'admin';

    // Create user in database
    const userId = await queries.createUser({
      email,
      username: name,
      passwordHash,
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || '',
      userType,
    });

    // Assign initial credits to bidders
    if (userType === 'buyer') {
      await queries.addCredits(userId, 500, 'initial_assignment', null, null, 'Welcome bonus credits');
    }

    // Get the created user
    const user = await queries.getUserById(userId);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.user_type },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    // Map DB user_type to frontend role
    let frontendRole = 'bidder';
    if (user.user_type === 'seller') frontendRole = 'seller';
    else if (user.user_type === 'admin') frontendRole = 'admin';

    res.status(201).json({
      success: true,
      token,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.username,
        role: frontendRole,
        credits: parseFloat(user.credits) || 0,
      },
    });

    console.log(`✓ User registered: ${user.username} (${user.email}) as ${user.user_type}`);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await queries.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check account status
    if (user.account_status !== 'active') {
      return res.status(403).json({ error: 'Your account has been suspended or deactivated' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.user_type },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    // Update last login
    try {
      await queries.updateLastLogin(user.id);
    } catch (e) {
      // Non-critical, continue
    }

    // Map DB user_type to frontend role
    let frontendRole = 'bidder';
    if (user.user_type === 'seller') frontendRole = 'seller';
    else if (user.user_type === 'admin') frontendRole = 'admin';

    res.json({
      success: true,
      token,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.username,
        role: frontendRole,
        credits: parseFloat(user.credits) || 0,
      },
    });

    console.log(`✓ User logged in: ${user.username} (${user.email})`);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// GET /api/auth/me - Get current user from JWT
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await queries.getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Map DB user_type to frontend role
    let frontendRole = 'bidder';
    if (user.user_type === 'seller') frontendRole = 'seller';
    else if (user.user_type === 'admin') frontendRole = 'admin';

    res.json({
      id: String(user.id),
      email: user.email,
      name: user.username,
      role: frontendRole,
      credits: parseFloat(user.credits) || 0,
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
