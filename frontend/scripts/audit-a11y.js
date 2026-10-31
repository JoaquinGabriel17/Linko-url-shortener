// Fase 5 — Audit de accesibilidad (MEDICIÓN, no fixea nada).
//
// Fases (orden por valor de reporte; hard cap 60 min global):
//   1. axe-core: rutas + overlays (violations + incomplete)
//   2. Chequeos rápidos: skip link (2.4.1), touch targets (2.5.8, con
//      excepción de spacing), aria-hidden-focus (4.1.2), reduced-motion
//      runtime, forced-colors (P1, screenshots)
//   3. Contraste renderizado real: pares estáticos + hover/active vía
//      CSS.forcePseudoState + peor punto sobre gradiente
//   4. Teclado: tab walk, Esc, focus return, trampa, heurística de saltos
//   5. Lighthouse (solo Accesibilidad) en /, /login, /user — /user con
//      seeding de sesión time-boxeado a 15 min
//
// Uso: npm run audit:a11y   (requisitos: Chrome, frontend :5173, API :10000)
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

/* global axe */
// `axe` se inyecta en la página con page.addScriptTag (axe-core).

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP = 'http://localhost:5173';
const API = 'http://localhost:10000';
const OUT = path.join(os.tmpdir(), 'a11y');
const HARD_CAP_MS = 60 * 60 * 1000;
const LH_USER_TIMEBOX_MS = 15 * 60 * 1000;

const T0 = Date.now();
fs.mkdirSync(OUT, { recursive: true });

const R = {
  axe: [],
  quick: { skipLink: [], touch: [], ariaHidden: [], reducedMotion: null, forcedColors: [] },
  contrast: [],
  keyboard: { walks: [], overlays: [], anomalies: [] },
  lighthouse: [],
  notExecuted: [],
  phaseErrors: [],
};

const elapsed = () => Math.round((Date.now() - T0) / 1000);
const phase = (n) => console.log(`\n===== [${elapsed()}s] PHASE: ${n} =====`);
const overCap = () => Date.now() - T0 > HARD_CAP_MS;
function recordPhaseError(name, e) {
  R.phaseErrors.push({ phase: name, error: String(e?.message || e).slice(0, 300) });
  console.log(`!! PHASE ERROR ${name}: ${e?.message || e}`);
}
function skip(name, why) {
  R.notExecuted.push({ check: name, cause: why });
  console.log(`-- SKIP ${name}: ${why}`);
}

// ---------- SC mapping (axe tags → columna WCAG AA SC) ----------
function mapAxeTags(tags) {
  const scs = tags
    .filter((t) => /^wcag\d{3}$/.test(t))
    .map((t) => `${t[4]}.${t[5]}.${t[6]}`);
  let level = '';
  if (tags.some((t) => /^wcag2[12]?aa$/.test(t))) level = 'AA';
  else if (tags.some((t) => /^wcag2[12]?a$/.test(t))) level = 'A';
  else if (tags.some((t) => /^wcag2[12]?aaa$/.test(t))) level = 'AAA';
  if (scs.length) return { sc: `${scs.join(', ')}${level ? ` (${level})` : ''}`, bucket: 'WCAG' };
  if (tags.includes('best-practice')) return { sc: 'best-practice', bucket: 'BP' };
  return { sc: 'N/A', bucket: 'OTHER' };
}

// ---------- utilidades de sesión/API ----------
async function registerUser(page) {
  const reg = await page.evaluate(async (api) => {
    const r = await fetch(`${api}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `a11y${Date.now()}`,
        email: `a11y${Date.now()}@test.com`,
        password: 'password123',
      }),
    });
    return { status: r.status, body: await r.json() };
  }, API);
  if (reg.status !== 201) throw new Error('register a11y falló: ' + JSON.stringify(reg));
  return {
    token: reg.body.token,
    username: reg.body.user.username,
    email: reg.body.user.email,
    userId: reg.body.user.id,
  };
}

async function seedSession(page, session) {
  await page.evaluate((s) => sessionStorage.setItem('user', JSON.stringify(s)), session);
}

async function createLink(page, token, url) {
  return page.evaluate(
    async (api, tok, originalUrl) => {
      const r = await fetch(`${api}/links/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ originalUrl }),
      });
      return r.status;
    },
    API,
    token,
    url
  );
}

async function clickWhere(page, selector, pred) {
  const ok = await page.evaluate(
    (sel, predSrc) => {
      const fn = new Function('e', 'return ' + predSrc);
      const el = [...document.querySelectorAll(sel)].find(fn);
      if (!el) return false;
      el.click();
      return true;
    },
    selector,
    pred
  );
  if (!ok) throw new Error(`clickWhere: no encontré ${selector} / ${pred}`);
}

const waitOpen = (page) =>
  page.waitForFunction(() => document.querySelector('dialog[open]') !== null, { timeout: 5000 });
const waitClosed = (page) =>
  page.waitForFunction(() => document.querySelector('dialog[open]') === null, { timeout: 5000 });

