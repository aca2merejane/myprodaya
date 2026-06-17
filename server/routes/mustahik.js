const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { getOfficeQueryFilter } = require('../utils/helpers');

// Simple coordinates mapping for Indonesian provinces for map rendering
const provinceCoordinates = {
  'ACEH': { lat: 4.6951, lng: 96.7494 },
  'SUMATERA UTARA': { lat: 2.1121, lng: 99.3982 },
  'SUMATERA BARAT': { lat: -0.7399, lng: 100.8000 },
  'RIAU': { lat: 0.5074, lng: 101.5408 },
  'JAMBI': { lat: -1.6101, lng: 103.6131 },
  'SUMATERA SELATAN': { lat: -3.3194, lng: 104.9145 },
  'BENGKULU': { lat: -3.7928, lng: 102.2608 },
  'LAMPUNG': { lat: -4.5586, lng: 105.4000 },
  'KEPULAUAN BANGKA BELITUNG': { lat: -2.7410, lng: 106.4406 },
  'KEPULAUAN RIAU': { lat: 3.9457, lng: 108.1429 },
  'DKI JAKARTA': { lat: -6.2088, lng: 106.8456 },
  'JAKARTA': { lat: -6.2088, lng: 106.8456 },
  'JAWA BARAT': { lat: -7.0909, lng: 107.6689 },
  'JAWA TENGAH': { lat: -7.1510, lng: 110.1402 },
  'DI YOGYAKARTA': { lat: -7.8753, lng: 110.4262 },
  'YOGYAKARTA': { lat: -7.8753, lng: 110.4262 },
  'JAWA TIMUR': { lat: -7.5360, lng: 112.2331 },
  'BANTEN': { lat: -6.4058, lng: 106.0640 },
  'BALI': { lat: -8.4095, lng: 115.1889 },
  'NUSA TENGGARA BARAT': { lat: -8.6529, lng: 117.3616 },
  'NUSA TENGGARA TIMUR': { lat: -8.6573, lng: 121.0794 },
  'KALIMANTAN BARAT': { lat: -0.2788, lng: 111.4753 },
  'KALIMANTAN TENGAH': { lat: -1.6814, lng: 113.3824 },
  'KALIMANTAN SELATAN': { lat: -3.0926, lng: 115.2838 },
  'KALIMANTAN TIMUR': { lat: 1.6406, lng: 116.4194 },
  'KALIMANTAN UTARA': { lat: 3.0731, lng: 116.0414 },
  'SULAWESI UTARA': { lat: 0.6247, lng: 123.9750 },
  'SULAWESI TENGAH': { lat: -1.4300, lng: 121.4456 },
  'SULAWESI SELATAN': { lat: -3.6687, lng: 119.9740 },
  'SULAWESI TENGGARA': { lat: -4.1449, lng: 122.1746 },
  'GORONTALO': { lat: 0.6999, lng: 122.4467 },
  'SULAWESI BARAT': { lat: -2.8441, lng: 119.2321 },
  'MALUKU': { lat: -3.2385, lng: 130.1453 },
  'MALUKU UTARA': { lat: 1.5700, lng: 127.8000 },
  'PAPUA': { lat: -4.2699, lng: 138.0803 },
  'PAPUA BARAT': { lat: -1.3361, lng: 132.9000 },
  'PAPUA SELATAN': { lat: -7.5000, lng: 139.5000 },
  'PAPUA TENGAH': { lat: -4.0000, lng: 136.0000 },
  'PAPUA PEGUNUNGAN': { lat: -4.5000, lng: 139.0000 },
  'PAPUA BARAT DAYA': { lat: -1.1500, lng: 131.5000 }
};

