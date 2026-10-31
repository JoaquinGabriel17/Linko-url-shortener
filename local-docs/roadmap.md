# Roadmap — Rediseño frontend

## Fase cerrada: 5 — Audit y hardening ✓

## Fases cerradas
- [x] 1 — Fundaciones (tokens, reset, contraste, favicon, reduced-motion)
- [x] 2 — Botones + Auth unificados (`:where(button)`, `Auth.module.css` con `composes`)
- [x] 3 — A11y / JSX (`<dialog>` nativo, labels, aria, dropdown sin roles menú)
- [x] 4 — Responsive / layout (dvh, safe-area, 640px, navbar full-bleed)
- [x] 5 — Audit (axe 0 violaciones WCAG + 0 blockers custom, Lighthouse 100/100,
  fixes de contraste/skip link/landmarks/headings/focus-return; wrap validado
  en Chrome y Firefox)

## Post-rediseño
Ver `TODO.md` (P0: npm audit + race Register; P1: dark mode, forced-colors, halo token, 90dvh; P2: docs y limpieza)