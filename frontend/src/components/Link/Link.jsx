import { useEffect, useRef, useState } from 'react';
import { FaRegCopy, FaCheck } from 'react-icons/fa';
import { FiMoreVertical } from 'react-icons/fi';
import EditLink from '../EditLink/EditLink';
import { useUser } from '../../context/userContext';
import { useCopy } from '../../lib/useCopy';
import api, { getErrorMessage } from '../../api';
import Alert from '../Alert/Alert';
import Loading from '../Loading/Loading';
import styles from './Link.module.css';

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function Link({
  shortUrl,
  originalUrl,
  name,
  description,
  clicks = 0,
  createdAt,
  linkId,
  onDelete,
  onUpdated,
}) {
  const { user } = useUser();
  const { copied, copy } = useCopy();
  const [showMenu, setShowMenu] = useState(false);
  const [showEditLink, setShowEditLink] = useState(false);
  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);
  const editRef = useRef(null);

  const showAlert = (data) =>
    new Promise((resolve) => {
      const wrappedResolve = (value) => {
        setAlertData(null);
        resolve(value);
      };
      setAlertData({ ...data, resolve: wrappedResolve });
    });

  // Botón de copiar: copia el enlace CORTO (nunca la URL original).
  const handleCopy = async () => {
    const ok = await copy(shortUrl || originalUrl);
    if (!ok) {
      await showAlert({
        type: 'error',
        title: 'No se pudo copiar',
        message: 'Copiá el enlace manualmente.',
      });
    }
  };

  const toggleMenu = (e) => {
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  };

  const handleEdit = () => {
    setShowMenu(false);
    setShowEditLink(true);
  };

  const handleUpdated = (updatedLink) => {
    setShowEditLink(false);
    if (typeof onUpdated === 'function') onUpdated(updatedLink);
  };

  const handleDelete = async () => {
    const confirmed = await showAlert({
      type: 'confirm',
      title: 'Confirmación',
      message: '¿Estás seguro de que querés eliminar este link?',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await api.delete(`/links/${linkId}`);
      if (typeof onDelete === 'function') onDelete(linkId);
    } catch (err) {
      await showAlert({
        type: 'error',
        title: 'Error al eliminar link',
        message: getErrorMessage(err, 'El link no fue eliminado.'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (showEditLink && editRef.current && !editRef.current.contains(event.target)) {
        setShowEditLink(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu, showEditLink]);

  const formattedDate = formatDate(createdAt);

  return (
    <div className={styles.container}>
      {alertData && (
        <div onClick={(e) => e.stopPropagation()}>
          <Alert alertData={alertData} resolve={alertData.resolve} />
        </div>
      )}

      <article>
        <h4>{name || 'Sin nombre'}</h4>
        <p className={styles.linkUrl}>{shortUrl}</p>
        {originalUrl && <p className={styles.linkDestination}>{originalUrl}</p>}
        <p className={styles.linkDescription}>{description || 'Sin descripción'}</p>
        <div className={styles.meta}>
          <span>
            {clicks} {clicks === 1 ? 'clic' : 'clics'}
          </span>
          {formattedDate && <span>Creado el {formattedDate}</span>}
        </div>
      </article>

      <div className={styles.buttonContainer}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={handleCopy}
          aria-label="Copiar enlace corto"
        >
          <span className={`${styles.icon} ${copied ? styles.fadeOut : styles.fadeIn}`}>
            {copied ? <FaCheck className={styles.copied} /> : <FaRegCopy />}
          </span>
        </button>

        {user?.userId && (
          <button
            type="button"
            className={`${styles.iconButton} ${styles.options}`}
            onClick={toggleMenu}
            aria-label="Opciones"
          >
            <FiMoreVertical />
          </button>
        )}

        {showMenu && (
          <div
            className={styles.dropdownMenu}
            onClick={(e) => e.stopPropagation()}
            ref={menuRef}
          >
            <ul>
              <li onClick={handleEdit}>Editar</li>
              <li onClick={handleDelete}>Eliminar</li>
            </ul>
          </div>
        )}
      </div>

      {showEditLink && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalContent}
            ref={editRef}
            onClick={(e) => e.stopPropagation()}
          >
            <EditLink
              onClose={() => setShowEditLink(false)}
              onUpdated={handleUpdated}
              linkId={linkId}
              originalDescription={description}
              originalName={name}
              originalUrl={originalUrl}
            />
          </div>
        </div>
      )}

      {loading && <Loading fullscreen message="Eliminando link" />}
    </div>
  );
}
