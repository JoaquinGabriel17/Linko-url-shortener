import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from '../config/env.js';
import { rateLimitStores } from '../middleware/rateLimit.js';

let mongoServer;

export async function connectDB() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}

export async function disconnectDB() {
  await mongoose.disconnect();
  await mongoServer.stop();
}

export async function clearDB() {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

export function makeToken(id, options = {}) {
  return jwt.sign({ id: id.toString() }, env.JWT_SECRET, {
    algorithm: 'HS256',
    ...options,
  });
}

export async function resetRateLimits() {
  await Promise.all(Object.values(rateLimitStores).map((store) => store.resetAll()));
}
