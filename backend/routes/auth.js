import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Hash de referencia para comparar cuando el email no existe (evita filtrar por
// tiempo de respuesta si la cuenta existe o no).
const DUMMY_HASH = bcrypt.hashSync('linko-dummy-password', 10);

const registerSchema = z.object({
  username: z
    .string({ error: 'El nombre de usuario es obligatorio' })
    .trim()
    .min(1, 'El nombre de usuario es obligatorio')
    .max(50, 'El nombre de usuario es demasiado largo'),
  email: z
    .string({ error: 'El email es obligatorio' })
    .trim()
    .toLowerCase()
    .email('Email inválido'),
  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

const loginSchema = z.object({
  email: z
    .string({ error: 'El email es obligatorio' })
    .trim()
    .toLowerCase()
    .email('Email inválido'),
  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria'),
});

function signToken(userId) {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

function publicUser(user) {
  return { id: user._id, username: user.username, email: user.email };
}

// Registro de nuevo usuario
router.post('/register', registerLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { username, email, password } = parsed.data;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const existingUserName = await User.findOne({ username });
    if (existingUserName) {
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: publicUser(newUser),
      token: signToken(newUser._id),
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { email, password } = parsed.data;

  try {
    const user = await User.findOne({ email });
    // Comparamos siempre (contra un hash falso si no existe) para no revelar
    // por tiempo si el email existe.
    const isMatch = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

    if (!user || !isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    res.status(200).json({
      message: 'Login exitoso',
      token: signToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
