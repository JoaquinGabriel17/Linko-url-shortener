import { useState } from 'react';
import styles from './EditLink.module.css';
import { useUser } from '../../context/UserContext';

export default function EditLink({  linkId, onClose  }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {user} = useUser()

  const payload = {
    userId: user.userId,
    linkId: linkId
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if(!originalUrl.trim() && !description.trim() && !name.trim()) return alert('Debe modificar al menos un campo')
    if(name.trim()) payload.name = name
    if(description.trim()) payload.description = description
    if(originalUrl.trim()) payload.originalUrl = originalUrl

//ME QUEDE ACA ME VOY A CAGAR
    try {
      setLoading(true);
      setError('');
      const response = await fetch('http://localhost:3001/links/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Error al editar');

      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h3>Editar link</h3>

        <input
          type="text"
          placeholder="Nombre (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="text"
          placeholder="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <input
          type="url"
          placeholder="URL original"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          required
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
    </div>
  );
}
