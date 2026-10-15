import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../app.js';
import User from '../models/User.js';
import { clearDB, connectDB, disconnectDB, resetRateLimits } from './helpers.js';

beforeAll(connectDB);
afterEach(async () => {
  await clearDB();
  await resetRateLimits();
});
afterAll(disconnectDB);

const validUser = {
  username: 'juan',
  email: 'juan@example.com',
  password: 'password123',
};

describe('POST /auth/register', () => {
  it('registra un usuario y no expone el hash', async () => {
    const res = await request(app).post('/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toEqual({
      id: expect.any(String),
      username: 'juan',
      email: 'juan@example.com',
    });
    expect(JSON.stringify(res.body)).not.toContain('$2'); // no filtra el hash bcrypt
  });

  it('rechaza password corta', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ ...validUser, password: 'corta' });
    expect(res.status).toBe(400);
  });

  it('rechaza email inválido', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ ...validUser, email: 'no-es-email' });
    expect(res.status).toBe(400);
  });

  it('rechaza username faltante', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(400);
  });

  it('rechaza email duplicado', async () => {
    await request(app).post('/auth/register').send(validUser);
    const res = await request(app).post('/auth/register').send(validUser);
    expect(res.status).toBe(400);
  });

  it('normaliza el email a minúsculas', async () => {
    await request(app)
      .post('/auth/register')
      .send({ ...validUser, email: '  Juan@Example.COM ' });

    const user = await User.findOne({ email: 'juan@example.com' });
    expect(user).not.toBeNull();
  });

  it('devuelve 429 al superar el límite', async () => {
    // RATE_LIMIT_AUTH_MAX = 3
    await request(app).post('/auth/register').send({ ...validUser, email: 'a@a.com' });
    await request(app).post('/auth/register').send({ ...validUser, email: 'b@a.com' });
    await request(app).post('/auth/register').send({ ...validUser, email: 'c@a.com' });
    const res = await request(app).post('/auth/register').send({ ...validUser, email: 'd@a.com' });

    expect(res.status).toBe(429);
  });
});

describe('POST /auth/login', () => {
  it('inicia sesión con credenciales válidas', async () => {
    await request(app).post('/auth/register').send(validUser);
    const res = await request(app)
      .post('/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('acepta email con distinto casing', async () => {
    await request(app).post('/auth/register').send(validUser);
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'JUAN@EXAMPLE.COM', password: validUser.password });

    expect(res.status).toBe(200);
  });

  it('no revela si el email existe (password mala vs email inexistente)', async () => {
    await request(app).post('/auth/register').send(validUser);

    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ email: validUser.email, password: 'incorrecta123' });
    const noEmail = await request(app)
      .post('/auth/login')
      .send({ email: 'nadie@example.com', password: 'incorrecta123' });

    expect(wrongPassword.status).toBe(401);
    expect(noEmail.status).toBe(401);
    expect(wrongPassword.body.error).toBe(noEmail.body.error);
  });

  it('devuelve 429 tras varios intentos fallidos', async () => {
    // RATE_LIMIT_AUTH_MAX = 3, skipSuccessfulRequests: los fallidos cuentan.
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/auth/login')
        .send({ email: validUser.email, password: 'mala' });
    }
    const res = await request(app)
      .post('/auth/login')
      .send({ email: validUser.email, password: 'mala' });

    expect(res.status).toBe(429);
  });
});
