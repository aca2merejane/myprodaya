const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const dbOthers = process.env.DB_OTHERS || 'mycrm_dev';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function getUserModules(user) {
  if (user.priv_admin === 'Y') {
    const allPerms = {};
    const modulesList = [
      'dashboard', 'qurban-dashboard', 'mustahik', 'penyaluran', 
      'verifikasi-penyaluran', 'qurban', 'distribusi-qurban', 
      'tbl-program', 'data-provinsi'
    ];
    modulesList.forEach(m => {
      allPerms[m] = { access: true, insert: true, update: true, delete: true };
    });
    return allPerms;
  }

  const [perms] = await pool.query(
    `SELECT app_name, 
            MAX(CASE WHEN priv_access = 'Y' THEN 1 ELSE 0 END) as has_access,
            MAX(CASE WHEN priv_insert = 'Y' THEN 1 ELSE 0 END) as has_insert,
            MAX(CASE WHEN priv_update = 'Y' THEN 1 ELSE 0 END) as has_update,
            MAX(CASE WHEN priv_delete = 'Y' THEN 1 ELSE 0 END) as has_delete
     FROM sec_users_groups ug
     JOIN sec_groups_apps ga ON ug.group_id = ga.group_id
     WHERE ug.login = ?
     GROUP BY app_name`,
    [user.login]
  );

  const userPermissions = {};
  perms.forEach(p => {
    userPermissions[p.app_name] = {
      access: p.has_access === 1,
      insert: p.has_insert === 1,
      update: p.has_update === 1,
      delete: p.has_delete === 1
    };
  });
  return userPermissions;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username/Email and Password are required' });
  }

  try {
    // Query by login or email
    const [users] = await pool.query(
      'SELECT * FROM sec_users WHERE login = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if user is active
    if (user.active !== 'Y') {
      return res.status(403).json({ message: 'User account is inactive' });
    }

    // Direct password check (passwords are stored in plain text in database)
    if (user.pswd !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Get office details if any
    let officeName = '';
    if (user.office) {
      const [offices] = await pool.query(
        `SELECT kantor FROM ${dbOthers}.tbl_office WHERE officeid = ?`,
        [user.office]
      );
      if (offices.length > 0) {
        officeName = offices[0].kantor;
      }
    }

    // Fetch user permissions
    const allowedModules = await getUserModules(user);

    // Generate JWT
    const payload = {
      login: user.login,
      email: user.email,
      name: user.name,
      office: user.office,
      officeName,
      priv_admin: user.priv_admin
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'bmh_myprodaya_secret_key_9988', {
      expiresIn: '24h'
    });

    res.json({
      token,
      user: {
        ...payload,
        modules: allowedModules
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/google
router.post('/google-login', async (req, res) => {
  const { idToken, email: testEmail } = req.body; // testEmail for fallback testing

  if (!idToken && !testEmail) {
    return res.status(400).json({ message: 'Google ID token is required' });
  }

  try {
    let email = testEmail;

    if (idToken) {
      if (process.env.GOOGLE_CLIENT_ID) {
        const ticket = await client.verifyIdToken({
          idToken: idToken,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        email = payload.email;
      } else {
        // Fallback for development if client ID is not set: decode without verification
        const decoded = jwt.decode(idToken);
        if (decoded && decoded.email) {
          email = decoded.email;
        } else {
          email = idToken; // Assume plain email was passed in ID token field
        }
      }
    }

    if (!email) {
      return res.status(400).json({ message: 'Could not retrieve email from Google token' });
    }

    const [users] = await pool.query(
      'SELECT * FROM sec_users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: `Email ${email} is not registered in our system.` });
    }

    const user = users[0];

    if (user.active !== 'Y') {
      return res.status(403).json({ message: 'User account is inactive' });
    }

    let officeName = '';
    if (user.office) {
      const [offices] = await pool.query(
        `SELECT kantor FROM ${dbOthers}.tbl_office WHERE officeid = ?`,
        [user.office]
      );
      if (offices.length > 0) {
        officeName = offices[0].kantor;
      }
    }

    // Fetch user permissions
    const allowedModules = await getUserModules(user);

    // Generate JWT
    const payload = {
      login: user.login,
      email: user.email,
      name: user.name,
      office: user.office,
      officeName,
      priv_admin: user.priv_admin
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'bmh_myprodaya_secret_key_9988', {
      expiresIn: '24h'
    });

    res.json({
      token,
      user: {
        ...payload,
        modules: allowedModules
      }
    });
  } catch (err) {
    console.error('Google Login Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/auth/me (Get current user info)
const authMiddleware = require('../middleware/auth');
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM sec_users WHERE login = ?', [req.user.login]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = users[0];

    let officeName = '';
    if (user.office) {
      const [offices] = await pool.query(
        `SELECT kantor FROM ${dbOthers}.tbl_office WHERE officeid = ?`,
        [user.office]
      );
      if (offices.length > 0) {
        officeName = offices[0].kantor;
      }
    }

    const allowedModules = await getUserModules(user);
    res.json({
      user: {
        login: user.login,
        email: user.email,
        name: user.name,
        office: user.office,
        officeName,
        priv_admin: user.priv_admin,
        modules: allowedModules
      }
    });
  } catch (err) {
    console.error('Fetch Me Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
