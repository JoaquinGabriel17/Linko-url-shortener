import { useState } from 'react';
import axios from 'axios';
import styles from './UrlForm.module.css'
import { useUser } from '../../context/UserContext';
import Link from '../Link/Link';
import CreateLink from '../CreateLink/CreateLink';
import Alert from '../Alert/Alert';
import Loading from '../Loading/Loading';

const backendUrl = import.meta.env.VITE_BACKEND_URL;


export default function UrlForm() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [showError, setShowError] = useState(null);
  const { user } = useUser();
  const [createLink, setCreateLink] = useState(false)
  const [ loading, setLoading ] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowError(null);
    setLoading(true)
  
    // Validación manual
    try {
      new URL(originalUrl);
    } catch {
      setLoading(false)
      return setShowError({
          type: 'error',
          title: 'URL no válida',
          message: 'Debes ingresar una URL válida',
        });
    }
  
    try {
      const res = await axios.post(`${backendUrl}/shorten`, { originalUrl });
      setLoading(false)

      setShortUrl(res.data.shortUrl);
    } catch (err) {
      console.error('Error al acortar URL:', err);
      setLoading(false)
      setShowError({
        type: 'error',
        title: 'Error al guardar  link',
        message: err.response?.data?.error || 'Hubo un error al acortar la URL',
      });
    }
  };
  


  const handleDrop = async(e) => {
    e.preventDefault();
    setShortUrl('')
  }
  const handleSave = async(e) => {
    e.preventDefault();
    if(user) setCreateLink(true)
    else { 
    setShowError({
      type: 'error',
      title: 'Error al guardar  link',
      message: 'Debes iniciar sesión para guardar una URL',
    });
  }
    
  }
  const resolve = async(e) => {
    setShowError(null)
  }


  return (
    <div className={styles.urlFormContainer}>
     <form onSubmit={handleSubmit}>
  <input
    placeholder="Pegá tu URL"
    value={originalUrl}
    onChange={(e) => setOriginalUrl(e.target.value)}
    required
  />
  <button type="submit">Acortar</button>
  {showError && <Alert alertData={showError} resolve={resolve} />}
</form>

      { loading && <Loading message='Acortando link'></Loading>}
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
        {showError && <Alert alertData={showError} resolve={resolve} />}
        {createLink&&<CreateLink 
        onClose={() => setCreateLink(false)}
        urlToSave={originalUrl}
        visible={createLink}></CreateLink>}
        </div>
      )}
    </div>
  );
}
