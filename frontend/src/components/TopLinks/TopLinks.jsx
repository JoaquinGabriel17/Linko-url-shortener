import React, { useEffect, useState } from 'react';
import { useUser } from '../../context/userContext';
import api from '../../api';
import Link from '../Link/Link';
import styles from './TopLinks.module.css';
import Loading from '../Loading/Loading';

function TopLinks() {
  const [topLinks, setTopLinks] = useState([]);
  const [error, setError] = useState(null);
  const { user } = useUser();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTopLinks = async () => {
      setLoading(true);

      try {
        const res = await api.get('/links', { params: { limit: 5, sort: '-clicks' } });
        setTopLinks(res.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.userId) {
      fetchTopLinks();
    }
  }, [user?.userId]);

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
