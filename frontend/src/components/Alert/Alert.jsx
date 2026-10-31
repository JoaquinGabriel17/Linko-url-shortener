import { useEffect, useRef } from 'react';
import { syncModalScrollLock } from '../../lib/modalScrollLock';
import styles from './Alert.module.css';

// Alerta/confirmación modal. Requiere interacción (hay que apretar un botón),
// así que usa role="alertdialog" + aria-modal, nunca role="dialog" genérico.
// Los errores INLINE de formulario (párrafos sueltos) usan role="alert" en su
// propio componente; este es el diálogo que pide acción.
export default function Alert({ alertData, resolve }) {
  const dialogRef = useRef(null);
  const open = Boolean(alertData);

  // El <dialog> SIEMPRE está montado; solo se togglea el estado `open`. La
  // sincronización va en AMBOS sentidos para que nunca se llame showModal()
  // sobre un nodo inexistente ni se cierre algo ya desmontado.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return undefined;
    if (open && !el.open) {
      el.showModal();
      // Foco al control MENOS destructivo (marcado con data-autofocus), nunca
      // al de confirmación destructiva. No depende del orden del DOM.
      el.querySelector('[data-autofocus]')?.focus();
      syncModalScrollLock();
    }
    if (!open && el.open) {
      el.close();
      syncModalScrollLock();
    }
    return () => {
      // Si el componente se desmonta con el diálogo abierto, cerrarlo y soltar
      // el bloqueo de scroll; si no, la página quedaría inmovilizada.
      if (el.open) el.close();
      syncModalScrollLock();
    };
  }, [open]);

  const isConfirm = alertData?.type === 'confirm';
  const accentClass = !alertData
    ? ''
    : alertData.type === 'error'
      ? styles.error
      : alertData.type === 'confirm'
        ? styles.confirm
        : styles.alert;

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.overlay} ${accentClass}`.trim()}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      aria-describedby={alertData?.message ? 'alert-dialog-message' : undefined}
      onCancel={() => resolve?.(false)}
    >
      {alertData && (
        <div className={styles.alertBox}>
          <h3 id="alert-dialog-title">{alertData.title}</h3>
          {alertData.message && <p id="alert-dialog-message">{alertData.message}</p>}

          {isConfirm ? (
            <div className={styles.buttons}>
              {/* DOM en orden seguro: Cancelar primero, destructivo a la derecha.
                  data-autofocus fija el foco en Cancelar explícitamente. */}
              <button type="button" data-autofocus onClick={() => resolve?.(false)}>
                Cancelar
              </button>
              <button type="button" onClick={() => resolve?.(true)}>
                Sí
              </button>
            </div>
          ) : (
            <div className={styles.buttons}>
              <button type="button" data-autofocus onClick={() => resolve?.()}>
                {alertData.type === 'info' ? 'Aceptar' : 'Cerrar'}
              </button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