// ---------- PHASE 1: axe ----------
async function runAxe(page, label) {
  await page.addScriptTag({ path: AXE_PATH });
  const res = await page.evaluate(async () => {
    const r = await axe.run(document, { resultTypes: ['violations', 'incomplete'] });
    const pack = (v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.slice(0, 6).map((n) => ({
        target: n.target,
        html: String(n.html || '').slice(0, 220),
        summary: String(n.failureSummary || '').slice(0, 300),
      })),
      nodeCount: v.nodes.length,
    });
    return { violations: r.violations.map(pack), incomplete: r.incomplete.map(pack) };
  });
  R.axe.push({ label, ...res });
  // Mapeo de tags axe → columna "WCAG AA SC" (número de SC / best-practice)
  for (const group of [R.axe.at(-1).violations, R.axe.at(-1).incomplete]) {
    for (const v of group) Object.assign(v, mapAxeTags(v.tags));
  }
  console.log(
    `axe [${label}]: ${res.violations.length} violations, ${res.incomplete.length} incomplete`
  );
}

async function phaseAxe(page) {
  phase('1. axe-core rutas');
  const routes = ['/', '/login', '/register', '/ruta-audit-404'];
  for (const r of routes) {
    await page.goto(APP + r, { waitUntil: 'networkidle0' });
    await runAxe(page, r);
  }

  phase('1b. axe /user + overlays');
  await page.goto(APP, { waitUntil: 'networkidle0' });
  const session = await registerUser(page);
  await seedSession(page, session);
  await createLink(page, session.token, 'https://example.com/a11y/ruta/bastante/larga');
  await page.goto(APP + '/user', { waitUntil: 'networkidle0' });
  await runAxe(page, '/user');

  // Overlay UrlForm
  await clickWhere(page, 'button', 'e.textContent.includes("Nuevo link")');
  await waitOpen(page);
  await runAxe(page, '/user + overlay UrlForm');
  await clickWhere(page, 'button', 'e.getAttribute("aria-label")==="Cerrar"');
  await waitClosed(page);

  // Overlay EditLink
  await clickWhere(page, 'button', 'e.getAttribute("aria-label")==="Opciones"');
  await page.waitForFunction(
    () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Editar'),
    { timeout: 4000 }
  );
  await clickWhere(page, 'button', 'e.textContent.trim()==="Editar"');
  await waitOpen(page);
  await runAxe(page, '/user + overlay EditLink');
  await page.keyboard.press('Escape');
  await waitClosed(page);

  // Overlay Alert confirm
  await clickWhere(page, 'button', 'e.getAttribute("aria-label")==="Opciones"');
  await page.waitForFunction(
    () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Eliminar'),
    { timeout: 4000 }
  );
  await clickWhere(page, 'button', 'e.textContent.trim()==="Eliminar"');
  await page.waitForSelector('dialog[open][role="alertdialog"]', { timeout: 4000 });
  await runAxe(page, '/user + overlay Alert confirm');
  await clickWhere(page, 'button', 'e.textContent.trim()==="Cancelar"');
  await waitClosed(page);

  // Overlay Alert error (EditLink sin cambios)
  await clickWhere(page, 'button', 'e.getAttribute("aria-label")==="Opciones"');
  await page.waitForFunction(
    () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Editar'),
    { timeout: 4000 }
  );
  await clickWhere(page, 'button', 'e.textContent.trim()==="Editar"');
  await waitOpen(page);
  await clickWhere(page, 'dialog[open] button', 'e.type==="submit"');
  await page.waitForSelector('dialog[open][role="alertdialog"]', { timeout: 4000 });
  await runAxe(page, '/user + overlay Alert error');
  await clickWhere(page, 'button', 'e.textContent.trim()==="Cerrar"');
  await page.keyboard.press('Escape');
  await waitClosed(page);
  return session;
}

// ---------- PHASE 2: chequeos rápidos ----------
async function checkSkipLink(page, route) {
  await page.goto(APP + route, { waitUntil: 'networkidle0' });
  const found = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="#main"], a[href^="#content"], [class*="skip"]')].map(
      (e) => ({ tag: e.tagName, href: e.getAttribute('href'), cls: String(e.className).slice(0, 60) })
    )
  );
  R.quick.skipLink.push({ route, found, pass: found.length > 0 });
}

async function checkTouchTargets(page, route, { dropdown = false } = {}) {
  await page.setViewport({ width: 375, height: 800, isMobile: true, hasTouch: true });
  await page.goto(APP + route, { waitUntil: 'networkidle0' });
  if (dropdown) {
    await clickWhere(page, 'button', 'e.getAttribute("aria-label")==="Opciones"');
    await page.waitForFunction(
      () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Eliminar'),
      { timeout: 4000 }
    );
  }
  const res = await page.evaluate(() => {
    const isShown = (el, r) => {
      if (!r.width || !r.height) return false;
      if (r.width <= 1 && r.height <= 1) return false; // sr-only
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') return false;
      if (el.closest('dialog:not([open])')) return false;
      return true;
    };
    const sel = 'a[href], button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
    const targets = [];
    document.querySelectorAll(sel).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!isShown(el, r)) return;
      targets.push({
        tag: el.tagName,
        label: (el.getAttribute('aria-label') || el.textContent || el.id || '')
          .trim()
          .slice(0, 40),
        cls: String(el.className).slice(0, 60),
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        cx: r.x + r.width / 2,
        cy: r.y + r.height / 2,
        html: String(el.outerHTML).slice(0, 140),
      });
    });
    const undersized = [];
    for (const t of targets) {
      if (t.w >= 24 && t.h >= 24) continue;
      let best = null;
      for (const o of targets) {
        if (o === t) continue;
        const d = Math.hypot(o.cx - t.cx, o.cy - t.cy);
        if (!best || d < best.d) best = d;
      }
      // Excepción spacing de SC 2.5.8: centro-a-centro ≥24px al target adyacente.
      const spacingOk = best !== null && best >= 24;
      undersized.push({
        tag: t.tag,
        label: t.label,
        cls: t.cls,
        w: t.w,
        h: t.h,
        nearestCenterDist: best === null ? null : Math.round(best * 10) / 10,
        verdict: spacingOk ? 'PASS-spacing' : 'FAIL',
        html: t.html,
      });
    }
    return { total: targets.length, undersized };
  });
  R.quick.touch.push({ route, dropdown, ...res });
}

