import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

import app from '../app.js';
import Link from '../models/Link.js';
import { env } from '../config/env.js';
import { clearDB, connectDB, disconnectDB, makeToken, resetRateLimits } from './helpers.js';
import * as shortCode from '../services/shortCode.js';

// Se mockea generateCode para poder forzar colisiones de forma determinista en
// los tests de integración (el resto del tiempo delega en la implementación real).
vi.mock('../services/shortCode.js', async (importOriginal) => {
  const actual = await importOriginal();
  const generateCode = vi.fn(actual.generateCode);
  generateCode.real = actual.generateCode;
  return { ...actual, generateCode };
});

beforeAll(async () => {
  await connectDB();
  // Construye los índices (incluido el único de shortCode) antes de testear.
  await Link.init();
});
afterEach(async () => {
  await clearDB();
  await resetRateLimits();
  shortCode.generateCode.mockReset();
  shortCode.generateCode.mockImplementation(shortCode.generateCode.real);
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

  it('con token inválido responde 401 y no crea ningún link', async () => {
    const res = await request(app)
      .post('/links/create')
      .set('Authorization', 'Bearer no-es-un-token')
      .send({ originalUrl: 'https://example.com/invalido' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(await Link.countDocuments()).toBe(0);
  });

  it('con token expirado responde 401 y no crea ningún link', async () => {
    const token = makeToken(new mongoose.Types.ObjectId(), { expiresIn: '-1s' });

    const res = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/expirado' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(await Link.countDocuments()).toBe(0);
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
    // El listado expone el enlace corto y los datos del dashboard reales.
    expect(res.body[0].shortUrl).toBe(`${env.BASE_URL}/${res.body[0].shortCode}`);
    expect(res.body[0].clicks).toBe(0);
    expect(res.body[0].createdAt).toBeDefined();
    expect(res.body[0]).not.toHaveProperty('name');
    expect(res.body[0]).not.toHaveProperty('description');
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

describe('Índices de Link', () => {
  it('existe un índice único sobre shortCode', async () => {
    const indexes = await Link.collection.indexes();
    const uniqueShortCode = indexes.find(
      (index) => index.unique === true && index.key?.shortCode === 1
    );
    expect(uniqueShortCode).toBeDefined();
  });
});

describe('Alias personalizado', () => {
  it('crea un link con alias válido autenticado', async () => {
    const token = makeToken(new mongoose.Types.ObjectId());

    const res = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/alias', shortCode: 'mi-alias_1' });

    expect(res.status).toBe(201);
    expect(res.body.shortCode).toBe('mi-alias_1');
  });

  it('rechaza alias duplicado con 409', async () => {
    const token = makeToken(new mongoose.Types.ObjectId());

    const first = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/a', shortCode: 'repetido' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/b', shortCode: 'repetido' });

    expect(second.status).toBe(409);
    expect(await Link.countDocuments({ shortCode: 'repetido' })).toBe(1);
  });

  it('rechaza alias reservado con 400', async () => {
    const token = makeToken(new mongoose.Types.ObjectId());

    const res = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/reservado', shortCode: 'API' });

    expect(res.status).toBe(400);
  });

  it('rechaza alias con charset inválido con 400', async () => {
    const token = makeToken(new mongoose.Types.ObjectId());

    const res = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/charset', shortCode: 'a/b' });

    expect(res.status).toBe(400);
  });

  it('rechaza alias de anónimo con 401', async () => {
    const res = await request(app)
      .post('/links/create')
      .send({ originalUrl: 'https://example.com/anon-alias', shortCode: 'mialias' });

    expect(res.status).toBe(401);
    expect(await Link.countDocuments()).toBe(0);
  });
});

describe('Colisión de código', () => {
  it('reintenta ante una colisión simulada y nunca devuelve 500', async () => {
    await Link.create({ originalUrl: 'https://example.com/colision', shortCode: 'COLI01' });

    shortCode.generateCode
      .mockReturnValueOnce('COLI01')
      .mockReturnValueOnce('NUEVO1');

    const res = await request(app)
      .post('/links/create')
      .send({ originalUrl: 'https://example.com/otro' });

    expect(res.status).toBe(201);
    expect(res.body.shortCode).toBe('NUEVO1');
    expect(shortCode.generateCode).toHaveBeenCalledTimes(2);
  });

  it('devuelve 503 (no 500) si se agotan los reintentos', async () => {
    shortCode.generateCode.mockReturnValue('SIEMPR');

    // Se ocupa el código para forzar colisión en cada intento.
    await Link.create({ originalUrl: 'https://example.com/colision', shortCode: 'SIEMPR' });

    const res = await request(app)
      .post('/links/create')
      .send({ originalUrl: 'https://example.com/otro' });

    expect(res.status).toBe(503);
    expect(res.headers['retry-after']).toBeDefined();
  });
});

describe('Deduplicación', () => {
  it('devuelve 200 con el mismo link para el mismo usuario y URL', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = makeToken(userId);

    const first = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/dedup' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/dedup' });

    expect(second.status).toBe(200);
    expect(second.body.shortCode).toBe(first.body.shortCode);
    expect(second.body.deduplicated).toBe(true);
    expect(await Link.countDocuments({ createdBy: userId })).toBe(1);
  });

  it('deduplica comparando la URL normalizada', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = makeToken(userId);

    const first = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/norm' });
    const second = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'HTTPS://Example.com:443/norm' });

    expect(second.status).toBe(200);
    expect(second.body.shortCode).toBe(first.body.shortCode);
  });

  it('forceNew crea un link nuevo (201)', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = makeToken(userId);

    const first = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/force' });
    const second = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/force', forceNew: true });

    expect(second.status).toBe(201);
    expect(second.body.shortCode).not.toBe(first.body.shortCode);
    expect(await Link.countDocuments({ createdBy: userId })).toBe(2);
  });

  it('no deduplica si viene name o description', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = makeToken(userId);

    await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/meta' });
    const second = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/meta', name: 'Con nombre' });

    expect(second.status).toBe(201);
    expect(await Link.countDocuments({ createdBy: userId })).toBe(2);
  });

  it('no deduplica anónimos', async () => {
    const first = await request(app)
      .post('/links/create')
      .send({ originalUrl: 'https://example.com/anon-dedup' });
    const second = await request(app)
      .post('/links/create')
      .send({ originalUrl: 'https://example.com/anon-dedup' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await Link.countDocuments()).toBe(2);
  });
});

