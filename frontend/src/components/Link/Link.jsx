import styles from './Link.module.css'
import { useState } from 'react';

export default function Link({url}){

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(url)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Oculta el tooltip después de 2 segundos
          })
          .catch(err => {
            console.error('Error al copiar el link:', err);
          });
      };

    return(
        <div 
        className={styles.container}
        onClick={handleCopy}>
            <p>{url}</p>
            {copied && (
        <span className={styles.tooltip}>¡Copiado!</span>
      )}
        </div>
    )
}