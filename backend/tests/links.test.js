import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../app.js';
import Link from '../models/Link.js';
import { env } from '../config/env.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('POST /links/create', () => {
  it('crea un link anónimo', async () => {
    const res = await request(app)
      .post('/links/create')
      .send({ originalUrl: 'https://example.com/anonimo' });

    expect(res.status).toBe(201);
    expect(res.body.originalUrl).toBe('https://example.com/anonimo');
    expect(res.body.shortCode).toHaveLength(6);
    expect(res.body.shortUrl).toBe(`${env.BASE_URL}/${res.body.shortCode}`);

    const link = await Link.findOne({ shortCode: res.body.shortCode });
    expect(link).not.toBeNull();
    expect(link.createdBy).toBeUndefined();
    expect(link.clicks).toBe(0);
  });

  it('crea un link autenticado y asigna createdBy', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = jwt.sign({ id: userId.toString() }, env.JWT_SECRET);

    const res = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/autenticado', name: 'Mi link' });

    expect(res.status).toBe(201);

    const link = await Link.findOne({ shortCode: res.body.shortCode });
    expect(link).not.toBeNull();
    expect(link.createdBy.toString()).toBe(userId.toString());
    expect(link.name).toBe('Mi link');
  });
});

describe('GET /:shortCode', () => {
  it('redirige con 302 y Location a la URL original', async () => {
    const created = await request(app)
      .post('/links/create')
      .send({ originalUrl: 'https://example.com/destino' });

    const res = await request(app).get(`/${created.body.shortCode}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com/destino');
  });

  it('devuelve 404 si el código no existe', async () => {
    const res = await request(app).get('/codigo-inexistente');
    expect(res.status).toBe(404);
  });

  it('incrementa clicks en cada redirección', async () => {
    const created = await request(app)
      .post('/links/create')
      .send({ originalUrl: 'https://example.com/clicks' });

    const { shortCode } = created.body;

    await request(app).get(`/${shortCode}`);
    let link = await Link.findOne({ shortCode });
    expect(link.clicks).toBe(1);

    await request(app).get(`/${shortCode}`);
    link = await Link.findOne({ shortCode });
    expect(link.clicks).toBe(2);
  });
});