function getMustahikCoordinates(prov, idm) {
  const normProv = (prov || '').toUpperCase().trim();
  const coords = provinceCoordinates[normProv] || { lat: -6.2088, lng: 106.8456 }; // Default to Jakarta
  
  // Use idm or random generation to seed a deterministic jitter so points for the same mustahik stay in the same place
  let hash = 0;
  for (let i = 0; i < idm.length; i++) {
    hash = idm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const jitterLat = ((hash & 0xFF) / 255 - 0.5) * 0.15;
  const jitterLng = (((hash >> 8) & 0xFF) / 255 - 0.5) * 0.15;

  return {
    lat: coords.lat + jitterLat,
    lng: coords.lng + jitterLng
  };
}

// GET /api/mustahik (list mustahik with pagination & filters)
router.get('/', authMiddleware, async (req, res) => {
  const { name, status_aktif, office, prov, kab, year, asnaf, tipe, umum_khusus, kelamin, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const officeFilter = getOfficeQueryFilter(req.user, 'KANTOR');
    let sqlConditions = [officeFilter.sql];
    let params = [...officeFilter.params];

    if (name) {
      sqlConditions.push('NAMA_MUSTAHIK LIKE ?');
      params.push(`%${name}%`);
    }

    if (status_aktif) {
      sqlConditions.push('STATUS_AKTIF = ?');
      params.push(status_aktif);
    }

    if (office) {
      sqlConditions.push('KANTOR LIKE ?');
      params.push(`${office}%`);
    }

    if (prov) {
      sqlConditions.push('PROV = ?');
      params.push(prov);
    }

    if (kab) {
      sqlConditions.push('KAB LIKE ?');
      params.push(`%${kab}%`);
    }

    if (year) {
      sqlConditions.push('YEAR(REG_DATE) = ?');
      params.push(parseInt(year));
    }

    if (asnaf) {
      if (asnaf === 'Tidak Ditentukan') {
        sqlConditions.push('(ASNAF IS NULL OR ASNAF = \'\')');
      } else {
        sqlConditions.push('ASNAF = ?');
        params.push(asnaf);
      }
    }

    if (tipe) {
      if (tipe === 'Tidak Ditentukan') {
        sqlConditions.push('(TIPE IS NULL OR TIPE = \'\')');
      } else {
        sqlConditions.push('TIPE = ?');
        params.push(tipe);
      }
    }

    if (umum_khusus) {
      if (umum_khusus === 'Tidak Ditentukan') {
        sqlConditions.push('(UMUM_KHUSUS IS NULL OR UMUM_KHUSUS = \'\')');
      } else {
        sqlConditions.push('UMUM_KHUSUS = ?');
        params.push(umum_khusus);
      }
    }

    if (kelamin) {
      if (kelamin === 'Tidak Ditentukan') {
        sqlConditions.push('(KELAMIN IS NULL OR KELAMIN = \'\')');
      } else {
        sqlConditions.push('KELAMIN = ?');
        params.push(kelamin);
      }
    }

    const whereClause = sqlConditions.join(' AND ');

    // Get count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM mustahik WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get items
    const [items] = await pool.query(
      `SELECT * FROM mustahik WHERE ${whereClause} ORDER BY INSERT_DATE DESC, IDM DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Map items to include lat/lng for mapping
    const mappedItems = items.map(item => {
      const coords = getMustahikCoordinates(item.PROV, item.IDM);
      return {
        ...item,
        lat: coords.lat,
        lng: coords.lng
      };
    });

    res.json({
      total,
      data: mappedItems,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Fetch Mustahik Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/mustahik/map (retrieve all mustahik coordinate spread for mapping)
router.get('/map', authMiddleware, async (req, res) => {
  const { name, status_aktif, office, prov, kab, year, asnaf, tipe, umum_khusus, kelamin } = req.query;

  try {
    const officeFilter = getOfficeQueryFilter(req.user, 'KANTOR');
    let sqlConditions = [officeFilter.sql];
    let params = [...officeFilter.params];

    if (name) {
      sqlConditions.push('NAMA_MUSTAHIK LIKE ?');
      params.push(`%${name}%`);
    }

    if (status_aktif) {
      sqlConditions.push('STATUS_AKTIF = ?');
      params.push(status_aktif);
    }

    if (office) {
      sqlConditions.push('KANTOR LIKE ?');
      params.push(`${office}%`);
    }

    if (prov) {
      sqlConditions.push('PROV = ?');
      params.push(prov);
    }

    if (kab) {
      sqlConditions.push('KAB LIKE ?');
      params.push(`%${kab}%`);
    }

    if (year) {
      sqlConditions.push('YEAR(REG_DATE) = ?');
      params.push(parseInt(year));
    }

    if (asnaf) {
      if (asnaf === 'Tidak Ditentukan') {
        sqlConditions.push('(ASNAF IS NULL OR ASNAF = \'\')');
      } else {
        sqlConditions.push('ASNAF = ?');
        params.push(asnaf);
      }
    }

    if (tipe) {
      if (tipe === 'Tidak Ditentukan') {
        sqlConditions.push('(TIPE IS NULL OR TIPE = \'\')');
      } else {
        sqlConditions.push('TIPE = ?');
        params.push(tipe);
      }
    }

    if (umum_khusus) {
      if (umum_khusus === 'Tidak Ditentukan') {
        sqlConditions.push('(UMUM_KHUSUS IS NULL OR UMUM_KHUSUS = \'\')');
      } else {
        sqlConditions.push('UMUM_KHUSUS = ?');
        params.push(umum_khusus);
      }
    }

    if (kelamin) {
      if (kelamin === 'Tidak Ditentukan') {
        sqlConditions.push('(KELAMIN IS NULL OR KELAMIN = \'\')');
      } else {
        sqlConditions.push('KELAMIN = ?');
        params.push(kelamin);
      }
    }

    const whereClause = sqlConditions.join(' AND ');

    const [items] = await pool.query(
      `SELECT IDM, NAMA_MUSTAHIK, ALAMAT, KEL, KEC, KAB, PROV, KANTOR, STATUS_AKTIF, ASNAF, TIPE, UMUM_KHUSUS, KELAMIN 
       FROM mustahik 
       WHERE ${whereClause}`,
      params
    );

    const mapData = items.map(item => {
      const coords = getMustahikCoordinates(item.PROV, item.IDM);
      return {
        id: item.IDM,
        name: item.NAMA_MUSTAHIK,
        address: `${item.ALAMAT || ''}, Kel. ${item.KEL || ''}, Kec. ${item.KEC || ''}, ${item.KAB || ''}, ${item.PROV || ''}`,
        office: item.KANTOR,
        asnaf: item.ASNAF,
        status: item.STATUS_AKTIF,
        tipe: item.TIPE,
        umum_khusus: item.UMUM_KHUSUS,
        kelamin: item.KELAMIN,
        lat: coords.lat,
        lng: coords.lng
      };
    });

    res.json(mapData);
  } catch (err) {
    console.error('Fetch Mustahik Map Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/mustahik/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM mustahik WHERE IDM = ?', [req.params.id]);
    if (items.length === 0) {
      return res.status(404).json({ message: 'Mustahik not found' });
    }
    const item = items[0];
    const coords = getMustahikCoordinates(item.PROV, item.IDM);
    res.json({
      ...item,
      lat: coords.lat,
      lng: coords.lng
    });
  } catch (err) {
    console.error('Fetch Mustahik ID Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/mustahik
router.post('/', authMiddleware, async (req, res) => {
  const data = req.body;
  const IDM = 'MUS-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const regDate = new Date().toISOString().split('T')[0];

  try {
    const fields = [
      'IDM', 'REG_DATE', 'STATUS', 'TIPE', 'UMUM_KHUSUS', 'ASNAF', 
      'NAMA_MUSTAHIK', 'KELAMIN', 'PENERIMA_MANFAAT', 'ALAMAT', 
      'ALAMAT_DETAIL', 'KEL', 'KEC', 'KAB', 'PROV', 'TEMPAT_LAHIR', 
      'TGL_LAHIR', 'HP', 'EMAIL', 'NOTES', 'NKK', 'NIK_SIUP', 
      'FOTO', 'KTP', 'USER', 'INSERT_DATE', 'KANTOR', 'STATUS_AKTIF'
    ];

    const values = [
      IDM,
      regDate,
      data.STATUS || 'MASUK',
      data.TIPE || '',
      data.UMUM_KHUSUS || '',
      data.ASNAF || '',
      data.NAMA_MUSTAHIK || '',
      data.KELAMIN || '',
      data.PENERIMA_MANFAAT || 1,
      data.ALAMAT || '',
      data.ALAMAT_DETAIL || '',
      data.KEL || '',
      data.KEC || '',
      data.KAB || '',
      data.PROV || '',
      data.TEMPAT_LAHIR || '',
      data.TGL_LAHIR || null,
      data.HP || '',
      data.EMAIL || '',
      data.NOTES || '',
      data.NKK || '',
      data.NIK_SIUP || '',
      data.FOTO || '',
      data.KTP || '',
      req.user.login,
      new Date(),
      data.KANTOR || req.user.office || '',
      data.STATUS_AKTIF || 'ON'
    ];

    const placeholders = fields.map(() => '?').join(', ');
    await pool.query(
      `INSERT INTO mustahik (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );

    res.status(201).json({ message: 'Mustahik created successfully', id: IDM });
  } catch (err) {
    console.error('Create Mustahik Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/mustahik/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const data = req.body;
  
  try {
    const [existing] = await pool.query('SELECT KANTOR FROM mustahik WHERE IDM = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Mustahik not found' });
    }

    // Verify office hierarchy permission
    const officeFilter = getOfficeQueryFilter(req.user, 'KANTOR');
    // If it doesn't match office filter and they aren't admin, deny
    const [checkAccess] = await pool.query(
      `SELECT IDM FROM mustahik WHERE IDM = ? AND ${officeFilter.sql}`,
      [req.params.id, ...officeFilter.params]
    );
    if (checkAccess.length === 0) {
      return res.status(403).json({ message: 'You do not have access to edit this Mustahik' });
    }

    const updates = {
      STATUS: data.STATUS,
      TIPE: data.TIPE,
      UMUM_KHUSUS: data.UMUM_KHUSUS,
      ASNAF: data.ASNAF,
      NAMA_MUSTAHIK: data.NAMA_MUSTAHIK,
      KELAMIN: data.KELAMIN,
      PENERIMA_MANFAAT: data.PENERIMA_MANFAAT,
      ALAMAT: data.ALAMAT,
      ALAMAT_DETAIL: data.ALAMAT_DETAIL,
      KEL: data.KEL,
      KEC: data.KEC,
      KAB: data.KAB,
      PROV: data.PROV,
      TEMPAT_LAHIR: data.TEMPAT_LAHIR,
      TGL_LAHIR: data.TGL_LAHIR,
      HP: data.HP,
      EMAIL: data.EMAIL,
      NOTES: data.NOTES,
      NKK: data.NKK,
      NIK_SIUP: data.NIK_SIUP,
      FOTO: data.FOTO,
      KTP: data.KTP,
      STATUS_AKTIF: data.STATUS_AKTIF,
      KANTOR: data.KANTOR,
      RESPON_TIME: data.RESPON_TIME || null
    };

    // Filter out undefined fields
    const updateFields = [];
    const params = [];
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(val);
      }
    }

    if (updateFields.length > 0) {
      params.push(req.params.id);
      await pool.query(
        `UPDATE mustahik SET ${updateFields.join(', ')} WHERE IDM = ?`,
        params
      );
    }

    res.json({ message: 'Mustahik updated successfully' });
  } catch (err) {
    console.error('Update Mustahik Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/mustahik/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const officeFilter = getOfficeQueryFilter(req.user, 'KANTOR');
    const [checkAccess] = await pool.query(
      `SELECT IDM FROM mustahik WHERE IDM = ? AND ${officeFilter.sql}`,
      [req.params.id, ...officeFilter.params]
    );

    if (checkAccess.length === 0) {
      return res.status(403).json({ message: 'You do not have access to delete this Mustahik' });
    }

    await pool.query('DELETE FROM mustahik WHERE IDM = ?', [req.params.id]);
    res.json({ message: 'Mustahik deleted successfully' });
  } catch (err) {
    console.error('Delete Mustahik Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