async function checkAriaHiddenFocus(page, route) {
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(APP + route, { waitUntil: 'networkidle0' });
  const res = await page.evaluate(() => {
    const FOCUSABLE =
      'a[href], button, input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])';
    const bad = [];
    document.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
      const selfFocusable =
        (el.matches(FOCUSABLE) && (el.tabIndex >= 0 || el.tagName === 'A' || el.tagName === 'BUTTON')) ||
        el.tabIndex >= 0;
      const desc = [...el.querySelectorAll(FOCUSABLE)].filter((d) => d.tabIndex >= 0);
      if (selfFocusable || desc.length) {
        bad.push({
          tag: el.tagName,
          cls: String(el.className).slice(0, 60),
          selfFocusable,
          descFocusable: desc.slice(0, 3).map((d) => String(d.outerHTML).slice(0, 100)),
        });
      }
    });
    return bad;
  });
  R.quick.ariaHidden.push({ route, issues: res });
}

async function checkReducedMotion(page) {
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  const res = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.transition = 'opacity 2s ease';
    probe.style.animation = 'spin 2s linear infinite';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const out = {
      probeTransition: cs.transitionDuration,
      probeAnimation: cs.animationDuration,
      samples: [],
    };
    for (const sel of ['form button[type="submit"]', 'nav a', '[class*="container"] button']) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const c = getComputedStyle(el);
      out.samples.push({ sel, transition: c.transitionDuration, animation: c.animationDuration });
    }
    probe.remove();
    return out;
  });
  const maxMs = (str) =>
    Math.max(
      ...String(str)
        .split(',')
        .map((s) => {
          const v = parseFloat(s);
          if (Number.isNaN(v)) return 0;
          return /ms/.test(s) ? v : /s/.test(s) ? v * 1000 : v;
        })
    );
  const probeOk = maxMs(res.probeTransition) <= 0.05 && maxMs(res.probeAnimation) <= 0.05;
  const samplesOk = res.samples.every(
    (s) => maxMs(s.transition) <= 0.05 && maxMs(s.animation) <= 0.05
  );
  R.quick.reducedMotion = { ...res, probeOk, samplesOk, pass: probeOk && samplesOk };
  await cdp.send('Emulation.setEmulatedMedia', { features: [] });
}

async function checkForcedColors(page) {
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'forced-colors', value: 'active' }],
  });
  for (const route of ['/login', '/user']) {
    await page.goto(APP + route, { waitUntil: 'networkidle0' });
    const file = path.join(OUT, `forced-colors${route.replace(/\//g, '-') || '-home'}.png`);
    await page.screenshot({ path: file, fullPage: true });
    const sanity = await page.evaluate(() => {
      const vis = [];
      for (const sel of ['h1, h2', 'input', 'button', 'a']) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        vis.push({
          sel,
          w: Math.round(r.width),
          h: Math.round(r.height),
          color: cs.color,
          bg: cs.backgroundColor,
          transparent: cs.color === 'transparent' || cs.opacity === '0',
        });
      }
      return vis;
    });
    R.quick.forcedColors.push({ route, screenshot: file, sanity });
  }
  await cdp.send('Emulation.setEmulatedMedia', { features: [] });
}

