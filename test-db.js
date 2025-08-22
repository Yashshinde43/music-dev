import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'Set' : 'Not set');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set!');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Test basic connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0]);
    
    // Check if tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Tables found:', tables.rows.map(r => r.table_name));
    
    // Test admin creation
    const testAdmin = await pool.query(`
      INSERT INTO admins (username, password, display_name, unique_code)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
      RETURNING id, username
    `, ['testadmin', 'testpass', 'Test Admin', 'test123']);
    
    if (testAdmin.rows.length > 0) {
      console.log('✅ Test admin created:', testAdmin.rows[0]);
    } else {
      console.log('ℹ️ Test admin already exists');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();
