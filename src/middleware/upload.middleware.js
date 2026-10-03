import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env.js';
fs.mkdirSync(env.uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, env.uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`)
});
export const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (_, file, cb) => cb(null, /^image\//.test(file.mimetype)) });
