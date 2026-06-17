const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { getOfficeQueryFilter } = require('../utils/helpers');
const { upload, uploadToStorage } = require('../storage');
const path = require('path');

function parseSDGS(sdgsString) {
  if (!sdgsString) return [];
  return sdgsString
    .split(/[|,]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// GET /api/penyaluran/programs (Fetch active programs list)
router.get('/programs', authMiddleware, async (req, res) => {
  try {
    const [programs] = await pool.query(
      "SELECT IDPROGRAM, PROGRAM_NAME, SUB_PROGRAM, DETAIL_PRORAM, SDGS FROM tbl_program WHERE STATUS = 'ON' OR STATUS = 'ACTIVE' OR STATUS IS NULL ORDER BY PROGRAM_NAME ASC"
    );
    res.json(programs);
  } catch (err) {
    console.error('Fetch Programs Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/penyaluran/cara-bayar (Fetch active payment methods from CRM based on user office)
router.get('/cara-bayar', authMiddleware, async (req, res) => {
  try {
    const crmDbName = process.env.DB_OTHERS || 'mycrm_dev';
    
    const [rows] = await pool.query(
      `SELECT bayar_id, tipe_bayar, cara_bayar, office, on_off, akun 
       FROM ${crmDbName}.carabayar 
       WHERE on_off = 'ON' AND office = ?`,
      [req.user.office]
    );
    res.json(rows);
  } catch (err) {
    console.error('Fetch CRM Cara Bayar Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/penyaluran/jenis-dana (Fetch source of funds list)
router.get('/jenis-dana', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, dana, sub_dana FROM jenis_dana ORDER BY id ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Fetch Jenis Dana Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/penyaluran/upload (Generic file upload endpoint)
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  try {
    const localPath = req.file.path;
    const targetKey = `penyaluran/${Date.now()}_${path.basename(req.file.originalname)}`;
    const publicUrl = await uploadToStorage(localPath, targetKey);
    res.json({ url: publicUrl, filename: req.file.filename });
  } catch (err) {
    console.error('Upload File Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/penyaluran (list with filters)
router.get('/', authMiddleware, async (req, res) => {
  const { mustahikName, status, excludeStatus, statuses, office, startDate, endDate, year, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const officeFilter = getOfficeQueryFilter(req.user, 'p.OFFICE');
    let sqlConditions = [officeFilter.sql];
    let params = [...officeFilter.params];

    if (mustahikName) {
      sqlConditions.push('m.NAMA_MUSTAHIK LIKE ?');
      params.push(`%${mustahikName}%`);
    }

    if (status) {
      sqlConditions.push('p.STATUS = ?');
      params.push(status);
    } else if (statuses) {
      const statusList = statuses.split(',').map(s => s.trim()).filter(Boolean);
      if (statusList.length > 0) {
        const placeholders = statusList.map(() => '?').join(', ');
        sqlConditions.push(`p.STATUS IN (${placeholders})`);
        params.push(...statusList);
      }
    } else if (excludeStatus) {
      sqlConditions.push('p.STATUS != ?');
      params.push(excludeStatus);
    }

    if (office) {
      sqlConditions.push('p.OFFICE LIKE ?');
      params.push(`${office}%`);
    }

    if (startDate) {
      sqlConditions.push('p.TGL_TRANS >= ?');
      params.push(startDate);
    }

    if (endDate) {
      sqlConditions.push('p.TGL_TRANS <= ?');
      params.push(endDate);
    }

    if (year) {
      sqlConditions.push('YEAR(p.TGL_TRANS) = ?');
      params.push(parseInt(year));
    }

    const whereClause = sqlConditions.join(' AND ');

    // Get count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total 
       FROM penyaluran p 
       LEFT JOIN mustahik m ON p.IDMUSTAHIK = m.IDM 
       WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get items
    const [items] = await pool.query(
      `SELECT p.*, m.NAMA_MUSTAHIK as mustahik_name, m.ALAMAT as mustahik_alamat, m.KANTOR as mustahik_office
       FROM penyaluran p 
       LEFT JOIN mustahik m ON p.IDMUSTAHIK = m.IDM 
       WHERE ${whereClause} 
       ORDER BY p.TGL_TRANS DESC, p.IDTRANS DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      total,
      data: items,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Fetch Penyaluran Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/penyaluran/dashboard-stats (Dashboard stats & trends)
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
  const { office, year = new Date().getFullYear(), month } = req.query;

  try {
    const officeFilter = getOfficeQueryFilter(req.user, 'p.OFFICE');
    let sqlConditions = [officeFilter.sql, 'YEAR(p.TGL_TRANS) = ?'];
    let params = [...officeFilter.params, parseInt(year)];

    if (office) {
      sqlConditions.push('p.OFFICE LIKE ?');
      params.push(`${office}%`);
    }

    if (month && month !== 'all' && month !== '0') {
      sqlConditions.push('MONTH(p.TGL_TRANS) = ?');
      params.push(parseInt(month));
    }

    const whereClause = sqlConditions.join(' AND ');

    // 1. Core aggregates
    const [aggregates] = await pool.query(
      `SELECT 
        COUNT(p.IDTRANS) as total_count,
        SUM(CAST(NULLIF(p.NILAI_PENGAJUAN, '') AS DECIMAL(20,2))) as total_pengajuan,
        SUM(CAST(NULLIF(p.NILAI_ACC, '') AS DECIMAL(20,2))) as total_acc,
        SUM((
          SELECT COALESCE(SUM(dp.SUB_TOTAL), CAST(NULLIF(p.NILAI, '') AS DECIMAL(20,2)), 0)
          FROM dpenyaluran dp
          WHERE dp.IDTRANS = p.IDTRANS
        )) as total_realisasi,
        COUNT(DISTINCT p.IDMUSTAHIK) as unique_mustahik
       FROM penyaluran p 
       JOIN mustahik m ON p.IDMUSTAHIK = m.IDM
       WHERE ${whereClause}`,
      params
    );

    // 2. Status breakdown
    const [statusBreakdown] = await pool.query(
      `SELECT p.STATUS, COUNT(p.IDTRANS) as count, 
              SUM((
                SELECT COALESCE(SUM(dp.SUB_TOTAL), CAST(NULLIF(p.NILAI, '') AS DECIMAL(20,2)), 0)
                FROM dpenyaluran dp
                WHERE dp.IDTRANS = p.IDTRANS
              )) as total_realisasi
       FROM penyaluran p 
       JOIN mustahik m ON p.IDMUSTAHIK = m.IDM
       WHERE ${whereClause} 
       GROUP BY p.STATUS`,
      params
    );

    // 3. Monthly trend (realisasi)
    const [monthlyTrend] = await pool.query(
      `SELECT MONTH(p.TGL_TRANS) as month, 
              SUM((
                SELECT COALESCE(SUM(dp.SUB_TOTAL), CAST(NULLIF(p.NILAI, '') AS DECIMAL(20,2)), 0)
                FROM dpenyaluran dp
                WHERE dp.IDTRANS = p.IDTRANS
              )) as amount
       FROM penyaluran p 
       JOIN mustahik m ON p.IDMUSTAHIK = m.IDM
       WHERE ${whereClause} 
       GROUP BY MONTH(p.TGL_TRANS)
       ORDER BY month`,
      params
    );

    // 4a. Program breakdown (join dpenyaluran)
    const [programBreakdown] = await pool.query(
      `SELECT dp.PROGRAM as name, SUM(dp.SUB_TOTAL) as amount
       FROM dpenyaluran dp
       JOIN penyaluran p ON dp.IDTRANS = p.IDTRANS
       JOIN mustahik m ON p.IDMUSTAHIK = m.IDM
       WHERE ${whereClause}
       GROUP BY dp.PROGRAM
       ORDER BY amount DESC`,
      params
    );

    // 4b. Sub Program breakdown
    const [subProgramBreakdown] = await pool.query(
      `SELECT dp.SUB_PROGRAM as name, SUM(dp.SUB_TOTAL) as amount
       FROM dpenyaluran dp
       JOIN penyaluran p ON dp.IDTRANS = p.IDTRANS
       JOIN mustahik m ON p.IDMUSTAHIK = m.IDM
       WHERE ${whereClause}
       GROUP BY dp.SUB_PROGRAM
       ORDER BY amount DESC`,
      params
    );

    // 4c. SDGs breakdown (split and aggregate by individual SDG items)
    const [sdgsRaw] = await pool.query(
      `SELECT dp.SDGS_GOALS, SUM(dp.SUB_TOTAL) as amount
       FROM dpenyaluran dp
       JOIN penyaluran p ON dp.IDTRANS = p.IDTRANS
       JOIN mustahik m ON p.IDMUSTAHIK = m.IDM
       WHERE ${whereClause}
       GROUP BY dp.SDGS_GOALS`,
      params
    );

    const sdgsMap = {};
    for (const row of sdgsRaw) {
      const amount = parseFloat(row.amount || 0);
      const parsed = parseSDGS(row.SDGS_GOALS);
      if (parsed.length === 0) {
        sdgsMap['Lainnya / Tidak Ditentukan'] = (sdgsMap['Lainnya / Tidak Ditentukan'] || 0) + amount;
      } else {
        for (const item of parsed) {
          sdgsMap[item] = (sdgsMap[item] || 0) + amount;
        }
      }
    }

    const sdgsBreakdown = Object.entries(sdgsMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    // 5. Mustahik spread maps data (with aggregated program details)
    const [mustahikMap] = await pool.query(
      `SELECT m.IDM, m.NAMA_MUSTAHIK as name, 
              COALESCE(m.PROV, dpv.provinsi) as PROV, 
              COALESCE(m.KAB, dpv.kabupaten_kota) as KAB, 
              COALESCE(m.KEL, dpv.desa_kelurahan) as KEL,
              m.TIPE as tipe, m.UMUM_KHUSUS as umum_khusus, m.ASNAF as asnaf, p.TIPE_PENYALURAN as tipe_penyaluran,
              p.STATUS as trans_status, 
              SUM(COALESCE(dp.SUB_TOTAL, CAST(NULLIF(p.NILAI, '') AS DECIMAL(20,2)), 0)) as amount,
              GROUP_CONCAT(DISTINCT dp.PROGRAM) as programs,
              GROUP_CONCAT(DISTINCT dp.SUB_PROGRAM) as sub_programs,
              GROUP_CONCAT(DISTINCT dp.DETAIL_PROGRAM) as detail_programs,
              GROUP_CONCAT(DISTINCT dp.SDGS_GOALS) as sdgs
       FROM penyaluran p
       JOIN mustahik m ON p.IDMUSTAHIK = m.IDM
       LEFT JOIN data_provinsi dpv ON m.ALAMAT = dpv.id
       LEFT JOIN dpenyaluran dp ON p.IDTRANS = dp.IDTRANS
       WHERE ${whereClause}
       GROUP BY m.IDM, m.NAMA_MUSTAHIK, m.PROV, m.KAB, m.KEL, dpv.provinsi, dpv.kabupaten_kota, dpv.desa_kelurahan, m.TIPE, m.UMUM_KHUSUS, m.ASNAF, p.TIPE_PENYALURAN, p.STATUS, p.IDTRANS`,
      params
    );

    // Dynamic coordinates generator helper (comprehensive 38 provinces)
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

    const mapData = mustahikMap.map(item => {
      const normProv = (item.PROV || '').toUpperCase().trim();
      const baseCoords = provinceCoordinates[normProv] || { lat: -6.2088, lng: 106.8456 };
      
      let hash = 0;
      for (let i = 0; i < item.IDM.length; i++) {
        hash = item.IDM.charCodeAt(i) + ((hash << 5) - hash);
      }
      const jitterLat = ((hash & 0xFF) / 255 - 0.5) * 0.15;
      const jitterLng = (((hash >> 8) & 0xFF) / 255 - 0.5) * 0.15;

      return {
        id: item.IDM,
        name: item.name,
        prov: item.PROV,
        kab: item.KAB,
        tipe: item.tipe,
        umum_khusus: item.umum_khusus,
        asnaf: item.asnaf,
        tipe_penyaluran: item.tipe_penyaluran,
        status: item.trans_status,
        amount: parseFloat(item.amount || 0),
        programs: item.programs ? item.programs.split(',') : [],
        sub_programs: item.sub_programs ? item.sub_programs.split(',') : [],
        sdgs: item.sdgs ? parseSDGS(item.sdgs) : [],
        lat: baseCoords.lat + jitterLat,
        lng: baseCoords.lng + jitterLng
      };
    });

    // 6a. Tipe breakdown
    const [tipeBreakdown] = await pool.query(
      `SELECT m.TIPE as name, COUNT(DISTINCT p.IDTRANS) as count, 
              SUM(COALESCE(dp.SUB_TOTAL, CAST(NULLIF(p.NILAI, '') AS DECIMAL(20,2)), 0)) as amount
       FROM penyaluran p
       JOIN mustahik m ON p.IDMUSTAHIK = m.IDM
       LEFT JOIN dpenyaluran dp ON p.IDTRANS = dp.IDTRANS
       WHERE ${whereClause}
       GROUP BY m.TIPE
       ORDER BY amount DESC`,
      params
    );

    // 6b. Sifat (Umum/Khusus) breakdown
    const [umumKhususBreakdown] = await pool.query(
      `SELECT m.UMUM_KHUSUS as name, COUNT(DISTINCT p.IDTRANS) as count, 
              SUM(COALESCE(dp.SUB_TOTAL, CAST(NULLIF(p.NILAI, '') AS DECIMAL(20,2)), 0)) as amount
       FROM penyaluran p
       JOIN mustahik m ON p.IDMUSTAHIK = m.IDM
       LEFT JOIN dpenyaluran dp ON p.IDTRANS = dp.IDTRANS
       WHERE ${whereClause}
       GROUP BY m.UMUM_KHUSUS
       ORDER BY amount DESC`,
      params
    );

    // 6c. Asnaf breakdown
    const [asnafBreakdown] = await pool.query(
      `SELECT m.ASNAF as name, COUNT(DISTINCT p.IDTRANS) as count, 
              SUM(COALESCE(dp.SUB_TOTAL, CAST(NULLIF(p.NILAI, '') AS DECIMAL(20,2)), 0)) as amount
       FROM penyaluran p
       JOIN mustahik m ON p.IDMUSTAHIK = m.IDM
       LEFT JOIN dpenyaluran dp ON p.IDTRANS = dp.IDTRANS
       WHERE ${whereClause}
       GROUP BY m.ASNAF
       ORDER BY amount DESC`,
      params
    );

    // 6d. Tipe Penyaluran breakdown
    const [tipePenyaluranBreakdown] = await pool.query(
      `SELECT p.TIPE_PENYALURAN as name, COUNT(DISTINCT p.IDTRANS) as count, 
              SUM(COALESCE(dp.SUB_TOTAL, CAST(NULLIF(p.NILAI, '') AS DECIMAL(20,2)), 0)) as amount
       FROM penyaluran p
       LEFT JOIN dpenyaluran dp ON p.IDTRANS = dp.IDTRANS
       WHERE ${whereClause}
       GROUP BY p.TIPE_PENYALURAN
       ORDER BY amount DESC`,
      params
    );

    // 6e. Sub-program & Detail-program tree structure
    const [programTreeRaw] = await pool.query(
      `SELECT dp.SUB_PROGRAM as sub_program, dp.DETAIL_PROGRAM as detail_program, SUM(dp.SUB_TOTAL) as amount
       FROM dpenyaluran dp
       JOIN penyaluran p ON dp.IDTRANS = p.IDTRANS
       JOIN mustahik m ON p.IDMUSTAHIK = m.IDM
       WHERE ${whereClause}
       GROUP BY dp.SUB_PROGRAM, dp.DETAIL_PROGRAM
       ORDER BY sub_program ASC, amount DESC`,
      params
    );

    const treeMap = {};
    for (const row of programTreeRaw) {
      const subName = row.sub_program || 'Lainnya / Umum';
      const detailName = row.detail_program || 'Umum';
      const amount = parseFloat(row.amount || 0);

      if (!treeMap[subName]) {
        treeMap[subName] = {
          name: subName,
          amount: 0,
          children: []
        };
      }
      treeMap[subName].amount += amount;
      treeMap[subName].children.push({
        name: detailName,
        amount: amount
      });
    }
    const programTree = Object.values(treeMap).sort((a, b) => b.amount - a.amount);

    res.json({
      aggregates: aggregates[0] || {},
      statusBreakdown,
      monthlyTrend,
      programBreakdown,
      subProgramBreakdown,
      sdgsBreakdown,
      programTree,
      tipeBreakdown,
      umumKhususBreakdown,
      asnafBreakdown,
      tipePenyaluranBreakdown,
      mapData
    });
  } catch (err) {
    console.error('Fetch Penyaluran Dashboard Stats Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/penyaluran/:id (get detailed records)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const officeFilter = getOfficeQueryFilter(req.user, 'p.OFFICE');
    const [transactions] = await pool.query(
      `SELECT p.*, m.NAMA_MUSTAHIK as mustahik_name, m.ALAMAT as mustahik_alamat, m.KANTOR as mustahik_office
       FROM penyaluran p
       LEFT JOIN mustahik m ON p.IDMUSTAHIK = m.IDM
       WHERE p.IDTRANS = ? AND ${officeFilter.sql}`,
      [req.params.id, ...officeFilter.params]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'Distribution transaction not found' });
    }

    const transaction = transactions[0];

    // Fetch details
    const [details] = await pool.query(
      'SELECT * FROM dpenyaluran WHERE IDTRANS = ?',
      [req.params.id]
    );

    res.json({
      ...transaction,
      details
    });
  } catch (err) {
    console.error('Fetch Penyaluran Detail Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/penyaluran (create distribution & items)
router.post('/', authMiddleware, async (req, res) => {
  const data = req.body;
  
  // IDTRANS format: PNY-YYMMDD-random angka 6 digit
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  const IDTRANS = `PNY-${yy}${mm}${dd}-${rand}`;

  const insertDate = new Date();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert main transaction
    const fields = [
      'IDTRANS', 'TIPE_DOC', 'PENGAJUAN_DOC', 'STATUS', 'TGL_TRANS', 
      'IDMUSTAHIK', 'PM', 'NOTES', 'IDBAYAR', 'TIPE_BAYAR', 'CARA_BAYAR', 
      'NILAI_PENGAJUAN', 'NILAI_ACC', 'NILAI', 'KET', 'BUKTI_TRANS', 
      'KUITANSI', 'OFFICE', 'USER', 'TIPE', 'UMUM_KHUSUS', 'ASNAF', 
      'TIPE_PENYALURAN', 'DOC_SALUR', 'INSERT_DATE'
    ];

    const values = [
      IDTRANS,
      'PENGAJUAN', // Initial TIPE_DOC is always PENGAJUAN
      data.PENGAJUAN_DOC || '',
      'MASUK', // Always start with MASUK status
      data.TGL_TRANS || new Date().toISOString().split('T')[0],
      data.IDMUSTAHIK || '',
      data.PM || 1,
      data.NOTES || '',
      '',
      '',
      '',
      data.NILAI_PENGAJUAN || '0',
      '0',
      '0',
      data.KET || '',
      '',
      '',
      data.OFFICE || req.user.office || '',
      req.user.login,
      data.TIPE || '',
      data.UMUM_KHUSUS || '',
      data.ASNAF || '',
      '',
      '',
      insertDate
    ];

    const placeholders = fields.map(() => '?').join(', ');
    await connection.query(
      `INSERT INTO penyaluran (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );

    // 2. Insert items details
    if (data.details && Array.isArray(data.details)) {
      for (const item of data.details) {
        const IDDTRANS = 'DTL-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        const detailFields = [
          'IDDTRANS', 'JENIS_DANA', 'JENISDANA', 'IDPROG', 'DETAIL_PROGRAM', 
          'SUB_TOTAL', 'PROGRAM', 'SUB_PROGRAM', 'SDGS_GOALS', 'IDTRANS', 
          'OFFICE', 'USER', 'TGL_TRANS', 'NOTES', 'IDMUSTAHIK', 'TIPE', 
          'UMUM_KHUSUS', 'ASNAF', 'TGL_REG', 'STATUSD'
        ];

        const detailValues = [
          IDDTRANS,
          item.JENIS_DANA || null,
          item.JENISDANA || '',
          item.IDPROG || '',
          item.DETAIL_PROGRAM || '',
          item.SUB_TOTAL || 0,
          item.PROGRAM || '',
          item.SUB_PROGRAM || '',
          item.SDGS_GOALS || '',
          IDTRANS,
          data.OFFICE || req.user.office || '',
          req.user.login,
          data.TGL_TRANS || new Date().toISOString().split('T')[0],
          item.NOTES || '',
          data.IDMUSTAHIK || '',
          data.TIPE || '',
          data.UMUM_KHUSUS || '',
          data.ASNAF || '',
          new Date().toISOString().split('T')[0],
          data.STATUS || 'MASUK'
        ];

        const detailPlaceholders = detailFields.map(() => '?').join(', ');
        await connection.query(
          `INSERT INTO dpenyaluran (${detailFields.join(', ')}) VALUES (${detailPlaceholders})`,
          detailValues
        );
      }
    }

    await connection.commit();
    res.status(201).json({ message: 'Distribution created successfully', id: IDTRANS });
  } catch (err) {
    await connection.rollback();
    console.error('Create Penyaluran Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// PUT /api/penyaluran/:id (update distribution and details)
router.put('/:id', authMiddleware, async (req, res) => {
  const data = req.body;
  const updateDate = new Date();

  const officeFilter = getOfficeQueryFilter(req.user, 'OFFICE');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check permission
    const [checkAccess] = await connection.query(
      `SELECT IDTRANS FROM penyaluran WHERE IDTRANS = ? AND ${officeFilter.sql}`,
      [req.params.id, ...officeFilter.params]
    );

    if (checkAccess.length === 0) {
      connection.release();
      return res.status(403).json({ message: 'Access denied or record not found' });
    }

    // 1. Update main transaction details (only fields that can be changed)
    const updates = {
      TIPE_DOC: data.TIPE_DOC,
      PENGAJUAN_DOC: data.PENGAJUAN_DOC,
      TGL_TRANS: data.TGL_TRANS,
      IDMUSTAHIK: data.IDMUSTAHIK,
      PM: data.PM,
      NOTES: data.NOTES,
      IDBAYAR: data.IDBAYAR,
      TIPE_BAYAR: data.TIPE_BAYAR,
      CARA_BAYAR: data.CARA_BAYAR,
      NILAI_PENGAJUAN: data.NILAI_PENGAJUAN,
      NILAI_ACC: data.NILAI_ACC,
      NILAI: data.NILAI,
      KET: data.KET,
      BUKTI_TRANS: data.BUKTI_TRANS,
      KUITANSI: data.KUITANSI,
      TIPE: data.TIPE,
      UMUM_KHUSUS: data.UMUM_KHUSUS,
      ASNAF: data.ASNAF,
      TIPE_PENYALURAN: data.TIPE_PENYALURAN,
      DOC_SALUR: data.DOC_SALUR,
      UPDATE_DATE: updateDate
    };

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
      await connection.query(
        `UPDATE penyaluran SET ${updateFields.join(', ')} WHERE IDTRANS = ?`,
        params
      );
    }

    // 2. Refresh items (delete old, insert new)
    if (data.details && Array.isArray(data.details)) {
      await connection.query('DELETE FROM dpenyaluran WHERE IDTRANS = ?', [req.params.id]);

      for (const item of data.details) {
        const IDDTRANS = 'DTL-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        const detailFields = [
          'IDDTRANS', 'JENIS_DANA', 'JENISDANA', 'IDPROG', 'DETAIL_PROGRAM', 
          'SUB_TOTAL', 'PROGRAM', 'SUB_PROGRAM', 'SDGS_GOALS', 'IDTRANS', 
          'OFFICE', 'USER', 'TGL_TRANS', 'NOTES', 'IDMUSTAHIK', 'TIPE', 
          'UMUM_KHUSUS', 'ASNAF', 'STATUSD'
        ];

        const detailValues = [
          IDDTRANS,
          item.JENIS_DANA || null,
          item.JENISDANA || '',
          item.IDPROG || '',
          item.DETAIL_PROGRAM || '',
          item.SUB_TOTAL || 0,
          item.PROGRAM || '',
          item.SUB_PROGRAM || '',
          item.SDGS_GOALS || '',
          req.params.id,
          data.OFFICE || req.user.office || '',
          req.user.login,
          data.TGL_TRANS || new Date().toISOString().split('T')[0],
          item.NOTES || '',
          data.IDMUSTAHIK || '',
          data.TIPE || '',
          data.UMUM_KHUSUS || '',
          data.ASNAF || '',
          data.STATUS || 'MASUK'
        ];

        const detailPlaceholders = detailFields.map(() => '?').join(', ');
        await connection.query(
          `INSERT INTO dpenyaluran (${detailFields.join(', ')}) VALUES (${detailPlaceholders})`,
          detailValues
        );
      }
    }

    await connection.commit();
    res.json({ message: 'Distribution updated successfully' });
  } catch (err) {
    await connection.rollback();
    console.error('Update Penyaluran Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// POST /api/penyaluran/:id/status (Handle workflow status transition)
router.post('/:id/status', authMiddleware, async (req, res) => {
  const { 
    status, 
    nilai_acc, 
    tipe_penyaluran, 
    idbayar, 
    tipe_bayar, 
    cara_bayar, 
    nilai, 
    doc_salur, 
    details 
  } = req.body;
  
  if (!status) {
    return res.status(400).json({ message: 'Target status is required' });
  }

  const validStatuses = ['MASUK', 'OPEN', 'DITERIMA', 'DITOLAK', 'PROSES PENCAIRAN', 'FINISH'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  const officeFilter = getOfficeQueryFilter(req.user, 'OFFICE');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [trx] = await connection.query(
      `SELECT STATUS, NILAI_ACC, IDMUSTAHIK, TGL_TRANS, OFFICE, USER, TIPE, UMUM_KHUSUS, ASNAF FROM penyaluran WHERE IDTRANS = ? AND ${officeFilter.sql}`,
      [req.params.id, ...officeFilter.params]
    );

    if (trx.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'Distribution record not found' });
    }

    const currentTrx = trx[0];
    const now = new Date();

    if (status === 'DITERIMA') {
      if (nilai_acc === undefined || nilai_acc === null) {
        connection.release();
        return res.status(400).json({ message: 'Nilai ACC wajib diisi' });
      }
      
      await connection.query(
        `UPDATE penyaluran SET STATUS = ?, NILAI_ACC = ?, UPDATE_DATE = ? WHERE IDTRANS = ?`,
        [status, nilai_acc, now, req.params.id]
      );

      // If mustahik status is 'CALON', update it to 'MUSTAHIK'
      if (currentTrx.IDMUSTAHIK) {
        await connection.query(
          `UPDATE mustahik SET STATUS = 'MUSTAHIK' WHERE IDM = ? AND STATUS = 'CALON'`,
          [currentTrx.IDMUSTAHIK]
        );
      }
    } else if (status === 'DITOLAK') {
      await connection.query(
        `UPDATE penyaluran SET STATUS = ?, UPDATE_DATE = ? WHERE IDTRANS = ?`,
        [status, now, req.params.id]
      );
    } else if (status === 'FINISH') {
      if (!tipe_penyaluran) {
        connection.release();
        return res.status(400).json({ message: 'Tipe penyaluran wajib diisi' });
      }
      if (!idbayar || !cara_bayar) {
        connection.release();
        return res.status(400).json({ message: 'Cara pembayaran wajib diisi' });
      }
      if (!doc_salur) {
        connection.release();
        return res.status(400).json({ message: 'Bukti penyaluran (Foto) wajib diunggah' });
      }

      // Check: Nilai pencairan tidak boleh melebihi Nilai ACC
      const limitAcc = parseFloat(currentTrx.NILAI_ACC || 0);
      const valNilai = parseFloat(nilai || 0);
      if (valNilai > limitAcc) {
        connection.release();
        return res.status(400).json({ message: `Nilai realisasi (${valNilai}) tidak boleh melebihi Nilai ACC (${limitAcc})` });
      }

      // Update main table (TIPE_DOC changes to 'PENYALURAN' and status changes to 'FINISH')
      await connection.query(
        `UPDATE penyaluran 
         SET STATUS = ?, TIPE_PENYALURAN = ?, IDBAYAR = ?, TIPE_BAYAR = ?, CARA_BAYAR = ?, 
             NILAI = ?, DOC_SALUR = ?, TIPE_DOC = 'PENYALURAN', FINISH_DATE = ?, UPDATE_DATE = ? 
         WHERE IDTRANS = ?`,
        [status, tipe_penyaluran, idbayar, tipe_bayar, cara_bayar, nilai, doc_salur, now, now, req.params.id]
      );

      // Insert/Refresh dpenyaluran details
      await connection.query('DELETE FROM dpenyaluran WHERE IDTRANS = ?', [req.params.id]);

      if (details && Array.isArray(details)) {
        for (const item of details) {
          const IDDTRANS = 'DTL-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
          const detailFields = [
            'IDDTRANS', 'JENIS_DANA', 'JENISDANA', 'IDPROG', 'DETAIL_PROGRAM', 
            'SUB_TOTAL', 'PROGRAM', 'SUB_PROGRAM', 'SDGS_GOALS', 'IDTRANS', 
            'OFFICE', 'USER', 'TGL_TRANS', 'NOTES', 'IDMUSTAHIK', 'TIPE', 
            'UMUM_KHUSUS', 'ASNAF', 'STATUSD', 'FINIS_DATE'
          ];

          const detailValues = [
            IDDTRANS,
            item.JENIS_DANA || null,
            item.JENISDANA || '',
            item.IDPROG || '',
            item.DETAIL_PROGRAM || '',
            item.SUB_TOTAL || 0,
            item.PROGRAM || '',
            item.SUB_PROGRAM || '',
            item.SDGS_GOALS || '',
            req.params.id,
            currentTrx.OFFICE,
            req.user.login,
            currentTrx.TGL_TRANS || now.toISOString().split('T')[0],
            item.NOTES || '',
            currentTrx.IDMUSTAHIK,
            currentTrx.TIPE,
            currentTrx.UMUM_KHUSUS,
            currentTrx.ASNAF,
            'FINISH',
            now.toISOString().split('T')[0]
          ];

          const detailPlaceholders = detailFields.map(() => '?').join(', ');
          await connection.query(
            `INSERT INTO dpenyaluran (${detailFields.join(', ')}) VALUES (${detailPlaceholders})`,
            detailValues
          );
        }
      }
    } else {
      await connection.query(
        `UPDATE penyaluran SET STATUS = ?, UPDATE_DATE = ? WHERE IDTRANS = ?`,
        [status, now, req.params.id]
      );
      
      await connection.query(
        'UPDATE dpenyaluran SET STATUSD = ? WHERE IDTRANS = ?',
        [status, req.params.id]
      );
    }

    await connection.commit();
    res.json({ message: `Status updated to ${status} successfully` });
  } catch (err) {
    await connection.rollback();
    console.error('Update Penyaluran Status Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    connection.release();
  }
});

module.exports = router;
