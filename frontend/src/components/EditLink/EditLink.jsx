import { useState } from 'react';
import api, { getErrorMessage } from '../../api';
import Alert from '../Alert/Alert';
import styles from './EditLink.module.css';

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

  const handleSubmit = async (e) => {
    e.preventDefault();

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

        <input
          type="text"
          placeholder={originalName || 'Nombre'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />

        <input
          type="text"
          placeholder={originalDescription || 'Descripción'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />

        <input
          type="url"
          placeholder={originalUrl || 'URL original'}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />

        <div className={styles.actions}>
          <button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
        </div>
      </form>

      {alertData && <Alert alertData={alertData} resolve={resolve} />}
    </div>
  );
}
