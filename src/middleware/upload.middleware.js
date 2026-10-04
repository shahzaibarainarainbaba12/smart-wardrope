import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

import { env } from '../config/env.js';

/* ======================================================
   ENSURE UPLOAD DIRECTORY EXISTS
====================================================== */

const uploadDir = path.resolve(env.uploadDir);

fs.mkdirSync(uploadDir, {
  recursive: true
});


/* ======================================================
   ALLOWED IMAGE TYPES
====================================================== */

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif'
]);


const extensionByMime = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif'
};


/* ======================================================
   STORAGE
====================================================== */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension =
      extensionByMime[file.mimetype] ||
      path.extname(file.originalname).toLowerCase() ||
      '.jpg';

    const uniqueName =
      `${Date.now()}-${crypto.randomUUID()}${extension}`;

    cb(null, uniqueName);
  }
});


/* ======================================================
   FILE FILTER
====================================================== */

const imageFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(
      new Error(
        'Only JPG, PNG, WEBP, GIF, HEIC and HEIF images are allowed'
      ),
      false
    );
  }

  cb(null, true);
};


/* ======================================================
   MULTER INSTANCE
====================================================== */

export const upload = multer({
  storage,

  limits: {
    // 10 MB
    fileSize: 10 * 1024 * 1024
  },

  fileFilter: imageFilter
});