import dotenv from 'dotenv';
dotenv.config();

const splitEmails = value => String(value || '').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartwardrobe',
  mongoServerSelectionTimeoutMs: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
  jwtSecret: process.env.JWT_SECRET || 'dev_only_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-5.6',
  openAiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  trialDays: Number(process.env.TRIAL_DAYS || 8),
  adminEmails: splitEmails(process.env.ADMIN_EMAILS),
  superAdminEmails: splitEmails(process.env.SUPER_ADMIN_EMAILS || process.env.ADMIN_EMAILS),
};
