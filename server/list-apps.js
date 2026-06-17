const pool = require('./db');
require('dotenv').config({ path: '../.env' });

async function run() {
  try {
    const [apps] = await pool.query('SELECT * FROM sec_apps');
    console.log('--- ALL APPS IN sec_apps ---');
    console.log(apps);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
