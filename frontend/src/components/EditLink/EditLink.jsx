import { useState } from 'react';
import styles from './EditLink.module.css';
import { useUser } from '../../context/UserContext';
import Alert from '../Alert/Alert';

export default function EditLink({  linkId, onClose, originalName, originalDescription, originalUrl  },onClick, ref) {
  const [name, setName] = useState(originalName || '');
  const [description, setDescription] = useState(originalDescription || '');
  const [url, setUrl] = useState(originalUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ alert, setAlert] = useState(null)

  const backendUrl = import.meta.env.VITE_BACKEND_URL

  const {user} = useUser()

  const payload = {
    userId: user.userId,
    linkId: linkId
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if(!url.trim() && !description.trim() && !name.trim()) return alert('Debe modificar al menos un campo')
    if(name.trim()) payload.name = name
    if(description.trim()) payload.description = description
    if(originalUrl.trim()) payload.originalUrl = originalUrl

    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${backendUrl}/links/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Error al editar');
      setAlert({
        type: 'info',
        title: 'Link modificado correctamente'
      })
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      setAlert({
        type: 'error',
        title: 'Error al editar el link',
        message: err.message || 'Error inesperado'
      })
    } finally {
      setAlert({
        type: 'info',
        title: 'Link modificado correctamente'
      })
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
