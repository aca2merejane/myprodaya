const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// Configure local upload folder as a fallback
const localUploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(localUploadDir)) {
  fs.mkdirSync(localUploadDir, { recursive: true });
}

// Multer storage config (saves locally first)
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, localUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

let cos = null;
if (process.env.COS_SECRET_ID && process.env.COS_SECRET_KEY) {
  cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY
  });
  console.log('Tencent COS initialized.');
} else {
  console.log('Tencent COS keys not set. Falling back to local storage.');
}

// Initialize Tencent EdgeOne Pages Blob Store if available
let blobStore = null;
let isBlobSupported = false;
try {
  const { getStore } = require('@edgeone/pages-blob');
  blobStore = getStore(process.env.BLOB_STORE_NAME || 'myprodaya-blob');
  isBlobSupported = true;
  console.log('Tencent EdgeOne Pages Blob Store initialized.');
} catch (e) {
  console.log('Tencent EdgeOne Pages Blob Store SDK not active. (Local fallback will be used)');
}

/**
 * Uploads a local file to Tencent COS, EdgeOne Pages Blob, or returns its local path if not configured.
 * @param {string} localFilePath Path to the local file
 * @param {string} targetKey Key/path in the bucket/store
 * @returns {Promise<string>} Public URL of the uploaded file
 */
function uploadToStorage(localFilePath, targetKey) {
  return new Promise(async (resolve, reject) => {
    // 1. Try Tencent EdgeOne Pages Blob Store first
    if (isBlobSupported && blobStore) {
      try {
        const fileBuffer = fs.readFileSync(localFilePath);
        await blobStore.set(targetKey, fileBuffer);
        
        // Clean up local temporary file after upload
        try {
          if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
          }
        } catch (e) {
          console.error('Failed to delete temp file:', e);
        }

        // Return a path that will be intercepted and served by our server route
        return resolve(`/uploads/${targetKey}`);
      } catch (blobErr) {
        console.warn('EdgeOne Pages Blob upload failed, falling back to COS/local:', blobErr.message);
      }
    }

    // 2. Fallback to Tencent COS
    if (cos) {
      cos.uploadFile({
        Bucket: process.env.COS_BUCKET || 'myprodaya',
        Region: process.env.COS_REGION || 'ap-jakarta',
        Key: targetKey,
        FilePath: localFilePath,
        ACL: 'public-read'
      }, (err, data) => {
        if (err) {
          console.warn('COS Upload Error, falling back to local storage:', err.message || err);
          const fileName = path.basename(localFilePath);
          const destPath = path.join(localUploadDir, fileName);
          try {
            if (localFilePath !== destPath) {
              fs.copyFileSync(localFilePath, destPath);
            }
            if (localFilePath !== destPath && fs.existsSync(localFilePath)) {
              fs.unlinkSync(localFilePath);
            }
          } catch (localErr) {
            console.error('Local File Save Error after COS fail:', localErr);
          }
          return resolve(`/uploads/${fileName}`);
        }

        // Clean up local file after successful upload
        try {
          if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
          }
        } catch (e) {
          console.error('Failed to delete temp file:', e);
        }
        
        let url = data.Location;
        if (url && !url.startsWith('http')) {
          url = `https://${url}`;
        }
        return resolve(url);
      });
    } else {
      // 3. Fallback to local filesystem storage
      const fileName = path.basename(localFilePath);
      const destPath = path.join(localUploadDir, fileName);
      try {
        if (localFilePath !== destPath) {
          fs.copyFileSync(localFilePath, destPath);
        }
        // If file was uploaded to temp by multer, delete the temp file
        if (localFilePath !== destPath && fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
      } catch (err) {
        console.error('Local File Save Error:', err);
      }
      return resolve(`/uploads/${fileName}`);
    }
  });
}

module.exports = {
  upload,
  uploadToStorage
};
