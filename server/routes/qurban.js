const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { upload, uploadToStorage } = require('../storage');
const { getOfficeQueryFilter } = require('../utils/helpers');

// GET /api/qurban/distribution-points (Fetch active distribution points)
router.get('/distribution-points', authMiddleware, async (req, res) => {
  const { year } = req.query;
  try {
    const officeFilter = getOfficeQueryFilter(req.user, 'office');
    let sqlConditions = ["status = 'ON'", officeFilter.sql];
    let params = [...officeFilter.params];

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

    const whereClause = sqlConditions.join(' AND ');
    const [points] = await pool.query(
      `SELECT * FROM distribusiqurban WHERE ${whereClause} ORDER BY wilayahdistribusi ASC`,
      params
    );
    res.json(points);
  } catch (err) {
    console.error('Fetch Distribution Points Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/qurban/dashboard-stats (Dashboard metrics for Qurban)
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
  const { office, year, product, status, pointId } = req.query;

  try {
    const officeFilter = getOfficeQueryFilter(req.user, 'q.office');
    const baseConditions = [officeFilter.sql, "q.produk <> 'DISKON QURBAN'"];
    const baseParams = [...officeFilter.params];

    if (office) {
      baseConditions.push('q.office LIKE ?');
      baseParams.push(`${office}%`);
    }
    if (year) {
      baseConditions.push('YEAR(q.tgl) = ?');
      baseParams.push(year);
    }
    if (pointId) {
      baseConditions.push('q.distribusi = ?');
      baseParams.push(pointId);
    }

    // 1. Core aggregates (filtered by both product and status if present)
    const aggConditions = [...baseConditions];
    const aggParams = [...baseParams];
    if (product) {
      aggConditions.push('q.produk = ?');
      aggParams.push(product);
    }
    if (status) {
      aggConditions.push('q.status = ?');
      aggParams.push(status);
    }
    const aggWhere = aggConditions.join(' AND ');

    const [aggregates] = await pool.query(
      `SELECT 
        COUNT(q.detail_id) as total_animals,
        SUM(
          CASE 
            WHEN CAST(NULLIF(q.qty, '') AS SIGNED) > 1000 THEN 
              CASE 
                WHEN CAST(NULLIF(q.price, '') AS SIGNED) > 0 AND CAST(NULLIF(q.price, '') AS SIGNED) <= 1000 THEN CAST(NULLIF(q.price, '') AS SIGNED)
                ELSE 1 
              END
            ELSE COALESCE(CAST(NULLIF(q.qty, '') AS SIGNED), 0)
          END
        ) as total_qty,
        SUM(CAST(NULLIF(q.sub_total, '') AS DECIMAL(20,2))) as total_nominal,
        COUNT(DISTINCT q.donaturid) as total_donators
       FROM dataqurban q
       WHERE ${aggWhere}`,
      aggParams
    );

    // 2. Status counts (cross-filtered by product, but NOT by status itself)
    const statusConditions = [...baseConditions];
    const statusParams = [...baseParams];
    if (product) {
      statusConditions.push('q.produk = ?');
      statusParams.push(product);
    }
    const statusWhere = statusConditions.join(' AND ');

    const [statusBreakdown] = await pool.query(
      `SELECT q.status, COUNT(q.detail_id) as count
       FROM dataqurban q
       WHERE ${statusWhere}
       GROUP BY q.status`,
      statusParams
    );

    // 3. Products breakdown (cross-filtered by status, but NOT by product itself)
    const productConditions = [...baseConditions];
    const productParams = [...baseParams];
    if (status) {
      productConditions.push('q.status = ?');
      productParams.push(status);
    }
    const productWhere = productConditions.join(' AND ');

    const [productBreakdown] = await pool.query(
      `SELECT q.produk, 
              SUM(
                CASE 
                  WHEN CAST(NULLIF(q.qty, '') AS SIGNED) > 1000 THEN 
                    CASE 
                      WHEN CAST(NULLIF(q.price, '') AS SIGNED) > 0 AND CAST(NULLIF(q.price, '') AS SIGNED) <= 1000 THEN CAST(NULLIF(q.price, '') AS SIGNED)
                      ELSE 1 
                    END
                  ELSE COALESCE(CAST(NULLIF(q.qty, '') AS SIGNED), 0)
                END
              ) as count, 
              SUM(CAST(NULLIF(q.sub_total, '') AS DECIMAL(20,2))) as amount
       FROM dataqurban q
       WHERE ${productWhere}
       GROUP BY q.produk
       ORDER BY count DESC`,
      productParams
    );

    // 4. Map Distribution Points (aggregates of animals distributed, filtered by both product and status)
    const mapConditions = [...baseConditions];
    const mapParams = [...baseParams];
    if (product) {
      mapConditions.push('q.produk = ?');
      mapParams.push(product);
    }
    if (status) {
      mapConditions.push('q.status = ?');
      mapParams.push(status);
    }
    const mapWhere = mapConditions.join(' AND ');

    const [mapItems] = await pool.query(
      `SELECT 
        d.id as point_id,
        d.wilayahdistribusi as name,
        d.prov, d.kab, d.kec, d.kel,
        d.user_pj,
        q.produk,
        SUM(
          CASE 
            WHEN CAST(NULLIF(q.qty, '') AS SIGNED) > 1000 THEN 
              CASE 
                WHEN CAST(NULLIF(q.price, '') AS SIGNED) > 0 AND CAST(NULLIF(q.price, '') AS SIGNED) <= 1000 THEN CAST(NULLIF(q.price, '') AS SIGNED)
                ELSE 1 
              END
            ELSE COALESCE(CAST(NULLIF(q.qty, '') AS SIGNED), 0)
          END
        ) as product_qty,
        SUM(CAST(NULLIF(q.sub_total, '') AS DECIMAL(20,2))) as product_amount
       FROM dataqurban q
       JOIN distribusiqurban d ON q.distribusi = d.id
       WHERE ${mapWhere}
       GROUP BY d.id, q.produk`,
      mapParams
    );

    // Coordinates mapper for Leaflet
    const provinceCoordinates = {
      // Indonesia Provinces
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

    // Group product data by distribution point for UI map pins
    const pointsMap = {};
    mapItems.forEach(item => {
      if (!pointsMap[item.point_id]) {
        const provText = (item.prov || '').toUpperCase().trim();
        const kabText = (item.kab || '').toUpperCase().trim();
        const fullText = `${provText} ${kabText} ${(item.name || '')}`.toUpperCase();

        let baseCoords = null;

        // 1. Try exact matches on province coordinates keys
        for (const provName of Object.keys(provinceCoordinates)) {
          if (fullText.includes(provName)) {
            baseCoords = provinceCoordinates[provName];
            break;
          }
        }

        // 2. If not matched, map common variations / English names / abbreviations / major towns
        if (!baseCoords) {
          const mappings = [
            { keys: ['EAST KALIMANTAN', 'KALIMANTAN TIMUR', 'KALTIM', 'BERAU'], coords: provinceCoordinates['KALIMANTAN TIMUR'] },
            { keys: ['WEST KALIMANTAN', 'KALIMANTAN BARAT', 'KALBAR'], coords: provinceCoordinates['KALIMANTAN BARAT'] },
            { keys: ['SOUTH KALIMANTAN', 'KALIMANTAN SELATAN', 'KALSEL'], coords: provinceCoordinates['KALIMANTAN SELATAN'] },
            { keys: ['CENTRAL KALIMANTAN', 'KALIMANTAN TENGAH', 'KALTENG'], coords: provinceCoordinates['KALIMANTAN TENGAH'] },
            { keys: ['NORTH KALIMANTAN', 'KALIMANTAN UTARA', 'KALTARA'], coords: provinceCoordinates['KALIMANTAN UTARA'] },
            
            { keys: ['EAST JAVA', 'JAWA TIMUR', 'JATIM'], coords: provinceCoordinates['JAWA TIMUR'] },
            { keys: ['WEST JAVA', 'JAWA BARAT', 'JABAR', 'BOGOR', 'GARUT', 'BEKASI', 'CIANJUR', 'DEPOK', 'TASIKMALAYA', 'BANDUNG'], coords: provinceCoordinates['JAWA BARAT'] },
            { keys: ['CENTRAL JAVA', 'JAWA TENGAH', 'JATENG', 'BOYOLALI', 'SRAGEN', 'SEMARANG', 'KARANGANYAR'], coords: provinceCoordinates['JAWA TENGAH'] },
            
            { keys: ['BALI', 'DENPASAR', 'KARANGASEM', 'BANGLI'], coords: provinceCoordinates['BALI'] },
            { keys: ['YOGYAKARTA', 'DIY', 'DI YOGYAKARTA'], coords: provinceCoordinates['DI YOGYAKARTA'] },
            { keys: ['BANTEN', 'TANGERANG', 'LEBAK', 'SERANG'], coords: provinceCoordinates['BANTEN'] },
            
            { keys: ['DKI JAKARTA', 'JAKARTA'], coords: provinceCoordinates['DKI JAKARTA'] },
            
            { keys: ['NORTH SUMATRA', 'SUMATERA UTARA', 'SUMUT', 'TEBING TINGGI'], coords: provinceCoordinates['SUMATERA UTARA'] },
            { keys: ['WEST SUMATRA', 'SUMATERA BARAT', 'SUMBAR'], coords: provinceCoordinates['SUMATERA BARAT'] },
            { keys: ['SOUTH SUMATRA', 'SUMATERA SELATAN', 'SUMSEL', 'BANYUASIN'], coords: provinceCoordinates['SUMATERA SELATAN'] },
            { keys: ['RIAU', 'BENGKALIS'], coords: provinceCoordinates['RIAU'] },
            { keys: ['JAMBI', 'BATANGHARI'], coords: provinceCoordinates['JAMBI'] },
            { keys: ['BENGKULU'], coords: provinceCoordinates['BENGKULU'] },
            { keys: ['LAMPUNG', 'WAY KANAN'], coords: provinceCoordinates['LAMPUNG'] },
            { keys: ['BANGKA', 'BELITUNG'], coords: provinceCoordinates['KEPULAUAN BANGKA BELITUNG'] },
            { keys: ['KEPULAUAN RIAU', 'KEPRI'], coords: provinceCoordinates['KEPULAUAN RIAU'] },
            
            { keys: ['SOUTH SULAWESI', 'SULAWESI SELATAN', 'SULSEL', 'TORAJA', 'BULUKUMBA', 'LUWU'], coords: provinceCoordinates['SULAWESI SELATAN'] },
            { keys: ['NORTH SULAWESI', 'SULAWESI UTARA', 'SULUT', 'BITUNG'], coords: provinceCoordinates['SULAWESI UTARA'] },
            { keys: ['CENTRAL SULAWESI', 'SULAWESI TENGAH', 'SULTENG', 'PALU', 'TOLI TOLI'], coords: provinceCoordinates['SULAWESI TENGAH'] },
            { keys: ['SOUTHEAST SULAWESI', 'SULAWESI TENGGARA', 'SULTRA', 'KONAWE'], coords: provinceCoordinates['SULAWESI TENGGARA'] },
            { keys: ['GORONTALO'], coords: provinceCoordinates['GORONTALO'] },
            { keys: ['WEST SULAWESI', 'SULAWESI BARAT', 'SULBAR', 'MAJENE', 'MAMUJU'], coords: provinceCoordinates['SULAWESI BARAT'] },
            
            { keys: ['WEST NUSA TENGGARA', 'NUSA TENGGARA BARAT', 'NTB', 'LOMBOK', 'BIMA'], coords: provinceCoordinates['NUSA TENGGARA BARAT'] },
            { keys: ['EAST NUSA TENGGARA', 'NUSA TENGGARA TIMUR', 'NTT', 'TIMOR', 'MANGGARAI', 'LEMATA', 'KUPANG', 'SIKKA', 'FLORES'], coords: provinceCoordinates['NUSA TENGGARA TIMUR'] },
            
            { keys: ['MALUKU', 'ARU', 'BURU'], coords: provinceCoordinates['MALUKU'] },
            { keys: ['NORTH MALUKU', 'MALUKU UTARA', 'HALMAHERA'], coords: provinceCoordinates['MALUKU UTARA'] },
            
            { keys: ['PAPUA', 'JAYAPURA', 'SARMI', 'MERAUKE'], coords: provinceCoordinates['PAPUA'] },
            { keys: ['PAPUA BARAT', 'MANOKWARI'], coords: provinceCoordinates['PAPUA BARAT'] },
            { keys: ['PAPUA SELATAN'], coords: provinceCoordinates['PAPUA SELATAN'] },
            { keys: ['PAPUA TENGAH', 'MIMIKA', 'NABIRE'], coords: provinceCoordinates['PAPUA TENGAH'] },
            { keys: ['PAPUA PEGUNUNGAN'], coords: provinceCoordinates['PAPUA PEGUNUNGAN'] },
            { keys: ['PAPUA BARAT DAYA', 'SORONG'], coords: provinceCoordinates['PAPUA BARAT DAYA'] }
          ];

          for (const mapping of mappings) {
            if (mapping.keys.some(k => fullText.includes(k))) {
              baseCoords = mapping.coords;
              break;
            }
          }
        }

        if (!baseCoords) {
          const normProv = (item.prov || '').toUpperCase().trim();
          if (normProv.includes('UGANDA')) baseCoords = { lat: 1.3733, lng: 32.2903 };
          else if (normProv.includes('SUDAN')) baseCoords = { lat: 12.8628, lng: 30.2176 };
          else if (normProv.includes('KENYA')) baseCoords = { lat: -0.0236, lng: 37.9062 };
          else if (normProv.includes('CAMEROON')) baseCoords = { lat: 7.3697, lng: 12.3547 };
          else if (normProv.includes('MALI')) baseCoords = { lat: 17.5707, lng: -3.9962 };
          else if (normProv.includes('PALESTINA') || normProv.includes('GAZA')) baseCoords = { lat: 31.9522, lng: 35.2332 };
          else if (normProv.includes('YORDANIA') || normProv.includes('JORDAN')) baseCoords = { lat: 30.5852, lng: 36.2384 };
          else if (normProv.includes('MYANMAR') || normProv.includes('RAKHINE')) baseCoords = { lat: 21.9162, lng: 95.9560 };
          else if (normProv.includes('SOMALIA')) baseCoords = { lat: 5.1521, lng: 46.1996 };
          else if (normProv.includes('TANZANIA')) baseCoords = { lat: -6.3690, lng: 34.8888 };
          else if (normProv.includes('NIGER')) baseCoords = { lat: 17.6078, lng: 8.0817 };
          else if (normProv.includes('TIMOR LESTE')) baseCoords = { lat: -8.8742, lng: 125.7275 };
          else {
            baseCoords = { lat: -6.2088, lng: 106.8456 };
          }
        }

        // Jitter based on point_id
        let hash = 0;
        for (let i = 0; i < item.point_id.length; i++) {
          hash = item.point_id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const jitterLat = ((hash & 0xFF) / 255 - 0.5) * 0.15;
        const jitterLng = (((hash >> 8) & 0xFF) / 255 - 0.5) * 0.15;

        pointsMap[item.point_id] = {
          id: item.point_id,
          name: item.name,
          address: `Kel. ${item.kel || ''}, Kec. ${item.kec || ''}, ${item.kab || ''}, ${item.prov || ''}`,
          user_pj: item.user_pj,
          lat: baseCoords.lat + jitterLat,
          lng: baseCoords.lng + jitterLng,
          qurbans: [],
          totalQty: 0,
          totalAmount: 0
        };
      }
      
      const qty = parseInt(item.product_qty || 0);
      const amount = parseFloat(item.product_amount || 0);
      
      pointsMap[item.point_id].qurbans.push({
        product: item.produk,
        qty: qty,
        amount: amount
      });
      pointsMap[item.point_id].totalQty += qty;
      pointsMap[item.point_id].totalAmount += amount;
    });

    res.json({
      aggregates: aggregates[0] || {},
      statusBreakdown,
      productBreakdown,
      mapData: Object.values(pointsMap)
    });
  } catch (err) {
    console.error('Fetch Qurban Stats Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/qurban (list with filters)
router.get('/', authMiddleware, async (req, res) => {
  const { donatur, status, office, pointId, year, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const officeFilter = getOfficeQueryFilter(req.user, 'q.office');
    let sqlConditions = [officeFilter.sql];
    let params = [...officeFilter.params];

    if (donatur) {
      sqlConditions.push('q.donatur LIKE ?');
      params.push(`%${donatur}%`);
    }
    if (status) {
      sqlConditions.push('q.status = ?');
      params.push(status);
    }
    if (office) {
      sqlConditions.push('q.office LIKE ?');
      params.push(`${office}%`);
    }
    if (pointId) {
      sqlConditions.push('q.distribusi = ?');
      params.push(pointId);
    }
    if (year) {
      sqlConditions.push('YEAR(q.tgl) = ?');
      params.push(parseInt(year));
    }

    const whereClause = sqlConditions.join(' AND ');

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM dataqurban q WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get list
    const [items] = await pool.query(
      `SELECT q.*, d.wilayahdistribusi as point_name, d.user_pj, d.prov, d.kab, d.kec, d.kel 
       FROM dataqurban q 
       LEFT JOIN distribusiqurban d ON q.distribusi = d.id 
       WHERE ${whereClause} 
       ORDER BY q.timestamp DESC, q.detail_id DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Normalize quantity for anomalous historical records where price and qty columns are swapped
    const normalizedItems = items.map(item => {
      let qtyVal = parseInt(item.qty || 1);
      if (qtyVal > 1000) {
        const priceVal = parseInt(item.price || 1);
        qtyVal = (priceVal > 0 && priceVal <= 1000) ? priceVal : 1;
        item.qty = String(qtyVal);
      }
      return item;
    });

    res.json({
      total,
      data: normalizedItems,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Fetch Qurban List Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/qurban/bulk-potong (Bulk update status to TERPOTONG)
router.post('/bulk-potong', authMiddleware, async (req, res) => {
  const { detailIds } = req.body;

  if (!detailIds || !Array.isArray(detailIds) || detailIds.length === 0) {
    return res.status(400).json({ message: 'List of detail IDs is required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const detailId of detailIds) {
      // 1. Check access: must be PJ of the assigned point or Admin
      const [qurbans] = await connection.query(
        `SELECT q.status, q.distribusi, d.user_pj, q.office 
         FROM dataqurban q 
         LEFT JOIN distribusiqurban d ON q.distribusi = d.id 
         WHERE q.detail_id = ?`,
        [detailId]
      );

      if (qurbans.length === 0) {
        throw new Error(`Record ${detailId} not found`);
      }

      const qurban = qurbans[0];

      // Locked check
      if (qurban.status === 'FINISH') {
        throw new Error(`Record ${detailId} is finished and locked.`);
      }

      if (qurban.status !== 'TERDISTRIBUSI') {
        throw new Error(`Record ${detailId} status cannot be changed to TERPOTONG. Initial status must be TERDISTRIBUSI (current: ${qurban.status}).`);
      }

      const isPJ = qurban.user_pj === req.user.login;
      const isAdmin = req.user.priv_admin === 'Y';

      if (!isPJ && !isAdmin) {
        throw new Error(`You are not the PIC/PJ of the distribution area for record ${detailId}.`);
      }

      // 2. Perform status update
      await connection.query(
        "UPDATE dataqurban SET status = 'TERPOTONG', user = ? WHERE detail_id = ?",
        [req.user.login, detailId]
      );
    }

    await connection.commit();
    res.json({ message: `${detailIds.length} records updated to TERPOTONG successfully.` });
  } catch (err) {
    await connection.rollback();
    console.error('Bulk Potong Error:', err);
    res.status(400).json({ message: err.message || 'Internal server error' });
  } finally {
    connection.release();
  }
});

// PUT /api/qurban/:id (Edit qurban data, upload photos, set status)
// We support single edits here
router.put('/:id', authMiddleware, async (req, res) => {
  const detailId = req.params.id;
  const data = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch current record
    const [qurbans] = await connection.query(
      `SELECT q.status, q.qty, q.price, q.distribusi, d.user_pj, q.office 
       FROM dataqurban q 
       LEFT JOIN distribusiqurban d ON q.distribusi = d.id 
       WHERE q.detail_id = ?`,
      [detailId]
    );

    if (qurbans.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'Qurban record not found' });
    }

    const qurban = qurbans[0];

    // Locked check
    if (qurban.status === 'FINISH') {
      connection.release();
      return res.status(403).json({ message: 'This qurban record is FINISHED and locked.' });
    }

    // 2. Authorization check
    // If it is in OPEN state (no distribution point yet), anyone in the office or admin can assign the distribution point.
    // Once a distribution point is set, ONLY the PJ user (user_pj) of that point or Admin can make edits.
    const hasPoint = qurban.distribusi !== null && qurban.distribusi !== '';
    const isPJ = hasPoint && qurban.user_pj === req.user.login;
    const isAdmin = req.user.priv_admin === 'Y';
    
    // Check if user is in same office (hierarchical check)
    const officeFilter = getOfficeQueryFilter(req.user, 'office');
    const [checkOffice] = await connection.query(
      `SELECT detail_id FROM dataqurban WHERE detail_id = ? AND ${officeFilter.sql}`,
      [detailId, ...officeFilter.params]
    );
    const inOffice = checkOffice.length > 0;

    if (!isAdmin) {
      if (hasPoint && !isPJ) {
        connection.release();
        return res.status(403).json({ message: 'Only the PIC/PJ of the distribution point can edit this record.' });
      }
      if (!hasPoint && !inOffice) {
        connection.release();
        return res.status(403).json({ message: 'You do not have permission to edit records outside your office.' });
      }
    }

    // 3. Quota Management
    // If distribution point is changing or being set:
    const newDistPointId = data.distribusi;
    const oldDistPointId = qurban.distribusi;
    
    // Normalize quantity if it is an anomalous historical record
    let qty = parseInt(qurban.qty || 1);
    if (qty > 1000) {
      const priceVal = parseInt(qurban.price || 1);
      qty = (priceVal > 0 && priceVal <= 1000) ? priceVal : 1;
    }

    if (newDistPointId !== undefined && newDistPointId !== oldDistPointId) {
      // Restore quota on old point
      if (oldDistPointId) {
        await connection.query(
          'UPDATE distribusiqurban SET tersedia = tersedia + ? WHERE id = ?',
          [qty, oldDistPointId]
        );
      }

      // Deduct quota on new point
      if (newDistPointId) {
        // Fetch new point to check if it's active and has quota
        const [points] = await connection.query(
          "SELECT status, tersedia, quota FROM distribusiqurban WHERE id = ?",
          [newDistPointId]
        );

        if (points.length === 0) {
          throw new Error('Selected distribution point not found.');
        }

        const point = points[0];

        if (point.status !== 'ON') {
          throw new Error('Selected distribution point is inactive.');
        }

        if (point.tersedia < qty) {
          throw new Error(`Insufficient quota at selected distribution point. Available: ${point.tersedia}, Required: ${qty}`);
        }

        await connection.query(
          'UPDATE distribusiqurban SET tersedia = tersedia - ? WHERE id = ?',
          [qty, newDistPointId]
        );
      }
    }

    // 4. Determine new status
    // Rule:
    // - If it was OPEN and distribution point is set -> status goes to TERDISTRIBUSI
    // - User can also set status manually (e.g. TERPOTONG, VERIFIKASI, FINISH)
    let finalStatus = data.status || qurban.status;
    if (qurban.status === 'OPEN' && newDistPointId && (!data.status || data.status === 'OPEN')) {
      finalStatus = 'TERDISTRIBUSI';
    }

    if (finalStatus === 'TERPOTONG' && qurban.status !== 'TERDISTRIBUSI' && qurban.status !== 'TERPOTONG') {
      throw new Error(`Perubahan status ke TERPOTONG hanya bisa dilakukan jika status awal adalah TERDISTRIBUSI (status saat ini: ${qurban.status}).`);
    }

    // 5. Update Qurban Fields
    // If distribution point is set, we set pic_lapangan to the user_pj of the point
    let picLapangan = qurban.pic_lapangan;
    if (newDistPointId) {
      const [pjResult] = await connection.query(
        'SELECT user_pj FROM distribusiqurban WHERE id = ?',
        [newDistPointId]
      );
      if (pjResult.length > 0) {
        picLapangan = pjResult[0].user_pj;
      }
    }

    const updates = {
      distribusi: newDistPointId,
      pic_lapangan: picLapangan,
      notes: data.notes,
      keterangan: data.keterangan,
      status: finalStatus,
      user: req.user.login,
      foto1: data.foto1,
      foto2: data.foto2,
      foto3: data.foto3,
      url_foto1: data.url_foto1,
      url_foto2: data.url_foto2,
      url_foto3: data.url_foto3,
      alasan: data.alasan
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
      params.push(detailId);
      await connection.query(
        `UPDATE dataqurban SET ${updateFields.join(', ')} WHERE detail_id = ?`,
        params
      );
    }

    await connection.commit();
    res.json({ message: 'Qurban updated successfully', status: finalStatus });
  } catch (err) {
    await connection.rollback();
    console.error('Update Qurban Error:', err);
    res.status(400).json({ message: err.message || 'Internal server error' });
  } finally {
    connection.release();
  }
});

// POST /api/qurban/:id/photos (Upload photos for Qurban)
// Fields: foto1, foto2, foto3
router.post('/:id/photos', authMiddleware, upload.fields([
  { name: 'foto1', maxCount: 1 },
  { name: 'foto2', maxCount: 1 },
  { name: 'foto3', maxCount: 1 }
]), async (req, res) => {
  const detailId = req.params.id;
  const files = req.files;

  if (!files || Object.keys(files).length === 0) {
    return res.status(400).json({ message: 'No photos uploaded' });
  }

  try {
    // 1. Fetch current qurban
    const [qurbans] = await pool.query('SELECT status, foto1, foto2, foto3 FROM dataqurban WHERE detail_id = ?', [detailId]);
    if (qurbans.length === 0) {
      return res.status(404).json({ message: 'Qurban record not found' });
    }

    const qurban = qurbans[0];
    if (qurban.status === 'FINISH') {
      return res.status(403).json({ message: 'This qurban record is FINISHED and locked.' });
    }

    const updates = {};

    // 2. Upload each photo
    const photoFields = ['foto1', 'foto2', 'foto3'];
    for (const field of photoFields) {
      if (files[field] && files[field][0]) {
        const fileObj = files[field][0];
        const localPath = fileObj.path;
        const targetKey = `qurban_photos/${detailId}_${field}${path.extname(fileObj.originalname)}`;
        
        // Upload to storage (COS or local fallback)
        const publicUrl = await uploadToStorage(localPath, targetKey);
        
        updates[field] = fileObj.filename; // filename stored in database
        updates[`url_${field}`] = publicUrl; // full url
      }
    }

    // Rule: "VERIFIKASI (jika data foto2 sdh di upload)"
    // Let's assume if at least two photos exist or are newly uploaded, we can set the status to VERIFIKASI
    // Let's check current + updated photos:
    const finalFoto1 = updates.foto1 || qurban.foto1;
    const finalFoto2 = updates.foto2 || qurban.foto2;
    const finalFoto3 = updates.foto3 || qurban.foto3;

    // If we have at least foto1 and foto2, let's mark it as VERIFIKASI automatically
    if (finalFoto1 && finalFoto2) {
      updates.status = 'VERIFIKASI';
    }

    const updateFields = [];
    const params = [];
    for (const [key, val] of Object.entries(updates)) {
      updateFields.push(`${key} = ?`);
      params.push(val);
    }

    if (updateFields.length > 0) {
      params.push(detailId);
      await pool.query(
        `UPDATE dataqurban SET ${updateFields.join(', ')} WHERE detail_id = ?`,
        params
      );
    }

    res.json({ 
      message: 'Photos uploaded successfully', 
      urls: {
        url_foto1: updates.url_foto1,
        url_foto2: updates.url_foto2,
        url_foto3: updates.url_foto3
      },
      status: updates.status || qurban.status
    });

  } catch (err) {
    console.error('Qurban Upload Photos Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
