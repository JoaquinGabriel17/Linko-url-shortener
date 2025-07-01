const express = require('express');
const router = express.Router();
const Url = require('../models/Url');

// Generador simple de código corto
const generateShortCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// Ruta para acortar una URL
router.post('/shorten', async (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) return res.status(400).json({ error: 'URL requerida' });

  const shortCode = generateShortCode();

  try {
    const newUrl = new Url({ originalUrl, shortCode });
    await newUrl.save();

    res.json({
      shortUrl: `${req.protocol}://${req.get('host')}/${shortCode}`,
      originalUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al acortar URL' });
  }
});

// Ruta para redirigir
router.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    const urlEntry = await Url.findOne({ shortCode });

    if (urlEntry) {
      res.redirect(urlEntry.originalUrl);
    } else {
      res.status(404).json({ error: 'URL no encontrada' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la redirección' });
  }
});

module.exports = router;
