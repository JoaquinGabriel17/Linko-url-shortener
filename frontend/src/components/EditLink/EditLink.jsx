import { useState } from 'react';
import api, { getErrorMessage } from '../../api';
import Alert from '../Alert/Alert';
import styles from './EditLink.module.css';

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function EditLink({
  linkId,
  onClose,
  onUpdated,
  originalName,
  originalDescription,
  originalUrl,
}) {
  const [name, setName] = useState(originalName || '');
  const [description, setDescription] = useState(originalDescription || '');
  const [url, setUrl] = useState(originalUrl || '');
  const [loading, setLoading] = useState(false);
  const [alertData, setAlertData] = useState(null);
  const [urlError, setUrlError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertData(null);
    setUrlError('');

    // Error de campo (URL inválida) => inline + aria-invalid/describedby,
    // asociado al input que falla. Los errores de formulario (sin cambios,
    // del servidor) van al diálogo Alert.
    if (url.trim() !== (originalUrl || '') && !isValidHttpUrl(url.trim())) {
      setUrlError('Ingresá una URL válida (debe empezar con http:// o https://).');
      return;
    }

    // Solo se envían los campos modificados; el shortCode es inmutable.
    const payload = {};
    if (name.trim() !== (originalName || '')) payload.name = name.trim();
    if (description.trim() !== (originalDescription || '')) {
      payload.description = description.trim();
    }
    if (url.trim() !== (originalUrl || '')) payload.originalUrl = url.trim();

    if (Object.keys(payload).length === 0) {
      setAlertData({
        type: 'error',
        title: 'No hay cambios',
        message: 'Modificá al menos un campo.',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.put(`/links/${linkId}`, payload);
      if (typeof onUpdated === 'function') onUpdated(res.data.link);
      if (onClose) onClose();
    } catch (err) {
      setAlertData({
        type: 'error',
        title: 'Error al editar el link',
        message: getErrorMessage(err, 'No se pudo editar el link.'),
      });
    } finally {
      setLoading(false);
    }
  };

  const resolve = () => setAlertData(null);

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h3>Editar link</h3>

        <label className="sr-only" htmlFor="edit-name">
          Nombre
        </label>
        <input
          id="edit-name"
          type="text"
          placeholder={originalName || 'Nombre'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          disabled={loading}
        />

        <label className="sr-only" htmlFor="edit-description">
          Descripción
        </label>
        <input
          id="edit-description"
          type="text"
          placeholder={originalDescription || 'Descripción'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoComplete="off"
          disabled={loading}
        />

        <label className="sr-only" htmlFor="edit-url">
          URL original
        </label>
        <input
          id="edit-url"
          type="url"
          placeholder={originalUrl || 'URL original'}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (urlError) setUrlError('');
          }}
          autoComplete="off"
          disabled={loading}
          required
          aria-invalid={urlError ? true : undefined}
          aria-describedby={urlError ? 'edit-url-error' : undefined}
        />
        {urlError && (
          <p id="edit-url-error" className={styles.fieldError} role="alert">
            {urlError}
          </p>
        )}

        <div className={styles.actions}>
          <button type="submit" disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className={styles.secondary} onClick={onClose} disabled={loading}>
            Cancelar
          </button>
        </div>
      </form>

      {/* Montado siempre: el <dialog> interno solo togglea `open`. */}
      <Alert alertData={alertData} resolve={resolve} />
    </div>
  );
}
