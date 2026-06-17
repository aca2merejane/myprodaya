const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const mustahikRoutes = require('./routes/mustahik');
const penyaluranRoutes = require('./routes/penyaluran');
const qurbanRoutes = require('./routes/qurban');
const officeRoutes = require('./routes/office');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads from EdgeOne Pages Blob (with local static fallback)
app.use('/uploads', async (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  try {
    let getStore;
    try {
      getStore = require('@edgeone/pages-blob').getStore;
    } catch (e) {
      return next();
    }

    const key = req.path.replace(/^\//, ''); // Remove leading slash
    if (!key) return next();

    const store = getStore(process.env.BLOB_STORE_NAME || 'myprodaya-blob');
    
    try {
      const data = await store.get(key);
      if (!data) {
        return next();
      }

      const ext = path.extname(key).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.doc') contentType = 'application/msword';
      else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      res.setHeader('Content-Type', contentType);
      return res.send(data);
    } catch (err) {
      console.warn('EdgeOne Pages Blob read failed, falling back to static:', err.message);
      return next();
    }
  } catch (err) {
    console.error('Serve Blob Middleware Error:', err);
    return next();
  }
});

// Serve local upload files statically
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mustahik', mustahikRoutes);
app.use('/api/penyaluran', penyaluranRoutes);
app.use('/api/qurban', qurbanRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