describe('Validación de URL al crear', () => {
  it('rechaza javascript: con 400 y no guarda', async () => {
    const res = await request(app)
      .post('/links/create')
      .send({ originalUrl: 'javascript:alert(1)' });

    expect(res.status).toBe(400);
    expect(await Link.countDocuments()).toBe(0);
  });

  it('rechaza URLs de más de 2048 caracteres', async () => {
    const res = await request(app)
      .post('/links/create')
      .send({ originalUrl: `https://example.com/${'a'.repeat(2100)}` });

    expect(res.status).toBe(400);
  });

  it('rechaza auto-referencia a BASE_URL', async () => {
    const res = await request(app)
      .post('/links/create')
      .send({ originalUrl: `${env.BASE_URL}/algo` });

    expect(res.status).toBe(400);
  });

  it('rechaza credenciales embebidas', async () => {
    const res = await request(app)
      .post('/links/create')
      .send({ originalUrl: 'https://user:pass@example.com' });

    expect(res.status).toBe(400);
  });
});

describe('Validación de edición', () => {
  it('rechaza intentar modificar el shortCode con 400', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = makeToken(userId);
    const link = await Link.create({
      originalUrl: 'https://example.com/sin-cambio',
      shortCode: 'fijo01',
      createdBy: userId,
    });

    const res = await request(app)
      .put(`/links/${link._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ shortCode: 'nuevo1' });

    expect(res.status).toBe(400);
    const unchanged = await Link.findById(link._id);
    expect(unchanged.shortCode).toBe('fijo01');
  });

  it('recalcula normalizedUrl al cambiar originalUrl', async () => {
    const userId = new mongoose.Types.ObjectId();
    const token = makeToken(userId);

    const created = await request(app)
      .post('/links/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/viejo' });
    const link = await Link.findOne({ shortCode: created.body.shortCode });
    expect(link.normalizedUrl).toBe('https://example.com/viejo');

    const res = await request(app)
      .put(`/links/${link._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ originalUrl: 'https://example.com/nuevo' });

    expect(res.status).toBe(200);
    expect(res.body.link.normalizedUrl).toBe('https://example.com/nuevo');
  });

  it('un id malformado no produce 500', async () => {
    const token = makeToken(new mongoose.Types.ObjectId());

    const put = await request(app)
      .put('/links/no-es-un-objectid')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'x' });
    const del = await request(app)
      .delete('/links/no-es-un-objectid')
      .set('Authorization', `Bearer ${token}`);

    expect(put.status).toBe(404);
    expect(del.status).toBe(404);
  });
});
