import { useState } from 'react';
import styles from './CreateLink.module.css';
import { useUser } from '../../context/UserContext';

export default function CreateLink({ visible, urlToSave, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { user } = useUser()

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      originalUrl: urlToSave,
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
        console.error('Error al crear el link:', data.error);
      } else {
        console.log('Link creado correctamente:', data);
        alert('El link fue creado correctamente');
        onClose()
        // Podés agregar una limpieza de campos o mostrar un mensaje
      }
    } catch (error) {
      console.error('Error de red:', error);
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
          type='text'
          value={urlToSave}
          disabled
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
    </div>
    </div>
  );
}
