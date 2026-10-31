import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import styles from './UserDashboard.module.css';
import { useUser } from '../../context/userContext';
import api, { getErrorMessage } from '../../api';
import Link from '../Link/Link';
import UrlForm from '../UrlForm/UrlForm';
import Loading from '../Loading/Loading';

export default function UserDashboard() {
  const { user } = useUser();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/links');
      setLinks(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar tus links.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.userId) {
      fetchLinks();
    }
  }, [user?.userId, fetchLinks]);

  // La sesión se inicializa de forma síncrona, así que no hace falta esperar:
  // sin usuario se redirige directo al login.
  if (!user?.userId) {
    return <Navigate to="/login" replace />;
  }

  const handleCreated = () => {
    setShowForm(false);
    fetchLinks();
  };

  const handleDeleted = (id) => {
    setLinks((prev) => prev.filter((link) => link._id !== id));
  };

  return (
    // Skip link + <main>: WCAG 2.4.1 y landmark (ver App.jsx).
    <>
      <a href="#main" className="sr-only-focusable">
        Saltar al contenido
      </a>
      <Navbar />
      <main id="main">
        <div className={styles.container}>
          <div className={styles.newLinkContainer}>
            <h1>Tablero</h1>
            <button className={styles.createLink} onClick={() => setShowForm(true)}>
              Nuevo link +
            </button>
          </div>

          {/* Montado siempre; el <dialog> interno se togglea con `open`. */}
          <UrlForm
            inModal
            open={showForm}
            onClose={() => setShowForm(false)}
            onCreated={handleCreated}
          />

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <Loading message="Cargando links de la cuenta…" />
          ) : links.length === 0 ? (
            <p className={styles.empty}>Todavía no creaste ningún link.</p>
          ) : (
            <div className={styles.linkContainer}>
              {/* h2 de sección: hace la jerarquía h1 → h2 → h3 de las cards
                  (antes h1 → h4, fail de heading-order). */}
              <h2>Tus links</h2>
              <ul className={styles.linkList}>
                {links.map((link) => (
                  <li key={link._id}>
                    <Link
                      shortUrl={link.shortUrl}
                      originalUrl={link.originalUrl}
                      name={link.name}
                      description={link.description}
                      clicks={link.clicks}
                      createdAt={link.createdAt}
                      linkId={link._id}
                      onDelete={handleDeleted}
                      onUpdated={fetchLinks}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
