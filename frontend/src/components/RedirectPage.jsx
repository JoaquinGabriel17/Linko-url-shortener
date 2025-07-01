import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export default function RedirectPage() {
  const { shortCode } = useParams();

  useEffect(() => {
    const fetchOriginalUrl = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/${shortCode}`);
        window.location.href = res.request.responseURL;
      } catch (err) {
        console.error('Error al redirigir:', err);
        alert('URL no encontrada');
      }
    };

    fetchOriginalUrl();
  }, [shortCode]);

  return <p>Redireccionando...</p>;
}
