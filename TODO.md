# TODO / Backlog

Pendientes formalizados desde las fases de rediseño de estilos del frontend.
Creado en Fase 4 (responsive/layout) para que no se pierdan entre reportes.

## Antes del próximo release

- [ ] **`npm audit` en `frontend/`**: 20 vulnerabilidades al instalar
  `puppeteer-core` (2 low, 3 moderate, 14 high, 1 critical — verificar cuáles
  son de puppeteer-core vs. preexistentes). Plan concreto: correr
  `npm audit` con el equipo, parchear high/critical, y dejar el resultado
  fijado en `package-lock.json` **antes del próximo release**.

## UX / Bugs

- [ ] **Race en Register: el Alert de éxito nunca se ve**
  (`frontend/src/components/Register/Register.jsx`, `handleSubmit`):
  `setAlertData({ type: 'info', ... })` y `navigate('/')` ocurren en el mismo
  handler, así que el componente se desmonta apenas se abre el diálogo:
  "Usuario creado con éxito" es invisible para el usuario.
  Consecuencia: el happy path de registro **no tiene cobertura E2E**
  (`scripts/smoke-dialogs.js` prueba el camino de error con email duplicado,
  que sí deja el diálogo abierto).
  Fix sugerido: posponer `navigate('/')` al cierre del diálogo, o navegar sin
  abrir alert.

## Deuda técnica (cosmética)

- [ ] **Tokenizar el halo de foco `rgba(11, 94, 215, 0.2)`** — repetido en
  `Auth.module.css` (`:focus-visible` de `.input`), `EditLink.module.css` y
  `UrlForm.module.css`. Candidato: `--color-primary-halo` en el `:root` de
  `main.css` (es `--color-primary` con alpha 0.2). Aparece en el backlog desde
  Fase 2; resolverlo en la próxima fase que toque esos archivos.

## Milestones separados

- [ ] **Forced-colors / Windows High Contrast (P1 del audit Fase 5)**:
  emulación `forced-colors: active` OK en `/login` y `/user` (nada invisible;
  evidencia: screenshots en `%TEMP%\a11y\forced-colors-*.png` — temporal,
  regenerar con `npm run audit:a11y`). Falta validar en Windows High Contrast
  real del SO. No es blocker de a11y WCAG.

## Notas / convenciones (no son acciones)

- **Touch targets frágiles (WCAG 2.5.8)**: los items "Tablero" (55.8×21) y
  "Cerrar sesión" (97.5×21) del navbar pasan SOLO por la excepción de spacing
  (≥24px al target más cercano, medido). Si un cambio futuro remueve ese gap
  (padding del navbar, gap del `ul`), dejan de cumplir. Re-correr
  `npm run audit:a11y` al tocar el layout del navbar.
- **Patrón flex + hijo con width fijo**: un hijo con `width: Npx` dentro de un
  contenedor flex (o con `align-items: center`) necesita `max-width: 100%`
  **en el flex item**, o el `100%` resuelve contra el max-content y produce
  overflow medido en `clientWidth` (no en `innerWidth`: en emulación mobile
  `innerWidth` se expande y lo tapa). Casos: `Link.module.css:4` (tarjeta
  550px en `li`), inputs de UrlForm (600px). Documentar/aplicar al agregar
  nuevos list containers.
