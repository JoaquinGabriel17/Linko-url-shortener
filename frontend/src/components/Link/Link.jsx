import { useEffect, useRef, useState } from 'react';
import { FaRegCopy, FaCheck } from 'react-icons/fa';
import { FiMoreVertical } from 'react-icons/fi';
import EditLink from '../EditLink/EditLink';
import { useUser } from '../../context/userContext';
import { useCopy } from '../../lib/useCopy';
import { syncModalScrollLock } from '../../lib/modalScrollLock';
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
  const editDialogRef = useRef(null);
  // Dispersistente del dropdown: los triggers Editar/Eliminar se desmontan al
  // abrir los diálogos, así que el retorno nativo de foco cae en body. Se
  // usa inline en cada cierre (evita dependencias de effect en un helper).
  const optionsRef = useRef(null);

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
    // Igual que handleEdit: se cierra el menú de opciones al disparar la acción
    // (antes quedaba abierto por detrás del diálogo de confirmación).
    setShowMenu(false);
    const confirmed = await showAlert({
      type: 'confirm',
      title: 'Confirmación',
      message: '¿Estás seguro de que querés eliminar este link?',
    });

    // El diálogo de Alert cierra en UN EFECTO (asíncrono respecto del
    // resolve), así que hay que esperar el cierre real antes de enfocar:
    // un focus() anterior a close() lo pisaría el retorno nativo (→ body,
    // porque "Eliminar" se desmontó con el dropdown). Mismo caso del fix de
    // la edición. Si el link se eliminó, optionsRef ya no existe (card
    // desmontada) y el fallback a body es el comportamiento esperado.
    for (let i = 0; i < 100 && document.querySelector('dialog[role="alertdialog"][open]'); i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    optionsRef.current?.focus();
    optionsRef.current?.scrollIntoView({ block: 'nearest' });

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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // <dialog> nativo para el modal de edición: Esc, ::backdrop, inert del resto
  // de la página y retorno de foco al disparador, sin focus-trap manual.
  // Siempre montado; la sincronización va en ambos sentidos según `open`.
  useEffect(() => {
    const el = editDialogRef.current;
    if (!el) return undefined;
    // Capturado acá (patrón que pide exhaustive-deps): el nodo del botón
    // "Opciones" sobrevive al cierre — si el card se desmontara, focar un
    // nodo suelto es no-op, igual que el fallback a body.
    const optionsEl = optionsRef.current;
    if (showEditLink && !el.open) {
      el.showModal();
      syncModalScrollLock();
    }
    return () => {
      // La cleanup corre ANTES del próximo effect (y en unmount): es el único
      // lugar donde se cierra al des-togglear (un branch de cierre en el body
      // del effect nunca se alcanzaba). Si el componente vive, el trigger
      // "Editar" (dentro del dropdown) ya se desmontó al abrir, así que el
      // retorno nativo de close() cae en body → devolver foco a "Opciones".
      if (el.open) {
        el.close();
        syncModalScrollLock();
        optionsEl?.focus();
        optionsEl?.scrollIntoView({ block: 'nearest' });
      }
    };
  }, [showEditLink]);

  const formattedDate = formatDate(createdAt);

  return (
    <div className={styles.container}>
      {/* Montado siempre: el <dialog> interno solo togglea `open`. */}
      <Alert alertData={alertData} resolve={alertData?.resolve} />

      <article>
        {/* h3 (antes h4): con el h2 de sección del dashboard la jerarquía
            queda h1 → h2 → h3 (axe heading-order). */}
        <h3>{name || 'Sin nombre'}</h3>
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
            {copied ? (
              <FaCheck className={styles.copied} aria-hidden="true" focusable="false" />
            ) : (
              <FaRegCopy aria-hidden="true" focusable="false" />
            )}
          </span>
        </button>

        {user?.userId && (
          <button
            type="button"
            className={`${styles.iconButton} ${styles.options}`}
            onClick={toggleMenu}
            aria-label="Opciones"
            aria-haspopup="true"
            aria-expanded={showMenu}
            ref={optionsRef}
          >
            <FiMoreVertical aria-hidden="true" focusable="false" />
          </button>
        )}

        {/* Es una lista de acciones, NO un menú ARIA: no se usan role="menu"
            ni role="menuitem" porque obligarían a navegación con flechas,
            Home/End y role="menuitem". Botones simples + teclado nativo. */}
        {showMenu && (
          <div
            className={styles.dropdownMenu}
            onClick={(e) => e.stopPropagation()}
            ref={menuRef}
          >
            <ul>
              <li>
                <button type="button" onClick={handleEdit}>
                  Editar
                </button>
              </li>
              <li>
                <button type="button" className={styles.danger} onClick={handleDelete}>
                  Eliminar
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Siempre montado (solo se togglea showEditLink). El contenido va
          condicionado para que el formulario de EditLink resetee al abrir. */}
      <dialog
        ref={editDialogRef}
        className={styles.editDialog}
        aria-label="Editar link"
        onCancel={() => setShowEditLink(false)}
        onClick={(e) => {
          if (e.target === editDialogRef.current) setShowEditLink(false);
        }}
      >
        {showEditLink && (
          <EditLink
            onClose={() => setShowEditLink(false)}
            onUpdated={handleUpdated}
            linkId={linkId}
            originalDescription={description}
            originalName={name}
            originalUrl={originalUrl}
          />
        )}
      </dialog>

      {loading && <Loading fullscreen message="Eliminando link…" />}
    </div>
  );
}
