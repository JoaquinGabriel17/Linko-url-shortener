import { useState } from 'react';
import axios from 'axios';
import styles from './UrlForm.module.css'
import { useUser } from '../../context/UserContext';
import Link from '../Link/Link';
import CreateLink from '../CreateLink/CreateLink';
const frontendUrl = process.env.FRONTEND_URL;


export default function UrlForm() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [error, setError] = useState('');
  const { user } = useUser();
  const [createLink, setCreateLink] = useState(false)
  console.log(frontendUrl)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
  
    // Validación manual
    try {
      new URL(originalUrl);
    } catch {
      return setError('URL no válida. Verificá que empiece con http:// o https://');
    }
  
    try {
      const res = await axios.post('http://localhost:3001/shorten', { originalUrl });
      setShortUrl(res.data.shortUrl);
    } catch (err) {
      console.error('Error al acortar URL:', err);
      setError(err.response?.data?.error || 'Hubo un error al acortar la URL');
    }
  };
  


  const handleDrop = async(e) => {
    e.preventDefault();
    setShortUrl('')
  }
  const handleSave = async(e) => {
    e.preventDefault();
    if(user) setCreateLink(true)
    else  setError('Debes iniciar sesión para guardar una URL')
    
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
  <button type="submit">Acortar</button>
  {error && <p className={styles.error}>{error}</p>}
</form>


      {shortUrl && (
        <div className={styles.shortUrlContainer}>
          <Link url={shortUrl}></Link>
        <div className={styles.buttonContain}>
        <button
          onClick={handleDrop}
        >Descartar</button>
        <button
          onClick={handleSave}
        >Guardar</button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {createLink&&<CreateLink 
        onClose={() => setCreateLink(false)}
        urlToSave={originalUrl}
        visible={createLink}></CreateLink>}
        </div>
      )}
    </div>
  );
}
