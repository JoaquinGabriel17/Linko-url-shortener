import { useState } from 'react';
import styles from './CreateLink.module.css';
import { useUser } from '../../context/UserContext';
import Loading from '../Loading/Loading';
import Alert from '../Alert/Alert';

export default function CreateLink({ visible, urlToSave, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const { user } = useUser()
  const [error, setError] = useState('');
  const [ loading, setLoading] = useState(false)
  const [ alert, setAlert] = useState(null)
  const backendUrl = import.meta.env.VITE_BACKEND_URL;



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
    setLoading(true)
    const original = urlToSave || url;
  
    if (!original || original.trim() === '') {
      setLoading(false)
      setAlert({
        type: 'error',
        title: 'Error al guardar link',
        message: 'Debe ingresar una URL.'
      })
      return

    }
  
    if (!isValidUrl(original)) {
      setLoading(false)
      setAlert({
        type: 'error',
        title: 'Error al guardar link',
        message: 'La URL ingresada no es válida. Asegurate de que comience con http:// o https://'
      })
      return

    }
  
    if (name.length > 100) {
      setLoading(false)
      setAlert({
        type: 'error',
        title: 'Error al guardar link',
        message: 'El nombre es demasiado largo. Máximo 100 caracteres.'
      })
      return

    }
  
    if (description.length > 300) {
      setLoading(false)
      setAlert({
        type: 'error',
        title: 'Error al guardar link',
        message: 'La descripción es demasiado larga. Máximo 300 caracteres.'
      })
      return

    }
  
    const payload = {
      originalUrl: original,
      userId: user.userId,
      name,
      description,
    };
  
    try {
      const response = await fetch(`${backendUrl}/links/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        setLoading(false)
        setAlert({
          type: 'error',
          title: 'Error al guardar link',
          message: data.error || 'Error al crear el link.'
        })
    
      } else {
        setLoading(false)
        setAlert({
          type: 'info',
          title: 'El link fue creado correctamente',
          message: 'Ya puedes consultarlo en tu dashboard'
        })
        onClose();
      }
    } catch (error) {
      setLoading(false)
      console.error('Error de red:', error);
      setAlert({
        type: 'error',
        title: 'Error al guardar link',
        message: 'Error de red. Intentalo de nuevo más tarde.'
      })
    }
  };
  
  const resolve = async(e) => {
    setAlert(null)
  }

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
            {loading ? <Loading></Loading> : (
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

      </form>
      )}
            { alert && <Alert resolve={resolve} alert={alert} ></Alert>}

    </div>
    </div>
  );
}