// ---------- PHASE 3: contraste renderizado ----------
const CONTRAST_PAGE_FN = `(selectors) => {
  function parseRGBA(str) {
    const m = String(str).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const parts = m[1].split(',').map((s) => parseFloat(s));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }
  function over(fg, bg) {
    const a = fg.a + bg.a * (1 - fg.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
      g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
      b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
      a,
    };
  }
  function lum(c) {
    const f = (v) => {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function ratio(c1, c2) {
    const l1 = lum(c1), l2 = lum(c2);
    const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
  }
  // Muestra un gradiente lineal en una posición t∈[0,1] del eje del gradiente.
  function sampleGradient(css, t) {
    const stops = [];
    // % opcional: los stops sin posición (ej. gradient-page) van equiespaciados.
    // (Doble backslash: esto vive dentro de un template literal y en runtime
    // debe llegar como regex con escapes individuales.)
    const re = /rgba?\\(([^)]+)\\)\\s*(?:([\\d.]+)%)?/g;
    let m;
    while ((m = re.exec(css))) {
      stops.push({ color: parseRGBA('rgb(' + m[1] + ')'), pos: m[2] !== undefined ? parseFloat(m[2]) / 100 : null });
    }
    if (stops.length < 2) return null;
    if (stops[0].pos === null) stops.forEach((s, i) => { s.pos = i / (stops.length - 1); });
    const tt = Math.min(1, Math.max(0, t));
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      if (tt >= a.pos && tt <= b.pos) {
        const span = b.pos - a.pos || 1;
        const k = (tt - a.pos) / span;
        return {
          r: a.color.r + (b.color.r - a.color.r) * k,
          g: a.color.g + (b.color.g - a.color.g) * k,
          b: a.color.b + (b.color.b - a.color.b) * k,
          a: 1,
        };
      }
    }
    return stops[stops.length - 1].color;
  }
  function analyze(el) {
    const cs = getComputedStyle(el);
    const color = parseRGBA(cs.color);
    if (!color || color.a === 0) return null;
    const fontSizePx = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && weight >= 700);
    // Camino hacia arriba: colores compuestos + gradientes encontrados.
    const layers = [];
    let node = el;
    let gradient = null;
    while (node) {
      const ncs = getComputedStyle(node);
      if (ncs.backgroundImage && ncs.backgroundImage !== 'none' && !gradient) {
        gradient = { css: ncs.backgroundImage, node };
      }
      const c = parseRGBA(ncs.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
      node = node.parentElement;
    }
    layers.reverse(); // de afuera hacia adentro
    let base = layers.length ? layers[0] : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = 1; i < layers.length; i++) base = over(layers[i], base);
    const elRect = el.getBoundingClientRect();
    const info = {
      selector: (el.getAttribute('class') || el.tagName).toString().slice(0, 80),
      tag: el.tagName,
      text: (el.textContent || '').trim().slice(0, 50),
      color: 'rgb(' + Math.round(color.r) + ',' + Math.round(color.g) + ',' + Math.round(color.b) + ')',
      fontSizePx, weight, large, threshold: large ? 3 : 4.5,
      gradient: null, worstRatio: null, worstBg: null, hasGradient: !!gradient,
    };
    if (gradient) {
      // Peor punto: se muestrea el gradiente en8 puntos a lo largo del eje
      // sobre el rect del texto (no el promedio). Aproximación documentada:
      // las capas entre el texto y el gradiente suelen ser transparentes.
      const gRect = gradient.node.getBoundingClientRect();
      const toRight = /to right|to left/.test(gradient.css);
      const samples = [];
      const N = 8;
      for (let i = 0; i <= N; i++) {
        let bgc;
        if (toRight) {
          const x = elRect.left + (elRect.width * i) / N;
          let t = (x - gRect.left) / (gRect.width || 1);
          if (/to left/.test(gradient.css)) t = 1 - t;
          bgc = sampleGradient(gradient.css, t);
        } else {
          const y = elRect.top + (elRect.height * i) / N;
          let t = (y - gRect.top) / (gRect.height || 1);
          // El eje del gradiente empieza donde está el PRIMER stop:
          // 'to top' → primer stop abajo → t=0 es el borde inferior.
          if (/to top/.test(gradient.css)) t = 1 - t;
          bgc = sampleGradient(gradient.css, t);
        }
        if (bgc) samples.push(over(bgc, base));
      }
      const ratios = samples.filter(Boolean).map((s) => ratio(color, s));
      info.gradient = gradient.css.slice(0, 120);
      info.worstRatio = ratios.length ? Math.round(Math.min(...ratios) * 100) / 100 : null;
      info.worstBg = 'gradient-sample (peor punto)';
      if (info.worstRatio !== null) info.pass = info.worstRatio >= info.threshold;
      return info;
    }
    const r = ratio(color, base);
    info.worstRatio = Math.round(r * 100) / 100;
    info.worstBg = 'rgb(' + Math.round(base.r) + ',' + Math.round(base.g) + ',' + Math.round(base.b) + ')';
    info.pass = r >= info.threshold;
    return info;
  }
  const out = [];
  for (const sel of selectors) {
    const els = [...document.querySelectorAll(sel)].slice(0, 4);
    for (const el of els) {
      const a = analyze(el);
      if (a) out.push({ query: sel, ...a });
    }
  }
  return out;
}`;

async function contrastOn(page, route, selectors) {
  await page.goto(APP + route, { waitUntil: 'networkidle0' });
  const out = await page.evaluate(new Function('selectors', `return (${CONTRAST_PAGE_FN})(selectors)`), selectors);
  out.forEach((o) => R.contrast.push({ route, ...o }));
}

