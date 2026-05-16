import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSQLFile(connection, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  // Split by semicolon, but ignore semicolons inside strings.
  // A simpler approach for these specific files: execute as multiple statements if supported,
  // or split by statements.
  // We'll enable multipleStatements when creating the connection.
  console.log(`Executing ${path.basename(filePath)}...`);
  try {
    await connection.query(sql);
    console.log(`Successfully executed ${path.basename(filePath)}`);
  } catch (err) {
    console.error(`Error executing ${path.basename(filePath)}:`, err.message);
  }
}

async function main() {
  console.log('Connecting to MySQL...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    await runSQLFile(pool, path.join(__dirname, '..', 'database', 'bid_brilliance.sql'));
    await runSQLFile(pool, path.join(__dirname, '..', 'database', 'insert_test_data.sql'));
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
    console.log('Database setup complete.');
  }
}

main();
