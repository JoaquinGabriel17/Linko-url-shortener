import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
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

    const res = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${makeToken(userId)}`)
      .send({ originalUrl: 'https://example.com/autenticado', name: 'Mi link' });

    expect(res.status).toBe(201);

    const link = await Link.findOne({ shortCode: res.body.shortCode });
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

describe('GET /links', () => {
  it('devuelve solo los links del usuario autenticado', async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();

    await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${makeToken(userA)}`)
      .send({ originalUrl: 'https://example.com/a' });
    await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${makeToken(userB)}`)
      .send({ originalUrl: 'https://example.com/b' });

    const res = await request(app)
      .get('/links')
      .set('Authorization', `Bearer ${makeToken(userA)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].originalUrl).toBe('https://example.com/a');
  });

  it('ordena y limita con lista blanca', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = makeToken(userId);

    for (const [i, clicks] of [3, 1, 2].entries()) {
      await Link.create({
        originalUrl: `https://example.com/${i}`,
        shortCode: `code${i}`,
        createdBy: userId,
        clicks,
      });
    }

    const res = await request(app)
      .get('/links?sort=-clicks&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((l) => l.clicks)).toEqual([3, 2]);
  });

  it('rechaza sort fuera de la lista blanca', async () => {
    const token = makeToken(new mongoose.Types.ObjectId());
    const res = await request(app)
      .get('/links?sort=password')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

describe('PUT /links/:id y PATCH /links/:id', () => {
  it('edita un link propio (PUT)', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = makeToken(userId);
    const link = await Link.create({
      originalUrl: 'https://example.com/orig',
      shortCode: 'edit01',
      createdBy: userId,
    });

    const res = await request(app)
      .put(`/links/${link._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nuevo nombre', originalUrl: 'https://example.com/nuevo' });

    expect(res.status).toBe(200);
    expect(res.body.link.name).toBe('Nuevo nombre');
    expect(res.body.link.originalUrl).toBe('https://example.com/nuevo');
  });

  it('edita un link propio (PATCH)', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = makeToken(userId);
    const link = await Link.create({
      originalUrl: 'https://example.com/orig',
      shortCode: 'patch1',
      createdBy: userId,
    });

    const res = await request(app)
      .patch(`/links/${link._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Nueva desc' });

    expect(res.status).toBe(200);
    expect(res.body.link.description).toBe('Nueva desc');
  });

  it('rechaza URL no http/https al editar', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = makeToken(userId);
    const link = await Link.create({
      originalUrl: 'https://example.com/orig',
      shortCode: 'badurl',
      createdBy: userId,
    });

    const res = await request(app)
      .put(`/links/${link._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'javascript:alert(1)' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /links/:id', () => {
  it('elimina un link propio', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = makeToken(userId);
    const link = await Link.create({
      originalUrl: 'https://example.com/borrar',
      shortCode: 'del001',
      createdBy: userId,
    });

    const res = await request(app)
      .delete(`/links/${link._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await Link.findById(link._id)).toBeNull();
  });
});
