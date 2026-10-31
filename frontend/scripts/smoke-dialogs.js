// Smoke E2E del frontend (Fase 4): diálogos <dialog> + verificación de layout
// responsive (sin scroll horizontal) en 320/375/768px.
//
// Requisitos: Chrome local, frontend en :5173 y API en :10000 (docker compose).
// Uso: npm run smoke  (desde frontend/)
//
// NOTA: este archivo vive en el repo a propósito (antes estaba en %TEMP% y se
// perdía entre sesiones). Es ESM porque package.json tiene "type": "module".
import process from 'node:process';
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP = 'http://localhost:5173';
const API = 'http://localhost:10000';
const WIDTHS = [320, 375, 768];

const logs = [];
const results = [];
const failures = [];

function step(msg) {
  console.log('>> ' + msg);
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
  if (!ok) throw new Error(`No encontré ${selector} / ${pred}`);
}

const waitOpen = (page) =>
  page.waitForFunction(() => document.querySelector('dialog[open]') !== null, {
    timeout: 4000,
  });

const waitClosed = (page) =>
  page.waitForFunction(() => document.querySelector('dialog[open]') === null, {
    timeout: 4000,
  });

// Abre el dropdown de opciones solo si no está ya abierto (evita que un clic
// extra en "Opciones" lo cierre por toggle).
async function ensureDropdown(page) {
  const open = await page.evaluate(() =>
    [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Eliminar')
  );
  if (!open) await clickWhere(page, 'button', 'e.getAttribute("aria-label")==="Opciones"');
  await page.waitForFunction(
    () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Eliminar'),
    { timeout: 4000 }
  );
}

async function measureOverflow(page) {
  // clientWidth (layout viewport) y NO innerWidth: en emulación mobile
  // innerWidth puede expandirse junto con el scrollWidth y tapar el overflow.
  return page.evaluate(() => ({
    inner: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
}

async function expectNoOverflow(page, label) {
  const { inner, scroll } = await measureOverflow(page);
  const ok = scroll <= inner;
  results.push(`overflow ${label}: ${ok ? 'OK' : `FAIL scroll=${scroll} > inner=${inner}`}`);
  if (!ok) failures.push(`overflow: ${label}`);
}

// El Navbar debe ser edge-to-edge en todas las rutas que lo renderizan
// (regresión de Fase 4: con el Navbar dentro de .container quedaba una
// "píldora" de 960px centrada en pantallas anchas).
async function expectNavbarFullBleed(page, label) {
  const r = await page.evaluate(() => {
    const nav = document.querySelector('nav');
    if (!nav) return null;
    const rect = nav.getBoundingClientRect();
    return {
      navWidth: Math.round(rect.width),
      left: Math.round(rect.left),
      inner: document.documentElement.clientWidth,
    };
  });
  if (!r) {
    results.push(`navbar bleed ${label}: sin <nav> (skip)`);
    return;
  }
  const ok = r.navWidth === r.inner && r.left === 0;
  results.push(
    `navbar bleed ${label}: ${ok ? 'OK' : `FAIL width=${r.navWidth} left=${r.left} inner=${r.inner}`}`
  );
  if (!ok) failures.push(`navbar bleed: ${label}`);
}

async function toggleDropdownClosed(page) {
  await clickWhere(page, 'button', 'e.getAttribute("aria-label")==="Opciones"');
  await page.waitForFunction(
    () => ![...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Eliminar'),
    { timeout: 4000 }
  );
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

  // ---- setup: registrar usuario real + crear 2 links ----
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(APP, { waitUntil: 'networkidle0' });
  step('registrando usuario...');
  const reg = await page.evaluate(
    async (apiBase) => {
      const email = `e2e${Date.now()}@test.com`;
      const r = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `e2e${Date.now()}`,
          email,
          password: 'password123',
        }),
      });
      return { status: r.status, body: await r.json() };
    },
    API
  );
  if (reg.status !== 201) throw new Error('register falló: ' + JSON.stringify(reg));
  const { token, user } = reg.body;
  results.push(`register: ${reg.status} (user ${user.username})`);

  await page.evaluate(
    (s) => sessionStorage.setItem('user', JSON.stringify(s)),
    { token, username: user.username, email: user.email, userId: user.id }
  );

  step('creando 2 links...');
  const created = await page.evaluate(
    async (apiBase, tok) => {
      const urls = [
        'https://example.com/ruta/muy/larga/para/probar',
        'https://example.org/otra/ruta/para/el/sweep',
      ];
      const out = [];
      for (const originalUrl of urls) {
        const r = await fetch(`${apiBase}/links/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
          body: JSON.stringify({ originalUrl }),
        });
        out.push(r.status);
      }
      return out;
    },
    API,
    token
  );
  results.push(`create links: ${created.join(', ')}`);

  // =========== 1) Sweep responsive: 320 / 375 / 768 ===========
  for (const width of WIDTHS) {
    const isTouch = width < 768;
    step(`sweep ${width}px`);
    await page.setViewport({ width, height: 800, isMobile: isTouch, hasTouch: isTouch });

    for (const path of ['/', '/login', '/register', '/user', '/ruta-que-no-existe']) {
      await page.goto(`${APP}${path}`, { waitUntil: 'networkidle0' });
      await expectNoOverflow(page, `${width}px ${path}`);
      await expectNavbarFullBleed(page, `${width}px ${path}`);
    }

    // Hover pegado: en viewport táctil el media (hover) NO debe aplicar.
    const hoverOn = await page.evaluate(
      () => window.matchMedia('(hover: hover) and (pointer: fine)').matches
    );
    const hoverOk = isTouch ? !hoverOn : hoverOn;
    results.push(
      `hover media @${width}px: ${hoverOn ? 'hover:hover' : 'sin hover'} (esperado ${
        isTouch ? 'sin hover' : 'hover:hover'
      }) ${hoverOk ? 'OK' : 'FAIL'}`
    );
    if (!hoverOk) failures.push(`hover media @${width}px`);

    // Interacciones en /user: dropdown, diálogo de edición, modal y alert.
    await page.goto(`${APP}/user`, { waitUntil: 'networkidle0' });

    await clickWhere(page, 'button', 'e.getAttribute("aria-label")==="Opciones"');
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('button')].some(
          (b) => b.textContent.trim() === 'Eliminar'
        ),
      { timeout: 4000 }
    );
    await expectNoOverflow(page, `${width}px /user dropdown abierto`);
    await toggleDropdownClosed(page);

    await ensureDropdown(page);
    await clickWhere(page, 'button', 'e.textContent.trim()==="Editar"');
    await waitOpen(page);
    await expectNoOverflow(page, `${width}px /user diálogo editar`);
    await page.keyboard.press('Escape');
    await waitClosed(page);

    await clickWhere(page, 'button', 'e.textContent.includes("Nuevo link")');
    await waitOpen(page);
    await expectNoOverflow(page, `${width}px /user modal nuevo link`);
    await clickWhere(page, 'button', 'e.getAttribute("aria-label")==="Cerrar"');
    await waitClosed(page);

    await ensureDropdown(page);
    await clickWhere(page, 'button', 'e.textContent.trim()==="Eliminar"');
    await page.waitForSelector('dialog[open][role="alertdialog"]', { timeout: 4000 });
    await expectNoOverflow(page, `${width}px /user alert confirm`);
    await clickWhere(page, 'button', 'e.textContent.trim()==="Cancelar"');
    await waitClosed(page);
  }
  await page.setViewport({ width: 1280, height: 800 });

  // =========== 2) UrlForm modal ×3 (desktop) ===========
  step('goto /user');
  await page.goto(`${APP}/user`, { waitUntil: 'networkidle0' });
  for (let i = 1; i <= 3; i++) {
    step(`UrlForm: click Nuevo link #${i}`);
    await clickWhere(page, 'button', 'e.textContent.includes("Nuevo link")');
    await waitOpen(page);
    await clickWhere(page, 'button', 'e.getAttribute("aria-label")==="Cerrar"');
    await waitClosed(page);
    results.push(`UrlForm modal open/close #${i}: OK`);
  }

  // =========== 3) Link edit dialog ×3 ===========
  step('goto /user (seccion link)');
  await page.goto(`${APP}/user`, { waitUntil: 'networkidle0' });
  for (let i = 1; i <= 3; i++) {
    step(`link edit #${i}: click Opciones`);
    await clickWhere(page, 'button', 'e.getAttribute("aria-label")==="Opciones"');
    await page.waitForFunction(
      () => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Editar'),
      { timeout: 4000 }
    );
    step(`link edit #${i}: click Editar`);
    await clickWhere(page, 'button', 'e.textContent.trim()==="Editar"');
    await waitOpen(page);
    step(`link edit #${i}: Escape`);
    await page.keyboard.press('Escape');
    await waitClosed(page);
    results.push(`EditLink dialog open/close #${i}: OK`);
  }

  // =========== 4) Alert (confirm) ×3 — Eliminar -> Cancelar ===========
  step('seccion Alert confirm');
  for (let i = 1; i <= 3; i++) {
    step(`alert confirm #${i}: abrir dropdown`);
    await ensureDropdown(page);
    step(`alert confirm #${i}: click Eliminar`);
    await clickWhere(page, 'button', 'e.textContent.trim()==="Eliminar"');
    await page.waitForSelector('dialog[open][role="alertdialog"]', { timeout: 4000 });
    const focused = await page.evaluate(
      () => document.activeElement?.textContent?.trim()
    );
    results.push(`Alert confirm #${i}: foco inicial en "${focused}"`);
    await clickWhere(page, 'button', 'e.textContent.trim()==="Cancelar"');
    await waitClosed(page);
    results.push(`Alert confirm #${i}: cerrado OK`);
  }

  // =========== 5) Alert (error) — EditLink sin cambios ===========
  step('seccion Alert error');
  await ensureDropdown(page);
  await clickWhere(page, 'button', 'e.textContent.trim()==="Editar"');
  await waitOpen(page);
  // Acotado al diálogo abierto: "Nuevo link +" también tiene type default submit.
  await clickWhere(page, 'dialog[open] button', 'e.type==="submit"');
  await page.waitForSelector('dialog[open][role="alertdialog"]', { timeout: 4000 });
  results.push('Alert error (sin cambios): abierto OK');
  await clickWhere(page, 'button', 'e.textContent.trim()==="Cerrar"');
  await page.keyboard.press('Escape');
  await waitClosed(page);

  // =========== 6) Alert (error) — registro con email duplicado ===========
  // El registro EXITOSO hace navigate('/') en el mismo handler (Register.jsx),
  // así que el alertdialog se desmonta apenas abre: no es testeable de forma
  // determinista. Se provoca el camino de ERROR (email ya registrado del
  // setup), que sí deja el diálogo abierto. Además no pisa la sesión del
  // usuario e2e en sessionStorage (lo haría el login del éxito), y la sección
  // siguiente necesita sus links.
  step('seccion Alert error (registro duplicado)');
  await page.goto(`${APP}/register`, { waitUntil: 'networkidle0' });
  await page.type('#register-username', user.username);
  await page.type('#register-email', user.email);
  await page.type('#register-password', 'password123');
  await page.type('#register-confirm', 'password123');
  await page.evaluate(() => document.querySelector('form button[type="submit"]').click());
  await page.waitForSelector('dialog[open][role="alertdialog"]', { timeout: 5000 });
  const dlg = await page.evaluate(() => {
    const d = document.querySelector('dialog[open][role="alertdialog"]');
    return {
      title: d.querySelector('h3')?.textContent?.trim(),
      buttons: [...d.querySelectorAll('button')].map((b) => b.textContent.trim()),
      focused: document.activeElement?.textContent?.trim()?.slice(0, 40),
      isBody: document.activeElement === document.body,
    };
  });
  results.push(
    `Alert error registro: titulo="${dlg.title}" botones=[${dlg.buttons}] foco="${dlg.focused}" isBody=${dlg.isBody}`
  );
  await page.evaluate(() => {
    const d = document.querySelector('dialog[open][role="alertdialog"]');
    d.querySelector('[data-autofocus]')?.click();
  });
  await waitClosed(page);
  results.push('Alert error registro: cerrado OK');

  // =========== 7) Loading fullscreen: sin scroll horizontal a 375px ===========
  // El DELETE se demora para que el overlay fullscreen sea medible.
  step('seccion Loading fullscreen @375px');
  await page.setViewport({ width: 375, height: 800, isMobile: true, hasTouch: true });
  await page.goto(`${APP}/user`, { waitUntil: 'networkidle0' });
  await page.setRequestInterception(true);
  const delayDelete = (req) => {
    if (req.method() === 'DELETE') setTimeout(() => req.continue().catch(() => {}), 700);
    else req.continue().catch(() => {});
  };
  page.on('request', delayDelete);
  try {
    await ensureDropdown(page);
    await clickWhere(page, 'button', 'e.textContent.trim()==="Eliminar"');
    await page.waitForSelector('dialog[open][role="alertdialog"]', { timeout: 4000 });
    await clickWhere(page, 'button', 'e.textContent.trim()==="Sí"');
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[aria-busy="true"]');
        return el && getComputedStyle(el).position === 'fixed';
      },
      { timeout: 5000 }
    );
    await expectNoOverflow(page, '375px Loading fullscreen');
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[aria-busy="true"]');
        return !(el && getComputedStyle(el).position === 'fixed');
      },
      { timeout: 8000 }
    );
    results.push('Loading fullscreen: apareció/desapareció OK');
  } catch (e) {
    failures.push(`Loading fullscreen: ${e.message}`);
    results.push(`Loading fullscreen: FAIL (${e.message})`);
  } finally {
    page.off('request', delayDelete);
    await page.setRequestInterception(false);
    await page.setViewport({ width: 1280, height: 800 });
  }

  await browser.close();

  console.log('\n===== RESULTADOS =====');
  results.forEach((r) => console.log('  ' + r));

  const risky = logs.filter((l) =>
    /showModal|showModal\(\)|InvalidStateError|not in the document|already open|Not implemented/i.test(l)
  );
  console.log('\n===== CONSOLA (showModal/InvalidState) =====');
  if (risky.length === 0) console.log('  OK: SIN warnings ni errores de showModal()');
  else risky.forEach((l) => console.log('  FAIL ' + l));

  // Los "Failed to load resource" del navegador son ruido de red (p.ej. el
  // 400 esperado del registro duplicado); no son errores de la app.
  const errs = logs.filter(
    (l) =>
      (l.startsWith('[console.error') || l.startsWith('[pageerror')) &&
      !l.includes('Failed to load resource')
  );
  const netNoise = logs.filter((l) => l.includes('Failed to load resource'));
  console.log('\n===== NETWORK NOISE (esperada, no fatal) (' + netNoise.length + ') =====');
  netNoise.forEach((l) => console.log('  ' + l));
  console.log('\n===== OTROS ERRORES DE CONSOLA (' + errs.length + ') =====');
  errs.slice(0, 15).forEach((l) => console.log('  ' + l));

  console.log('\n===== FALLOS (' + failures.length + ') =====');
  failures.forEach((f) => console.log('  FAIL ' + f));

  if (failures.length > 0 || risky.length > 0 || errs.length > 0) process.exit(1);
})().catch((e) => {
  console.error('FALLO E2E:', e.message);
  console.log('--- results hasta aca ---');
  results.forEach((r) => console.log('  ' + r));
  console.log('--- logs ---');
  logs.slice(-20).forEach((l) => console.log(l));
  process.exit(1);
});
