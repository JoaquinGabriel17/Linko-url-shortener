import { useState } from 'react';
import axios from 'axios';
import styles from './UrlForm.module.css'
import { useUser } from '../../context/UserContext';
import Link from '../Link/Link';

export default function UrlForm() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [error, setError] = useState('');
  const { user } = useUser();


  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post('http://localhost:3001/shorten', { originalUrl });
      setShortUrl(res.data.shortUrl);
    } catch (err) {
      console.error('Error al acortar URL:', err);
      alert('Hubo un error');
    }
  };
  const handleDrop = async(e) => {
    e.preventDefault();
    setShortUrl('')
  }
  const handleSave = async(e) => {
    e.preventDefault();
    if(user){}
    else{
      setError('Debes iniciar sesión para guardar una URL')
    }
  }

  return (
    <div className={styles.urlFormContainer}>
      <form onSubmit={handleSubmit}>
        <input
          type="url"
          placeholder="Pegá tu URL"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          required
          
        />
        <button type="submit">
          Acortar
        </button>
      </form>

      {shortUrl && (
        <div className={styles.shortUrlContainer}>
        <p className={styles.shortUrl}>
          URL acortada: <a href={shortUrl} target="_blank" rel="noopener noreferrer">{shortUrl}</a>
        </p>
        <div className={styles.buttonContain}>
        <button
          onClick={handleDrop}
        >Descartar</button>
        <button
          onClick={handleSave}
        >Guardar</button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
      <Link url={'ñalskdñalskdñalskd'}></Link>
    </div>
  );
}
