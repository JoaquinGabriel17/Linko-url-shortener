import { useState } from 'react';
import styles from './EditLink.module.css';
import api from '../../api';
import Alert from '../Alert/Alert';

export default function EditLink({  linkId, onClose, originalName, originalDescription, originalUrl  },onClick, ref) {
  const [name, setName] = useState(originalName || '');
  const [description, setDescription] = useState(originalDescription || '');
  const [url, setUrl] = useState(originalUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ alert, setAlert] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Solo se envían los campos modificados; el backend ignora/valida el resto.
    const payload = {};
    if (name.trim()) payload.name = name.trim();
    if (description.trim()) payload.description = description.trim();
    if (url.trim() && url.trim() !== originalUrl) payload.originalUrl = url.trim();

    if (Object.keys(payload).length === 0) {
      setAlert({
        type: 'error',
        title: 'No hay cambios',
        message: 'Debe modificar al menos un campo',
      });
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.put(`/links/${linkId}`, payload);
      setAlert({
        type: 'info',
        title: 'Link modificado correctamente'
      })
      if (onClose) onClose();
    } catch (err) {
      setAlert({
        type: 'error',
        title: 'Error al editar el link',
        message: err.response?.data?.message || err.message || 'Error inesperado'
      })
    } finally {
      setLoading(false);
    }
  };

  const resolve = async(e) => {
    setAlert(null)
  }

  return (
    <div 
    ref={ref}          
    onClick={onClick}
    className={styles.formContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h3>Editar link</h3>

        <input
          type="text"
          placeholder={originalName || "Nombre (opcional)"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="text"
          placeholder={originalDescription || "Descripción (opcional)"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <input
          type="url"
          placeholder={originalUrl || "URL original"}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
      { alert && <Alert resolve={resolve} alert={alert} ></Alert>}
    </div>
  );
}
