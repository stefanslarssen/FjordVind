const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function updatePassword() {
  try {
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash('Test1234!', salt);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
      [password_hash, 'test@test.no']
    );

    if (result.rows.length > 0) {
      console.log('Password updated for:', result.rows[0].email);
    } else {
      console.log('User not found');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updatePassword();
