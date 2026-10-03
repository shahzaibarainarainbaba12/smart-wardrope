import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  console.log(`Connecting to MongoDB: ${env.mongoUri.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@')}`);
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs
    });
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('\nMongoDB connection failed.');
    console.error('Make sure MongoDB is running locally, or set MONGODB_URI to MongoDB Atlas.');
    console.error(`Reason: ${error.message}\n`);
    throw error;
  }
}