async function contrastForcedPseudo(page) {
  // hover/active de: botón primario (home), dropdown .danger, nav li.
  const cdp = await page.createCDPSession();
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const cases = [
    { route: '/', selector: 'form button[type="submit"]', states: [['hover'], ['hover', 'active']] },
    {
      route: '/user',
      selector: '[class*="dropdownMenu"] [class*="danger"]',
      states: [['hover'], ['hover', 'active']],
      needsDropdown: true,
    },
    { route: '/', selector: 'nav li', states: [['hover']] },
    { route: '/register', selector: '[class*="loginButton"]', states: [['hover'], ['hover', 'active']] },
  ];
  for (const c of cases) {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(APP + c.route, { waitUntil: 'networkidle0' });
    if (c.needsDropdown) {
      await clickWhere(page, 'button', 'e.getAttribute("aria-label")==="Opciones"');
      await page.waitForFunction(
        () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Eliminar'),
        { timeout: 4000 }
      );
    }
    const doc = await cdp.send('DOM.getDocument');
    const q = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: c.selector });
    if (!q.nodeId) {
      R.contrast.push({ route: c.route, query: c.selector, pseudo: 'n/a', pass: null, note: 'elemento no encontrado' });
      continue;
    }
    for (const states of c.states) {
      await cdp.send('CSS.forcePseudoState', { nodeId: q.nodeId, forcedPseudoClasses: states });
      // Esperar > duración de la transición (background-color 0.2s en
      // :where(button)) para NO medir a mitad de la animación.
      await new Promise((r) => setTimeout(r, 320));
      const measured = await page.evaluate((sel) => {
        function parseRGBA(str) {
          const m = String(str).match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const p = m[1].split(',').map(parseFloat);
          return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
        }
        function over(fg, bg) {
          const a = fg.a + bg.a * (1 - fg.a);
          if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
          return { r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a, g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a, b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a, a };
        }
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        const color = parseRGBA(cs.color);
        let node = el;
        let acc = null;
        while (node) {
          const c = parseRGBA(getComputedStyle(node).backgroundColor);
          if (c && c.a > 0) {
            acc = acc ? over(acc, c) : c;
            if (c.a >= 1) break;
          }
          node = node.parentElement;
        }
        if (!acc) acc = { r: 255, g: 255, b: 255, a: 1 };
        return {
          color: 'rgb(' + Math.round(color.r) + ',' + Math.round(color.g) + ',' + Math.round(color.b) + ')',
          bg: 'rgb(' + Math.round(acc.r) + ',' + Math.round(acc.g) + ',' + Math.round(acc.b) + ')',
          colorRgb: color,
          bgRgb: acc,
          fontSizePx: parseFloat(cs.fontSize),
          weight: parseInt(cs.fontWeight, 10) || 400,
        };
      }, c.selector);
      await cdp.send('CSS.forcePseudoState', { nodeId: q.nodeId, forcedPseudoClasses: [] });
      if (!measured) continue;
      const lum = (cc) => {
        const f = (v) => {
          v = v / 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(cc.r) + 0.7152 * f(cc.g) + 0.0722 * f(cc.b);
      };
      const l1 = lum(measured.colorRgb);
      const l2 = lum(measured.bgRgb);
      const ratioV = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const large = measured.fontSizePx >= 24 || (measured.fontSizePx >= 18.66 && measured.weight >= 700);
      const threshold = large ? 3 : 4.5;
      R.contrast.push({
        route: c.route,
        query: c.selector,
        pseudo: states.join('+'),
        color: measured.color,
        bg: measured.bg,
        worstRatio: Math.round(ratioV * 100) / 100,
        threshold,
        pass: ratioV >= threshold,
      });
    }
  }
}

// ---------- PHASE 4: teclado ----------
async function tabWalk(page, route, maxTabs = 45) {
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(APP + route, { waitUntil: 'networkidle0' });
  // Foco inicial en el documento
  await page.evaluate(() => {
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
    document.body.removeAttribute('tabindex');
  });
  const seq = [];
  const keyOf = (e) => `${e.tag}|${e.id}|${e.aria || e.text}`;
  let firstKey = null;
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement)
        return { tag: 'BODY' };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        text: (el.textContent || el.value || '').trim().slice(0, 36),
        aria: el.getAttribute('aria-label') || '',
        id: el.id || '',
        cls: String(el.className).slice(0, 50),
        focusVisible: el.matches(':focus-visible'),
        outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
        boxShadow: cs.boxShadow === 'none' ? 'none' : 'shadow',
        y: Math.round(r.y),
        x: Math.round(r.x),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    });
    seq.push(info);
    if (info.tag !== 'BODY') {
      const k = keyOf(info);
      if (firstKey === null) firstKey = k;
      else if (k === firstKey && i > 2) break; // dio la vuelta
    }
  }
  // Heurística: flag solo saltos CLAROS (sube ≥60px de golpe, o un elemento
  // visualmente arriba aparece 5+ tabs después). No flaggea layouts no lineales.
  const rects = seq.filter((s) => s.tag !== 'BODY' && s.h > 0);
  const anomalies = [];
  for (let i = 1; i < rects.length; i++) {
    if (rects[i].y < rects[i - 1].y - 60) {
      anomalies.push({
        kind: 'salto claro hacia arriba',
        from: `${rects[i - 1].tag} "${rects[i - 1].text}" y=${rects[i - 1].y}`,
        to: `${rects[i].tag} "${rects[i].text}" y=${rects[i].y}`,
      });
    }
    if (i >= 5) {
      const minPrev = Math.min(...rects.slice(i - 5, i).map((r) => r.y));
      if (rects[i].y < minPrev - 60) {
        anomalies.push({
          kind: 'elemento arriba 5+ tabs después',
          prevMinY: minPrev,
          to: `${rects[i].tag} "${rects[i].text}" y=${rects[i].y}`,
        });
      }
    }
  }
  // Focus visible: todo lo alcanzado por Tab DEBE tener :focus-visible + outline/shadow
  const noFocusRing = seq.filter(
    (s) => s.tag !== 'BODY' && (!s.focusVisible || (s.outline.startsWith('none') && s.boxShadow === 'none'))
  );
  R.keyboard.walks.push({ route, seq, anomalies, noFocusRing });
  if (anomalies.length) R.keyboard.anomalies.push({ route, anomalies });
}

