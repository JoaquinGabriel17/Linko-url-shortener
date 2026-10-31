import { useEffect, useState } from 'react';
import { useUser } from '../../context/userContext';
import api, { getErrorMessage } from '../../api';
import Link from '../Link/Link';
import Loading from '../Loading/Loading';
import styles from './TopLinks.module.css';

function TopLinks() {
  const { user } = useUser();
  const [topLinks, setTopLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTopLinks = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/links', { params: { limit: 5, sort: '-clicks' } });
        setTopLinks(res.data);
      } catch (err) {
        setError(getErrorMessage(err, 'No se pudieron cargar tus links.'));
      } finally {
        setLoading(false);
      }
    };

    if (user?.userId) {
      fetchTopLinks();
    }
  }, [user?.userId]);

  if (loading) return <Loading message="Cargando tus links más clickeados…" />;
  if (error)
    return (
      <p className={styles.error} role="alert">
        {error}
      </p>
    );
  if (topLinks.length === 0) return null;

  return (
    <div className={styles.container}>
      <h2>Tus links más clickeados</h2>
      <ul>
        {topLinks.map((link) => (
          <li key={link._id}>
            <Link
              shortUrl={link.shortUrl}
              originalUrl={link.originalUrl}
              name={link.name}
              description={link.description}
              clicks={link.clicks}
              createdAt={link.createdAt}
              linkId={link._id}
              onDelete={(id) => setTopLinks((prev) => prev.filter((l) => l._id !== id))}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TopLinks;
