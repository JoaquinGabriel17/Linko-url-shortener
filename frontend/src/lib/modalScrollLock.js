// Respaldo de la regla `html:has(dialog[open])` de main.css para navegadores
// sin soporte de :has() (Safari <15.4, Firefox <121), que ignoran esa regla.
//
// showModal() aplica inert al resto, pero no bloquea el scroll del body fuera
// de Chromium. Esta clase en <body> da el mismo efecto en los tres motores.
//
// Se recalcula el estado real (¿hay algún <dialog> abierto?) en vez de usar un
// contador: así varios diálogos superpuestos (p. ej. el Alert sobre el modal de
// edición) no se pisan al cerrarse uno.
export function syncModalScrollLock() {
  const anyOpen = document.querySelector('dialog[open]') !== null;
  document.body.classList.toggle('modal-open', anyOpen);
}