async function overlayKeyboardTest(page, name, openSteps) {
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(APP + '/user', { waitUntil: 'networkidle0' });
  // openSteps: async (page) => void — debe dejar el dialog abierto y haber
  // hecho el open TECLADO desde el trigger (foco en trigger + Enter).
  const triggerFp = await openSteps(page);
  await waitOpen(page);

  const initial = await page.evaluate(() => {
    const el = document.activeElement;
    return {
      tag: el?.tagName || 'none',
      text: (el?.textContent || '').trim().slice(0, 30),
      aria: el?.getAttribute('aria-label') || '',
      hasAutofocus: !!el?.closest('[data-autofocus]') || el?.hasAttribute('data-autofocus'),
      insideDialog: !!el?.closest('dialog[open]'),
    };
  });

  // Trampa: Tab ×10 y Shift+Tab ×3 deben permanecer dentro del diálogo.
  // En cada escape se registra el activeElement para juzgar si es artefacto
  // de headless (wrap hacia el chrome → body) o un escape real.
  const trapIssues = [];
  const probeInside = async (dir, n) => {
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        inside: !!el?.closest('dialog[open]'),
        tag: el?.tagName || 'none',
        cls: String(el?.className || '').slice(0, 50),
      };
    });
    if (!info.inside) trapIssues.push({ dir, n, active: info.tag, cls: info.cls });
  };
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    await probeInside('Tab', i + 1);
  }
  for (let i = 0; i < 3; i++) {
    // Puppeteer no acepta 'Shift+Tab' como key única: composición explícita.
    await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Shift');
    await probeInside('Shift+Tab', i + 1);
  }

  // Focus visible dentro del diálogo
  const ringIssues = await page.evaluate(() => {
    const out = [];
    const el = document.activeElement;
    if (!el || el === document.body) return [{ note: 'foco perdido en body dentro del dialog' }];
    const cs = getComputedStyle(el);
    if (!el.matches(':focus-visible') || (cs.outlineStyle === 'none' && cs.boxShadow === 'none'))
      out.push({ note: 'sin focus ring', el: String(el.outerHTML).slice(0, 100) });
    return out;
  });

  // Esc cierra + foco vuelve al trigger
  await page.keyboard.press('Escape');
  await waitClosed(page);
  const returned = await page.evaluate((fp) => {
    const el = document.activeElement;
    if (!el || el === document.body) return { same: false, now: 'BODY' };
    const now = {
      tag: el.tagName,
      text: (el.textContent || '').trim().slice(0, 36),
      aria: el.getAttribute('aria-label') || '',
      id: el.id || '',
    };
    return { same: JSON.stringify(now) === JSON.stringify(fp), now, expected: fp };
  }, triggerFp);

  R.keyboard.overlays.push({
    name,
    initialFocus: initial,
    trapIssues,
    ringIssues,
    focusReturn: returned,
    pass: trapIssues.length === 0 && ringIssues.length === 0 && returned.same,
  });
}

async function phaseKeyboard(page) {
  phase('4. teclado — tab walks');
  for (const route of ['/', '/login', '/register', '/user', '/ruta-audit-404']) {
    await tabWalk(page, route);
    console.log(`tab walk ${route}: ${R.keyboard.walks.at(-1).seq.length} pasos`);
  }

  phase('4b. teclado — overlays (open con Enter, trampa, Esc, focus return)');
  const fpOf = (p, pred) =>
    p.evaluate((predSrc) => {
      const fn = new Function('e', 'return ' + predSrc);
      const b = [...document.querySelectorAll('button')].find(fn);
      if (!b) return null;
      b.focus();
      return {
        tag: b.tagName,
        text: (b.textContent || '').trim().slice(0, 36),
        aria: b.getAttribute('aria-label') || '',
        id: b.id || '',
      };
    }, pred);

  // UrlForm: fingerprint del trigger ANTES de abrir (post-abrir el foco ya
  // está dentro del diálogo).
  await overlayKeyboardTest(page, 'UrlForm modal', async (p) => {
    const fp = await fpOf(p, 'e.textContent.includes("Nuevo link")');
    await p.keyboard.press('Enter');
    return fp;
  });

  // EditLink: Opciones (Enter) → Tab → Editar (Enter); trigger = Opciones.
  await overlayKeyboardTest(page, 'EditLink dialog', async (p) => {
    const fp = await fpOf(p, 'e.getAttribute("aria-label")==="Opciones"');
    await p.keyboard.press('Enter');
    await p.keyboard.press('Tab');
    await p.keyboard.press('Enter');
    return fp;
  });

  // Alert confirm: Opciones → Tab → Tab → Eliminar (Enter); trigger = Opciones.
  await overlayKeyboardTest(page, 'Alert confirm', async (p) => {
    const fp = await fpOf(p, 'e.getAttribute("aria-label")==="Opciones"');
    await p.keyboard.press('Enter');
    await p.keyboard.press('Tab');
    await p.keyboard.press('Tab');
    await p.keyboard.press('Enter');
    return fp;
  });
}

