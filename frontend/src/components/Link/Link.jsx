import styles from './Link.module.css';
import { useState } from 'react';
import { FaRegCopy, FaCheck } from 'react-icons/fa';
import { FiMoreVertical } from 'react-icons/fi';
import EditLink from '../EditLink/EditLink';

export default function Link({ url, name, description, shortCode, linkId }) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditLink, setShowEditLink] = useState(false)

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
    console.log('Editar link:', linkId);
    setShowEditLink(true)
  };

  const handleDelete = () => {
    console.log('Eliminar link:', linkId);
  };

  return (
    <div className={styles.container} onClick={handleCopy}>
      <article>
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

        <button className={styles.options} onClick={toggleMenu}>
          <FiMoreVertical />
        </button>

        {showMenu && (
          <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
            <ul>
              <li onClick={handleEdit}>Editar</li>
              <li onClick={handleDelete}>Eliminar</li>
            </ul>
          </div>
        )}

      </div>
      {showEditLink &&(
          <EditLink 
          onClose={() => setShowEditLink(false)}
          linkId={linkId}
          />
        )

        }
    </div>
  );
}
