const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { getOfficeQueryFilter } = require('../utils/helpers');

const dbOthers = process.env.DB_OTHERS || 'mycrm_dev';

// GET /api/offices
router.get('/', authMiddleware, async (req, res) => {
  try {
    const officeFilter = getOfficeQueryFilter(req.user, 'officeid');
    const sql = `
      SELECT officeid, kantor, kota, alamat 
      FROM ${dbOthers}.tbl_office 
      WHERE ${officeFilter.sql}
      ORDER BY officeid ASC
    `;
    const [offices] = await pool.query(sql, officeFilter.params);
    const formattedOffices = offices.map(o => ({
      ...o,
      kantor: `${o.officeid} - ${o.kantor}`
    }));
    res.json(formattedOffices);
  } catch (err) {
    console.error('Fetch Offices Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
