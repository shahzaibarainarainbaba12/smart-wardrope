// import dotenv from 'dotenv';
// dotenv.config();

// const splitEmails = value => String(value || '').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);

// export const env = {
//   port: Number(process.env.PORT || 5000),
//   nodeEnv: process.env.NODE_ENV || 'development',
//   mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartwardrobe',
//   mongoServerSelectionTimeoutMs: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
//   jwtSecret: process.env.JWT_SECRET || 'dev_only_change_me',
//   jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
//   clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
//   uploadDir: process.env.UPLOAD_DIR || 'uploads',
//   openAiApiKey: process.env.OPENAI_API_KEY || '',
//   openAiModel: process.env.OPENAI_MODEL || 'gpt-5.6',
//   openAiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
//   trialDays: Number(process.env.TRIAL_DAYS || 8),
//   adminEmails: splitEmails(process.env.ADMIN_EMAILS),
//   superAdminEmails: splitEmails(process.env.SUPER_ADMIN_EMAILS || process.env.ADMIN_EMAILS),
// };

import dotenv from 'dotenv';

dotenv.config();

const splitEmails = (value) =>
  String(value || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
};

export const env = {
  // App
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB
  mongoUri:
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/smartwardrobe',

  mongoServerSelectionTimeoutMs: Number(
    process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 30000
  ),

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev_only_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Frontend / CORS
  clientUrl:
    process.env.CLIENT_URL ||
    'http://localhost:5173',

  // Uploads
  uploadDir:
    process.env.UPLOAD_DIR ||
    'uploads',

  // Gemini AI
  geminiApiKey:
    process.env.GEMINI_API_KEY || '',

  geminiModel:
    process.env.GEMINI_MODEL ||
    'gemini-3.7-flash',

  geminiBaseUrl:
    process.env.GEMINI_BASE_URL ||
    'https://generativelanguage.googleapis.com',

  // Trial
  trialDays: Number(
    process.env.TRIAL_DAYS || 8
  ),

  // Admin
  adminEmails:
    splitEmails(process.env.ADMIN_EMAILS),

  superAdminEmails:
    splitEmails(
      process.env.SUPER_ADMIN_EMAILS ||
      process.env.ADMIN_EMAILS
    ),

  // Voice Assistant
  defaultWakeWord:
    process.env.DEFAULT_WAKE_WORD ||
    'Hey SmartWardrobe',

  voiceAssistantEnabled:
    toBoolean(
      process.env.VOICE_ASSISTANT_ENABLED,
      true
    ),

  // Camera / Gallery
  cameraUploadEnabled:
    toBoolean(
      process.env.CAMERA_UPLOAD_ENABLED,
      true
    ),

  galleryUploadEnabled:
    toBoolean(
      process.env.GALLERY_UPLOAD_ENABLED,
      true
    ),
};