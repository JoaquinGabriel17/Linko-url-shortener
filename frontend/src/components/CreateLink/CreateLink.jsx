import { useState } from 'react';
import styles from './CreateLink.module.css';
import { useUser } from '../../context/UserContext';

export default function CreateLink({ visible, urlToSave, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const { user } = useUser()
  const [error, setError] = useState('');

  function isValidUrl(string) {
    try {
      const url = new URL(string);
      const hasValidProtocol = url.protocol === 'http:' || url.protocol === 'https:';
      const isLocalOrHasDot = url.hostname === 'localhost' || url.hostname.includes('.') || /^[0-9.]+$/.test(url.hostname); // permite IPs
      return hasValidProtocol && isLocalOrHasDot;
    } catch (_) {
      return false;
    }
  }
  
  


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
  
    const original = urlToSave || url;
  
    if (!original || original.trim() === '') {
      return setError('Debe ingresar una URL.');
    }
  
    if (!isValidUrl(original)) {
      return setError('La URL ingresada no es válida. Asegurate de que comience con http:// o https://');
    }
  
    if (name.length > 100) {
      return setError('El nombre es demasiado largo. Máximo 100 caracteres.');
    }
  
    if (description.length > 300) {
      return setError('La descripción es demasiado larga. Máximo 300 caracteres.');
    }
  
    const payload = {
      originalUrl: original,
      userId: user.userId,
      name,
      description,
    };
  
    try {
      const response = await fetch('http://localhost:3001/links/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        setError(data.error || 'Error al crear el link.');
      } else {
        alert('El link fue creado correctamente');
        onClose();
      }
    } catch (error) {
      console.error('Error de red:', error);
      setError('Error de red. Intentalo de nuevo más tarde.');
    }
  };
  

  return (
    <div className={styles.overlay}
    style={{
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
    <div
    
      className={styles.container}
      style={{
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
        <h1>Guardar la URL</h1>
        <button 
        onClick={onClose}
        className={styles.close}>
            X</button>
      <form onSubmit={handleSubmit}>
        <input
          type="url"
          value={urlToSave}
          placeholder="https://ejemplo.com"
          required
          onChange={(e) => setUrl(e.target.value)}
        />

        <input
          type='text'
          placeholder='Nombre (opcional)'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type='text'
          placeholder='Descripción (opcional)'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button type='submit'>Crear Link</button>
        {error && <p className={styles.error}>{error}</p>}

      </form>
    </div>
    </div>
  );
}
