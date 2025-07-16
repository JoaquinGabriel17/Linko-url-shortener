// Alert.jsx
import { useEffect } from 'react';
import styles from './Alert.module.css';

export default function Alert({ alertData, resolve }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') resolve(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [resolve]);

  if (!alertData) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.alertBox}>
        <h3>{alertData.title}</h3>
        {alertData.message && <p>{alertData.message}</p>}

        {alertData.type === 'confirm' && (
          <div className={styles.buttons}>
            <button onClick={() => resolve(true)}>Sí</button>
            <button onClick={() => resolve(false)}>Cancelar</button>
          </div>
        )}

        {alertData.type === 'error' && (
          <button onClick={() => resolve()}>Cerrar</button>
        )}

        {alertData.type === 'info' && (
          <button onClick={() => resolve()}>Aceptar</button>
        )}
      </div>
    </div>
  );
}
