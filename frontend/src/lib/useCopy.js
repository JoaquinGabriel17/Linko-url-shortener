import { useCallback, useEffect, useRef, useState } from 'react';

// Copia al portapapeles. Prefiere la Clipboard API y cae a un textarea temporal
// (execCommand) cuando no está disponible (contextos no seguros / navegadores
// viejos).
export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!ok) {
    throw new Error('No se pudo copiar el texto');
  }
}

// Hook con feedback visual: expone `copied` (true unos segundos tras copiar) y
// `copy`, que devuelve true/false según el resultado.
export function useCopy(resetMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = useCallback(
    async (text) => {
      try {
        await copyText(text);
        setCopied(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), resetMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetMs]
  );

  return { copied, copy };
}
