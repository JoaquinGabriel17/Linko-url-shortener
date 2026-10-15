import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import app from '../app.js';
import Link from '../models/Link.js';
import { env } from '../config/env.js';
import { clearDB, connectDB, disconnectDB, makeToken, resetRateLimits } from './helpers.js';

beforeAll(connectDB);
afterEach(async () => {
  await clearDB();
  await resetRateLimits();
});
afterAll(disconnectDB);

async function createLinkFor(userId) {
  const res = await request(app)
    .post('/links/create')
    .set('Authorization', `Bearer ${makeToken(userId)}`)
    .send({ originalUrl: 'https://example.com/privado' });
  return res.body.shortCode;
}

describe('IDOR / control de acceso', () => {
  it('B no ve los links de A en GET /links', async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    await createLinkFor(userA);

    const res = await request(app)
      .get('/links')
      .set('Authorization', `Bearer ${makeToken(userB)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('B no puede editar un link de A (404 y sin cambios)', async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    const link = await Link.create({
      originalUrl: 'https://example.com/a',
      shortCode: 'idorA1',
      createdBy: userA,
    });

    const res = await request(app)
      .put(`/links/${link._id}`)
      .set('Authorization', `Bearer ${makeToken(userB)}`)
      .send({ name: 'hackeado' });

    expect(res.status).toBe(404);
    const unchanged = await Link.findById(link._id);
    expect(unchanged.name).not.toBe('hackeado');
  });

  it('B no puede borrar un link de A (404 y sigue existiendo)', async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    const link = await Link.create({
      originalUrl: 'https://example.com/a',
      shortCode: 'idorA2',
      createdBy: userA,
    });

    const res = await request(app)
      .delete(`/links/${link._id}`)
      .set('Authorization', `Bearer ${makeToken(userB)}`);

    expect(res.status).toBe(404);
    expect(await Link.findById(link._id)).not.toBeNull();
  });

  it('un link anónimo no puede editarlo ni borrarlo un usuario autenticado', async () => {
    const other = new mongoose.Types.ObjectId();
    const link = await Link.create({
      originalUrl: 'https://example.com/anon',
      shortCode: 'anon01',
    });

    const del = await request(app)
      .delete(`/links/${link._id}`)
      .set('Authorization', `Bearer ${makeToken(other)}`);
    const put = await request(app)
      .put(`/links/${link._id}`)
      .set('Authorization', `Bearer ${makeToken(other)}`)
      .send({ name: 'x' });

    expect(del.status).toBe(404);
    expect(put.status).toBe(404);
  });

  it('rechaza mass assignment (clicks/createdBy) con 400', async () => {
    const userId = new mongoose.Types.ObjectId();
    const link = await Link.create({
      originalUrl: 'https://example.com/m',
      shortCode: 'mass01',
      createdBy: userId,
      clicks: 1,
    });

    const res = await request(app)
      .put(`/links/${link._id}`)
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ name: 'ok', clicks: 999, createdBy: new mongoose.Types.ObjectId().toString() });

    expect(res.status).toBe(400);
    const unchanged = await Link.findById(link._id);
    expect(unchanged.clicks).toBe(1);
  });
});

describe('Rutas viejas eliminadas', () => {
  it('GET /links/links ya no existe', async () => {
    const res = await request(app)
      .get('/links/links')
      .set('Authorization', `Bearer ${makeToken(new mongoose.Types.ObjectId())}`);
    expect(res.status).toBe(404);
  });

  it('PUT /links/edit ya no existe', async () => {
    const res = await request(app)
      .put('/links/edit')
      .set('Authorization', `Bearer ${makeToken(new mongoose.Types.ObjectId())}`)
      .send({ linkId: 'x', name: 'y' });
    expect(res.status).toBe(404);
  });

  it('DELETE /links/delete ya no existe', async () => {
    const res = await request(app)
      .delete('/links/delete')
      .set('Authorization', `Bearer ${makeToken(new mongoose.Types.ObjectId())}`);
    expect(res.status).toBe(404);
  });
});

describe('JWT', () => {
  const url = '/links';

  it('sin token → 401', async () => {
    expect((await request(app).get(url)).status).toBe(401);
  });

  it('token inválido → 401', async () => {
    const res = await request(app).get(url).set('Authorization', 'Bearer no-es-un-token');
    expect(res.status).toBe(401);
  });

  it('token expirado → 401', async () => {
    const token = makeToken(new mongoose.Types.ObjectId(), { expiresIn: '-1s' });
    const res = await request(app).get(url).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('token firmado con HS512 (algorithm no permitido) → 401', async () => {
    const token = jwt.sign({ id: new mongoose.Types.ObjectId().toString() }, env.JWT_SECRET, {
      algorithm: 'HS512',
    });
    const res = await request(app).get(url).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('token válido pero sin id → 401', async () => {
    const token = jwt.sign({ sub: 'sin-id' }, env.JWT_SECRET, { algorithm: 'HS256' });
    const res = await request(app).get(url).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('CORS', () => {
  const allowed = 'http://localhost:5173';
  const disallowed = 'http://evil.example.com';

  it('permite el origen de la lista', async () => {
    const res = await request(app).get('/').set('Origin', allowed);
    expect(res.headers['access-control-allow-origin']).toBe(allowed);
  });

  it('no agrega el header para un origen no permitido', async () => {
    const res = await request(app).get('/').set('Origin', disallowed);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('responde el preflight de un origen permitido', async () => {
    const res = await request(app)
      .options('/links/create')
      .set('Origin', allowed)
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(allowed);
  });

  it('no permite el preflight de un origen no permitido', async () => {
    const res = await request(app)
      .options('/links/create')
      .set('Origin', disallowed)
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Rate limiting de creación', () => {
  it('devuelve 429 al superar el límite', async () => {
    // RATE_LIMIT_CREATE_MAX = 5
    for (let i = 0; i < 5; i++) {
      await request(app).post('/links/create').send({ originalUrl: `https://example.com/${i}` });
    }
    const res = await request(app)
      .post('/links/create')
      .send({ originalUrl: 'https://example.com/extra' });

    expect(res.status).toBe(429);
  });
});
