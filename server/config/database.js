import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bid_brilliance',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✓ MySQL connection successful');
    connection.release();
  })
  .catch(error => {
    console.error('✗ MySQL connection failed:', error.message);
    process.exit(1);
  });

export default pool;
