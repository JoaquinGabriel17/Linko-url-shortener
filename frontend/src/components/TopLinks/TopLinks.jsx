import React, { useEffect, useState } from 'react';
import { useUser } from '../../context/UserContext';
import Link from '../Link/Link';
import styles from './TopLinks.module.css';
import Loading from '../Loading/Loading';

function TopLinks() {
  const [topLinks, setTopLinks] = useState([]);
  const [error, setError] = useState(null);
  const { user } = useUser();
  const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTopLinks = async () => {
      setLoading(true);

      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${VITE_BACKEND_URL}/links/links?limit=5&sort=clicks&userId=${user.userId}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        });

        if (!res.ok) throw new Error('Error al obtener los links');
        const data = await res.json();
        setTopLinks(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user.userId) {
      fetchTopLinks();
    }
  }, [user.userId]);

  if (loading) return <Loading message="Cargando tus links más clickeados..." />;

  return (
    <div className={styles.container}>
      <h3>Tus links más clickeados</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {topLinks.map(link => (
          <li key={link._id}>
            <Link 
              name={link.name} 
              url={link.originalUrl} 
              linkId={link._id}
              description={link.description} 
              onDelete={(id) => setTopLinks(prev => prev.filter(l => l._id !== id))}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TopLinks;
