import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { seedPlans } from './bootstrap/seedPlans.js';
import { logger } from './utils/logger.js';

async function start() {
  try {
    await connectDB();
    await seedPlans();
    const server = app.listen(env.port, () => {
      logger.info(`SmartWardrobe API running: http://localhost:${env.port}/api`);
      logger.info(`Health check: http://localhost:${env.port}/api/health`);
    });
    const shutdown = () => server.close(() => process.exit(0));
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}
start();