// ---------- PHASE 5: Lighthouse ----------
async function phaseLighthouse(browser, session) {
  phase('5. Lighthouse (solo Accesibilidad)');
  const port = new URL(browser.wsEndpoint()).port;
  const lighthouseMod = await import('lighthouse');
  const lighthouse = lighthouseMod.default || lighthouseMod.lighthouse;

  async function runLH(url, label) {
    const t0 = Date.now();
    try {
      const result = await lighthouse(url, {
        port: Number(port),
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['accessibility'],
      });
      const lhr = result.lhr;
      const cat = lhr.categories.accessibility;
      const fails = Object.values(lhr.audits)
        .filter(
          (a) =>
            a.score !== null &&
            a.score < 1 &&
            !['notApplicable', 'informative', 'manual', 'error'].includes(a.scoreDisplayMode)
        )
        .map((a) => ({ id: a.id, title: a.title, score: a.score }));
      const entry = {
        label,
        url,
        finalUrl: lhr.finalUrl,
        score: cat ? cat.score : null,
        fails,
        seconds: Math.round((Date.now() - t0) / 1000),
      };
      R.lighthouse.push(entry);
      console.log(`LH ${label}: score=${entry.score} fails=${fails.length} (${entry.seconds}s)`);
      return entry;
    } catch (e) {
      recordPhaseError(`lighthouse ${label}`, e);
      R.lighthouse.push({ label, url, error: String(e.message || e).slice(0, 200) });
      return null;
    }
  }

  await runLH(APP + '/', '/');
  await runLH(APP + '/login', '/login');

  // /user con seeding de sesión (time-box15 min): al crear cada tab nueva,
  // inyecta evaluateOnNewDocument con el usuario antes de que LH navegue.
  const tbStart = Date.now();
  const seedHandler = async (t) => {
    if (t.type() !== 'page') return;
    try {
      const pg = await t.page();
      await pg.evaluateOnNewDocument((s) => {
        try {
          sessionStorage.setItem('user', s);
        } catch {
          /* sessionStorage puede fallar en about:blank; LH re-navega después */
        }
      }, JSON.stringify(session));
    } catch {
      /* target destruido o no es una page; el siguiente target se reintenta */
    }
  };
  browser.on('targetcreated', seedHandler);
  try {
    const entry = await Promise.race([
      runLH(APP + '/user', '/user (con seeding)'),
      new Promise((r) => setTimeout(() => r('TIMEBOX'), LH_USER_TIMEBOX_MS)),
    ]);
    browser.off('targetcreated', seedHandler);
    if (entry === 'TIMEBOX') {
      skip('Lighthouse /user', `time-box de 15 min agotado`);
    } else if (entry && !entry.error && !entry.finalUrl.includes('/user')) {
      entry.seedingFailed = true;
      entry.evidence = `finalUrl=${entry.finalUrl} → la sesión no se sembró en la tab de LH; el score corresponde a ${new URL(entry.finalUrl).pathname}`;
      console.log(`LH /user: seeding FALLÓ → ${entry.evidence}`);
      R.notExecuted.push({
        check: 'Lighthouse /user (score válido)',
        cause: `seeding de sessionStorage falló; evidencia: ${entry.evidence}. /user queda cubierto íntegramente por axe.`,
      });
    }
  } catch (e) {
    browser.off('targetcreated', seedHandler);
    if (Date.now() - tbStart > LH_USER_TIMEBOX_MS) skip('Lighthouse /user', 'time-box 15 min');
    else recordPhaseError('lighthouse /user', e);
  }
}

