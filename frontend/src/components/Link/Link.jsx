import styles from './Link.module.css';
import { FaRegCopy, FaCheck } from 'react-icons/fa';
import { FiMoreVertical } from 'react-icons/fi';
import EditLink from '../EditLink/EditLink';
import { useRef, useEffect, useState } from 'react';
import { useUser } from '../../context/UserContext';
import Alert from '../Alert/Alert';
import Loading from '../Loading/Loading';

const backendUrl = import.meta.env.VITE_BACKEND_URL

export default function Link({ url, name, description, shortCode, linkId, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditLink, setShowEditLink] = useState(false)
  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(false)
  const menuRef = useRef(null);
  const editRef = useRef(null);
  const { user } = useUser()

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleMenu = (e) => {
    e.stopPropagation(); // evita que el clic en el botón también active el copy
    setShowMenu((prev) => !prev);
  };

  const handleEdit = () => {
    setShowEditLink(true)
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showEditLink]);

  
  //ELIMINAR EL LINK
  const handleDelete = async () => {
    const confirmed = await showAlert({
      type: 'confirm',
      title: 'Confirmación',
      message: '¿Estás seguro de que querés eliminar este link?',
    });
  
    if (!confirmed) return;
    setLoading(true)
    try {
      const res = await fetch(`${backendUrl}/links/delete?linkId=${linkId}&userId=${user.userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        setLoading(false)
        console.error('Error al eliminar:', data.error);
        await showAlert({
          type: 'error',
          title: 'Error al eliminar link',
          message: 'Ha ocurrido un error inesperado, el link no fue eliminado'
        })
      } else {
        setLoading(false)
        console.log('Link eliminado:', data);
        await showAlert({
          type: 'info',
          title: 'Link eliminado exitosamente',
        });
        if (typeof onDelete === 'function') {
          onDelete(linkId);
        }
      }
    } catch (err) { 
      setLoading(false)
      console.error('Error de red:', err);
      await showAlert({
        type: 'error',
        title: 'Error al eliminar link',
        message: 'Ha ocurrido un error inesperado, el link no fue eliminado'
      })
    }
  };
  
  
  //ALERTA


  const showAlert = (data) => {
    return new Promise((resolve) => {
      const wrappedResolve = (value) => {
        setAlertData(null); // Limpia la alerta del estado
        resolve(value);     // Devuelve el resultado al flujo original
      };
      setAlertData({ ...data, resolve: wrappedResolve });
    });
  };
 


  return (
    <div className={styles.container} onClick={handleCopy}>
      {alertData && <div
        onClick={(e) => e.stopPropagation()}>
          <Alert alertData={alertData} resolve={alertData.resolve} />
        </div>}
      <article onClick={(e) => e.stopPropagation()}>
        <h4>{name}</h4>
        <p className={styles.linkUrl}>{url}</p>
        <p className={styles.linkDescription}>{description}</p>
      </article>

      <div className={styles.buttonContainer}>
        <button>
          <span className={`${styles.icon} ${copied ? styles.fadeOut : styles.fadeIn}`}>
            {copied ? <FaCheck className={styles.copied} /> : <FaRegCopy />}
          </span>
        </button>
        { user?.userId?       <button className={styles.options} onClick={toggleMenu}>
          <FiMoreVertical />
        </button>: <></>}


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
    onClick={(e) => e.stopPropagation()}>
      <EditLink 
        onClose={() => setShowEditLink(false)}
        linkId={linkId}
        originalDescription={description}
        originalName={name}
        originalUrl={url}
        
      />
    </div>
  </div>
)}
{loading && <Loading fullscreen message='Eliminando link'></Loading>}
    </div>
  );
}
