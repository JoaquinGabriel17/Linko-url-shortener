import { useState } from 'react';
import axios from 'axios';
import styles from './UrlForm.module.css'

export default function UrlForm() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');

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

  return (
    <div>
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
        <p >
          URL acortada: <a href={shortUrl} target="_blank" rel="noopener noreferrer">{shortUrl}</a>
        </p>
      )}
    </div>
  );
}