// ---------- MAIN ----------
(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    // HEADED=1 → ventana real (validación de foco/trampas sin artefactos de
    // headless, equivalente a revisar en DevTools).
    headless: process.env.HEADED !== '1',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

  let session = null;
  try {
    if (overCap()) skip('fases 1-4', 'hard cap 60min ya alcanzado al inicio');
    else {
      session = await phaseAxe(page);
    }
  } catch (e) {
    recordPhaseError('axe', e);
  }

  try {
    if (overCap()) skip('chequeos rápidos', 'hard cap');
    else {
      phase('2. skip link + touch + aria-hidden');
      for (const r of ['/', '/login', '/register', '/user', '/ruta-audit-404']) await checkSkipLink(page, r);
      for (const r of ['/', '/user']) await checkTouchTargets(page, r);
      // Especial atención (pedido del audit): botones del dropdown abierto.
      await checkTouchTargets(page, '/user', { dropdown: true });
      for (const r of ['/', '/login', '/register', '/user']) await checkAriaHiddenFocus(page, r);
      phase('2b. reduced-motion + forced-colors');
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(APP + '/', { waitUntil: 'networkidle0' });
      await checkReducedMotion(page);
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(APP + '/user', { waitUntil: 'networkidle0' });
      if (session) await seedSession(page, session);
      await checkForcedColors(page);
    }
  } catch (e) {
    recordPhaseError('quick-checks', e);
  }

  try {
    if (overCap()) skip('contraste', 'hard cap');
    else {
      phase('3. contraste renderizado');
      // Texto REAL sobre --gradient-page (body): h1/h2/Example/errores — es el
      // peor caso de la app (el gradiente va de #c7c7c7 abajo a #fff arriba).
      await contrastOn(page, '/', [
        'nav a', 'nav button', 'form button[type="submit"]',
        'h1', 'h2:not([id])', '[class*="longUrl"]', '[class*="shortUrl"]', '[class*="arrow"]',
        '[class*="linkUrl"]', '[class*="meta"]',
      ]);
      await contrastOn(page, '/login?expired=1', ['nav a', '[class*="expired"]', '[class*="container"] a', '[class*="button"]']);
      await contrastOn(page, '/register', ['nav a', '[class*="fieldError"]', '[class*="loginButton"]', '[class*="button"]']);
      await contrastOn(page, '/ruta-audit-404', ['nav a', '[class*="code"]', '[class*="message"]', '[class*="home"]']);
      // Error real de UrlForm en la home:
      await page.goto(APP + '/', { waitUntil: 'networkidle0' });
      await page.type('input[type="text"]', 'no-es-url');
      await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
      await page.waitForSelector('[role="alert"]', { timeout: 4000 });
      const err = await page.evaluate(new Function('selectors', `return (${CONTRAST_PAGE_FN})(selectors)`), ['[role="alert"]']);
      err.forEach((o) => R.contrast.push({ route: '/', trigger: 'error UrlForm', ...o }));
      // Error real de Register (contraseñas distintas):
      await page.goto(APP + '/register', { waitUntil: 'networkidle0' });
      await page.type('#register-username', 'a11yuser' + Date.now());
      await page.type('#register-email', `a11y${Date.now()}@t.com`);
      await page.type('#register-password', 'password123');
      await page.type('#register-confirm', 'distinta');
      await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
      await page.waitForSelector('[role="alert"]', { timeout: 4000 });
      const err2 = await page.evaluate(new Function('selectors', `return (${CONTRAST_PAGE_FN})(selectors)`), ['[role="alert"]']);
      err2.forEach((o) => R.contrast.push({ route: '/register', trigger: 'error password', ...o }));
      // .notice real: misma sesión acortó esa URL antes → panel de deduplicación.
      if (session) await seedSession(page, session);
      await page.goto(APP + '/', { waitUntil: 'networkidle0' });
      await page.type('input[type="text"]', 'https://example.com/a11y/ruta/bastante/larga');
      await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
      await page.waitForSelector('[class*="notice"]', { timeout: 8000 });
      const notice = await page.evaluate(
        new Function('selectors', `return (${CONTRAST_PAGE_FN})(selectors)`),
        ['[class*="notice"]', '[class*="shortLink"]']
      );
      notice.forEach((o) => R.contrast.push({ route: '/', trigger: 'notice dedup', ...o }));
      await contrastOn(page, '/user', ['nav a', 'h1', '[class*="linkContainer"] > h2', '[class*="linkUrl"]', '[class*="linkDestination"]', '[class*="meta"]', '[class*="empty"]']);
      if (session) {
        await seedSession(page, session);
        await page.goto(APP + '/user', { waitUntil: 'networkidle0' });
        await contrastOn(page, '/user', ['nav a', '[class*="linkUrl"]', '[class*="linkDestination"]', '[class*="meta"]']);
      }
      phase('3b. contraste hover/active (forcePseudoState)');
      await contrastForcedPseudo(page);
    }
  } catch (e) {
    recordPhaseError('contraste', e);
  }

  try {
    if (overCap()) skip('teclado', 'hard cap');
    else await phaseKeyboard(page);
  } catch (e) {
    recordPhaseError('teclado', e);
  }

  try {
    if (overCap()) skip('Lighthouse', 'hard cap 60 min alcanzado');
    else await phaseLighthouse(browser, session);
  } catch (e) {
    recordPhaseError('lighthouse', e);
  }

  await browser.close();

  // ---------- dump ----------
  const jsonPath = path.join(OUT, 'report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(R, null, 2));
  console.log(`\n===== DONE en ${elapsed()}s → ${jsonPath} =====`);
  console.log(
    `axe labels: ${R.axe.map((a) => a.label).join(' | ')}`
  );
  console.log(`phaseErrors: ${R.phaseErrors.length}`);
  R.phaseErrors.forEach((p) => console.log('  ' + p.phase + ': ' + p.error));
  console.log(`notExecuted: ${R.notExecuted.length}`);
  R.notExecuted.forEach((n) => console.log('  ' + n.check + ' → ' + n.cause));
  process.exit(R.phaseErrors.length > 0 ? 1 : 0);
})().catch((e) => {
  console.error('AUDIT FATAL:', e);
  try {
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(R, null, 2));
  } catch {
    /* mejor esfuerzo: el reporte parcial puede no escribirse si el fs falló */
  }
  process.exit(1);
});
