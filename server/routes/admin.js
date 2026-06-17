const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// Middleware to ensure the user is an Administrator (strictly admin)
const adminOnlyMiddleware = (req, res, next) => {
  if (req.user && req.user.priv_admin === 'Y') {
    next();
  } else {
    res.status(403).json({ message: 'Akses ditolak. Menu ini hanya terbuka untuk Administrator.' });
  }
};

// Middleware to check access for a specific module based on DB group permissions
const checkModuleAccess = (moduleName, action = 'access') => {
  return async (req, res, next) => {
    // If the user is a full Administrator, they have all access
    if (req.user && req.user.priv_admin === 'Y') {
      return next();
    }
    
    // Otherwise, check in the database if the user has permission for this module
    try {
      const [perms] = await pool.query(
        `SELECT MAX(CASE WHEN priv_access = 'Y' THEN 1 ELSE 0 END) as has_access,
                MAX(CASE WHEN priv_insert = 'Y' THEN 1 ELSE 0 END) as has_insert,
                MAX(CASE WHEN priv_update = 'Y' THEN 1 ELSE 0 END) as has_update,
                MAX(CASE WHEN priv_delete = 'Y' THEN 1 ELSE 0 END) as has_delete
         FROM sec_users_groups ug
         JOIN sec_groups_apps ga ON ug.group_id = ga.group_id
         WHERE ug.login = ? AND ga.app_name = ?`,
        [req.user.login, moduleName]
      );
      
      const p = perms[0];
      let allowed = false;
      if (action === 'access') allowed = p && p.has_access === 1;
      else if (action === 'insert') allowed = p && p.has_insert === 1;
      else if (action === 'update') allowed = p && p.has_update === 1;
      else if (action === 'delete') allowed = p && p.has_delete === 1;
      
      if (allowed) {
        next();
      } else {
        res.status(403).json({ message: `Akses ditolak. Anda tidak memiliki izin '${action}' untuk modul '${moduleName}'.` });
      }
    } catch (err) {
      console.error(`Check Module Access Error (${moduleName}, ${action}):`, err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

router.use(authMiddleware);

// ==========================================
// 1. CRUD FOR distribusiqurban
// ==========================================

// GET List of Distribusi Qurban (with search, pagination)
router.get('/distribusi-qurban', checkModuleAccess('distribusi-qurban', 'access'), async (req, res) => {
  const { search, year, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let sqlConditions = [];
    let params = [];

    if (search) {
      sqlConditions.push('(wilayahdistribusi LIKE ? OR prov LIKE ? OR kab LIKE ? OR kec LIKE ? OR kel LIKE ? OR user_pj LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    if (year) {
      sqlConditions.push(`
        (CASE 
          WHEN timeAdded LIKE '__/__/____%' THEN SUBSTRING(timeAdded, 7, 4)
          WHEN timeAdded LIKE '____-__-%' THEN SUBSTRING(timeAdded, 1, 4)
          ELSE NULL
        END) = ?
      `);
      params.push(String(year));
    }

    const whereClause = sqlConditions.length > 0 ? `WHERE ${sqlConditions.join(' AND ')}` : '';

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM distribusiqurban ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const [items] = await pool.query(
      `SELECT * FROM distribusiqurban ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ total, data: items, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Fetch Admin Distribusi Qurban Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST Create Distribusi Qurban
router.post('/distribusi-qurban', checkModuleAccess('distribusi-qurban', 'insert'), async (req, res) => {
  const data = req.body;
  
  // Generate ID in format WIL-YYMMDD-RANDOM 6DIGIT if not provided
  const generateId = () => {
    const date = new Date();
    const yy = date.getFullYear().toString().slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(100000 + Math.random() * 900000).toString();
    return `WIL-${yy}${mm}${dd}-${random}`;
  };
  const id = data.id || generateId();
  const office = data.office || '';
  const pm = data.pm || '';
  const alamatid = data.alamatid || null;
  const prov = data.prov || '';
  const kab = data.kab || '';
  const kec = data.kec || '';
  const kel = data.kel || '';
  const wilayahdistribusi = data.wilayahdistribusi || '';
  const timeAdded = data.timeAdded || new Date().toISOString();
  const users = req.user.login;
  const user_pj = data.user_pj || '';
  const status_potong = data.status_potong || '';
  const status = data.status || 'ON';
  const quota = parseInt(data.quota || 0);
  const tersedia = parseInt(data.tersedia !== undefined ? data.tersedia : (data.quota || 0));

  try {
    await pool.query(
      `INSERT INTO distribusiqurban 
      (id, office, pm, alamatid, prov, kab, kec, kel, wilayahdistribusi, timeAdded, users, user_pj, status_potong, status, quota, tersedia) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, office, pm, alamatid, prov, kab, kec, kel, wilayahdistribusi, timeAdded, users, user_pj, status_potong, status, quota, tersedia]
    );
    res.status(201).json({ message: 'Titik distribusi qurban berhasil dibuat', id });
  } catch (err) {
    console.error('Create Distribusi Qurban Error:', err);
    res.status(400).json({ message: err.message || 'Internal server error' });
  }
});

// PUT Update Distribusi Qurban
router.put('/distribusi-qurban/:id', checkModuleAccess('distribusi-qurban', 'update'), async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const fieldsToUpdate = [];
    const params = [];

    const allowedFields = [
      'office', 'pm', 'alamatid', 'prov', 'kab', 'kec', 'kel', 
      'wilayahdistribusi', 'user_pj', 'status_potong', 'status', 'quota', 'tersedia'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fieldsToUpdate.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    const [result] = await pool.query(
      `UPDATE distribusiqurban SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    res.json({ message: 'Titik distribusi qurban berhasil diperbarui' });
  } catch (err) {
    console.error('Update Distribusi Qurban Error:', err);
    res.status(400).json({ message: err.message || 'Internal server error' });
  }
});

// DELETE Distribusi Qurban
router.delete('/distribusi-qurban/:id', checkModuleAccess('distribusi-qurban', 'delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM distribusiqurban WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Titik distribusi qurban berhasil dihapus' });
  } catch (err) {
    console.error('Delete Distribusi Qurban Error:', err);
    res.status(400).json({ message: err.message || 'Internal server error' });
  }
});


// ==========================================
// 2. CRUD FOR tbl_program
// ==========================================

// GET List of Program
router.get('/program', checkModuleAccess('tbl-program', 'access'), async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let sqlConditions = [];
    let params = [];

    if (search) {
      sqlConditions.push('(IDPROGRAM LIKE ? OR PROGRAM_NAME LIKE ? OR SUB_PROGRAM LIKE ? OR DETAIL_PRORAM LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    const whereClause = sqlConditions.length > 0 ? `WHERE ${sqlConditions.join(' AND ')}` : '';

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM tbl_program ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const [items] = await pool.query(
      `SELECT * FROM tbl_program ${whereClause} ORDER BY IDPROGRAM DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ total, data: items, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Fetch Admin Program Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST Create Program
router.post('/program', checkModuleAccess('tbl-program', 'insert'), async (req, res) => {
  const data = req.body;
  const id = data.IDPROGRAM || `PROG-${Math.floor(100000 + Math.random() * 900000)}`;
  const name = data.PROGRAM_NAME || '';
  const sub = data.SUB_PROGRAM || '';
  const detail = data.DETAIL_PRORAM || '';
  const notes = data.NOTES || '';
  const sdgs = data.SDGS || '';
  const status = data.STATUS || 'ON';
  const regDate = data.REG_DATE || new Date();

  try {
    await pool.query(
      `INSERT INTO tbl_program 
      (IDPROGRAM, PROGRAM_NAME, SUB_PROGRAM, DETAIL_PRORAM, NOTES, SDGS, STATUS, REG_DATE) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, sub, detail, notes, sdgs, status, regDate]
    );
    res.status(201).json({ message: 'Program berhasil dibuat', IDPROGRAM: id });
  } catch (err) {
    console.error('Create Program Error:', err);
    res.status(400).json({ message: err.message || 'Internal server error' });
  }
});

// PUT Update Program
router.put('/program/:id', checkModuleAccess('tbl-program', 'update'), async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const fieldsToUpdate = [];
    const params = [];

    const allowedFields = ['PROGRAM_NAME', 'SUB_PROGRAM', 'DETAIL_PRORAM', 'NOTES', 'SDGS', 'STATUS', 'OFF_DATE'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fieldsToUpdate.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    const [result] = await pool.query(
      `UPDATE tbl_program SET ${fieldsToUpdate.join(', ')} WHERE IDPROGRAM = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    res.json({ message: 'Program berhasil diperbarui' });
  } catch (err) {
    console.error('Update Program Error:', err);
    res.status(400).json({ message: err.message || 'Internal server error' });
  }
});

// DELETE Program
router.delete('/program/:id', checkModuleAccess('tbl-program', 'delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM tbl_program WHERE IDPROGRAM = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Program berhasil dihapus' });
  } catch (err) {
    console.error('Delete Program Error:', err);
    res.status(400).json({ message: err.message || 'Internal server error' });
  }
});


// ==========================================
// 3. CRUD FOR data_provinsi
// ==========================================

// GET List of Provinsi Address
router.get('/provinsi', checkModuleAccess('data-provinsi', 'access'), async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let sqlConditions = [];
    let params = [];

    if (search) {
      sqlConditions.push('(provinsi LIKE ? OR kabupaten_kota LIKE ? OR kecamatan LIKE ? OR desa_kelurahan LIKE ? OR kode_pos LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    const whereClause = sqlConditions.length > 0 ? `WHERE ${sqlConditions.join(' AND ')}` : '';

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM data_provinsi ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const [items] = await pool.query(
      `SELECT * FROM data_provinsi ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ total, data: items, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Fetch Admin Provinsi Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST Create Provinsi
router.post('/provinsi', checkModuleAccess('data-provinsi', 'insert'), async (req, res) => {
  const data = req.body;
  const provinsi = data.provinsi || '';
  const kabupaten_kota = data.kabupaten_kota || '';
  const kecamatan = data.kecamatan || '';
  const desa_kelurahan = data.desa_kelurahan || '';
  const kode_pos = data.kode_pos || '';
  const tahun = data.tahun || new Date().getFullYear().toString();

  try {
    const [result] = await pool.query(
      `INSERT INTO data_provinsi 
      (provinsi, kabupaten_kota, kecamatan, desa_kelurahan, kode_pos, tahun) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [provinsi, kabupaten_kota, kecamatan, desa_kelurahan, kode_pos, tahun]
    );
    res.status(201).json({ message: 'Data provinsi wilayah berhasil dibuat', id: result.insertId });
  } catch (err) {
    console.error('Create Provinsi Error:', err);
    res.status(400).json({ message: err.message || 'Internal server error' });
  }
});

// PUT Update Provinsi
router.put('/provinsi/:id', checkModuleAccess('data-provinsi', 'update'), async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const fieldsToUpdate = [];
    const params = [];

    const allowedFields = ['provinsi', 'kabupaten_kota', 'kecamatan', 'desa_kelurahan', 'kode_pos', 'tahun'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fieldsToUpdate.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    const [result] = await pool.query(
      `UPDATE data_provinsi SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    res.json({ message: 'Data provinsi wilayah berhasil diperbarui' });
  } catch (err) {
    console.error('Update Provinsi Error:', err);
    res.status(400).json({ message: err.message || 'Internal server error' });
  }
});

// DELETE Provinsi
router.delete('/provinsi/:id', checkModuleAccess('data-provinsi', 'delete'), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM data_provinsi WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Data provinsi wilayah berhasil dihapus' });
  } catch (err) {
    console.error('Delete Provinsi Error:', err);
    res.status(400).json({ message: err.message || 'Internal server error' });
  }
});

// ==========================================
// 4. DEPENDENT LOCATION SEARCH ENDPOINTS
// ==========================================

// Get distinct Provinces
router.get('/locations/provinces', async (req, res) => {
  const { search } = req.query;
  try {
    let sql = 'SELECT DISTINCT provinsi FROM data_provinsi';
    let params = [];
    if (search) {
      sql += ' WHERE provinsi LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY provinsi ASC LIMIT 50';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => r.provinsi));
  } catch (err) {
    console.error('Fetch Provinces Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get distinct Regencies
router.get('/locations/regencies', async (req, res) => {
  const { province, search } = req.query;
  try {
    let sql = 'SELECT DISTINCT kabupaten_kota FROM data_provinsi WHERE provinsi = ?';
    let params = [province || ''];
    if (search) {
      sql += ' AND kabupaten_kota LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY kabupaten_kota ASC LIMIT 50';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => r.kabupaten_kota));
  } catch (err) {
    console.error('Fetch Regencies Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get distinct Districts
router.get('/locations/districts', async (req, res) => {
  const { province, regency, search } = req.query;
  try {
    let sql = 'SELECT DISTINCT kecamatan FROM data_provinsi WHERE provinsi = ? AND kabupaten_kota = ?';
    let params = [province || '', regency || ''];
    if (search) {
      sql += ' AND kecamatan LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY kecamatan ASC LIMIT 50';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => r.kecamatan));
  } catch (err) {
    console.error('Fetch Districts Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get distinct Villages
router.get('/locations/villages', async (req, res) => {
  const { province, regency, district, search } = req.query;
  try {
    let sql = 'SELECT DISTINCT desa_kelurahan FROM data_provinsi WHERE provinsi = ? AND kabupaten_kota = ? AND kecamatan = ?';
    let params = [province || '', regency || '', district || ''];
    if (search) {
      sql += ' AND desa_kelurahan LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY desa_kelurahan ASC LIMIT 50';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(r => r.desa_kelurahan));
  } catch (err) {
    console.error('Fetch Villages Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search users by login or name (for PJ Lapangan configuration selection)
router.get('/users/search', async (req, res) => {
  const { search } = req.query;
  try {
    let sql = 'SELECT login, name FROM sec_users';
    let params = [];
    if (search) {
      sql += ' WHERE login LIKE ? OR name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY name ASC LIMIT 50';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Search Users Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================
// USER MANAGEMENT & ROLE-BASED ACCESS CONTROL (RBAC)
// ==========================================

// Get list of all users from sec_users with search, pagination, and their associated groups
router.get('/users', adminOnlyMiddleware, async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let sqlConditions = [];
    let params = [];

    if (search) {
      sqlConditions.push('(u.login LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    const whereClause = sqlConditions.length > 0 ? `WHERE ${sqlConditions.join(' AND ')}` : '';

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM sec_users u ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Fetch users with GROUP_CONCAT of their group IDs
    const [items] = await pool.query(
      `SELECT u.login, u.name, u.email, u.office, u.active, u.priv_admin,
              (SELECT GROUP_CONCAT(ug.group_id) FROM sec_users_groups ug WHERE ug.login = u.login) as group_ids
       FROM sec_users u
       ${whereClause}
       ORDER BY u.name ASC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Format group_ids as array of numbers
    const formattedItems = items.map(user => ({
      ...user,
      group_ids: user.group_ids ? user.group_ids.split(',').map(Number) : []
    }));

    res.json({ total, data: formattedItems, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Fetch Users Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new user in sec_users and their groups in sec_users_groups
router.post('/users', adminOnlyMiddleware, async (req, res) => {
  const { login, pswd, name, email, office, active, priv_admin, group_ids } = req.body;

  if (!login || !pswd) {
    return res.status(400).json({ message: 'Username (login) and Password are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if user already exists
    const [existing] = await conn.query('SELECT login FROM sec_users WHERE login = ?', [login]);
    if (existing.length > 0) {
      return res.status(400).json({ message: `Username '${login}' sudah terdaftar.` });
    }

    // Insert user
    await conn.query(
      `INSERT INTO sec_users (login, pswd, name, email, office, active, priv_admin) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [login, pswd, name || '', email || '', office || null, active || 'Y', priv_admin || '']
    );

    // Insert group associations if any
    if (Array.isArray(group_ids) && group_ids.length > 0) {
      for (const groupId of group_ids) {
        await conn.query('INSERT INTO sec_users_groups (login, group_id) VALUES (?, ?)', [login, groupId]);
      }
    }

    await conn.commit();
    res.status(201).json({ message: 'User berhasil dibuat' });
  } catch (err) {
    await conn.rollback();
    console.error('Create User Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// Update user details
router.put('/users/:login', adminOnlyMiddleware, async (req, res) => {
  const { login } = req.params;
  const { pswd, name, email, office, active, priv_admin, group_ids } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if user exists
    const [existing] = await conn.query('SELECT login FROM sec_users WHERE login = ?', [login]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Update user (if password is not empty, update it)
    if (pswd) {
      await conn.query(
        `UPDATE sec_users SET pswd = ?, name = ?, email = ?, office = ?, active = ?, priv_admin = ? WHERE login = ?`,
        [pswd, name || '', email || '', office || null, active || 'Y', priv_admin || '', login]
      );
    } else {
      await conn.query(
        `UPDATE sec_users SET name = ?, email = ?, office = ?, active = ?, priv_admin = ? WHERE login = ?`,
        [name || '', email || '', office || null, active || 'Y', priv_admin || '', login]
      );
    }

    // Update group associations: clear and re-insert
    await conn.query('DELETE FROM sec_users_groups WHERE login = ?', [login]);
    if (Array.isArray(group_ids) && group_ids.length > 0) {
      for (const groupId of group_ids) {
        await conn.query('INSERT INTO sec_users_groups (login, group_id) VALUES (?, ?)', [login, groupId]);
      }
    }

    await conn.commit();
    res.json({ message: 'User berhasil diperbarui' });
  } catch (err) {
    await conn.rollback();
    console.error('Update User Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// Delete user
router.delete('/users/:login', adminOnlyMiddleware, async (req, res) => {
  const { login } = req.params;

  if (req.user.login === login) {
    return res.status(400).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query('DELETE FROM sec_users_groups WHERE login = ?', [login]);
    await conn.query('DELETE FROM sec_users WHERE login = ?', [login]);

    await conn.commit();
    res.json({ message: 'User berhasil dihapus' });
  } catch (err) {
    await conn.rollback();
    console.error('Delete User Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// Get list of groups / roles
router.get('/groups', adminOnlyMiddleware, async (req, res) => {
  try {
    const [groups] = await pool.query('SELECT group_id, description FROM sec_groups ORDER BY group_id ASC');
    res.json(groups);
  } catch (err) {
    console.error('Fetch Groups Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Predefined modules in Quasar client
const APP_MODULES = [
  { app_name: 'dashboard', description: 'Dashboard Penyaluran' },
  { app_name: 'qurban-dashboard', description: 'Dashboard Qurban' },
  { app_name: 'mustahik', description: 'Data Mustahik' },
  { app_name: 'penyaluran', description: 'Pengajuan' },
  { app_name: 'verifikasi-penyaluran', description: 'Verifikasi' },
  { app_name: 'qurban', description: 'Manajemen Qurban' },
  { app_name: 'distribusi-qurban', description: 'Pengaturan Titik Qurban' },
  { app_name: 'tbl-program', description: 'Pengaturan Program' },
  { app_name: 'data-provinsi', description: 'Pengaturan Provinsi' }
];

// Get permissions for a specific group
router.get('/groups/:groupId/permissions', adminOnlyMiddleware, async (req, res) => {
  const { groupId } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT app_name, priv_access, priv_insert, priv_update, priv_delete FROM sec_groups_apps WHERE group_id = ?',
      [groupId]
    );

    // Map database values to our 9 application modules with CRUD permissions
    const permissions = {};
    APP_MODULES.forEach(mod => {
      const dbRow = rows.find(r => r.app_name === mod.app_name);
      permissions[mod.app_name] = {
        access: dbRow ? dbRow.priv_access === 'Y' : false,
        insert: dbRow ? dbRow.priv_insert === 'Y' : false,
        update: dbRow ? dbRow.priv_update === 'Y' : false,
        delete: dbRow ? dbRow.priv_delete === 'Y' : false
      };
    });

    res.json({
      groupId: parseInt(groupId),
      modules: APP_MODULES,
      permissions
    });
  } catch (err) {
    console.error('Fetch Group Permissions Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update permissions for a specific group
router.post('/groups/:groupId/permissions', adminOnlyMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { permissions } = req.body; // Object: { [appName]: { access, insert, update, delete } }

  if (!permissions) {
    return res.status(400).json({ message: 'Permissions object is required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const [appName, perms] of Object.entries(permissions)) {
      const privAccess = perms.access ? 'Y' : '';
      const privInsert = perms.insert ? 'Y' : '';
      const privUpdate = perms.update ? 'Y' : '';
      const privDelete = perms.delete ? 'Y' : '';
      
      // Make sure it is registered in sec_apps table first to satisfy foreign key constraints
      await conn.query(
        `INSERT IGNORE INTO sec_apps (app_name, app_type) VALUES (?, 'vue-page')`,
        [appName]
      );

      // Then upsert into sec_groups_apps
      await conn.query(
        `INSERT INTO sec_groups_apps (group_id, app_name, priv_access, priv_insert, priv_update, priv_delete) 
         VALUES (?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE priv_access = ?, priv_insert = ?, priv_update = ?, priv_delete = ?`,
        [groupId, appName, privAccess, privInsert, privUpdate, privDelete, privAccess, privInsert, privUpdate, privDelete]
      );
    }

    await conn.commit();
    res.json({ message: 'Akses modul berhasil diperbarui' });
  } catch (err) {
    await conn.rollback();
    console.error('Update Group Permissions Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;
