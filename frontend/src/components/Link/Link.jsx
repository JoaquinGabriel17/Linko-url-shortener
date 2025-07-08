import styles from './Link.module.css'
import { useState } from 'react';
import { FaRegCopy, FaCheck } from 'react-icons/fa';

export default function Link({url,name,description,shortCode,linkId}){

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

    return(
        <div 
        className={styles.container}
        onClick={handleCopy}>
          <article>
            <h1>{name}</h1>
            <p className={styles.linkUrl}>{url}</p>
            <p className={styles.linkDescription}>{description}</p>
          </article>
          <span className={`${styles.icon} ${copied ? styles.fadeOut : styles.fadeIn}`}>
            {copied ? <FaCheck className={styles.copied} /> : <FaRegCopy />}
          </span>
        </div>
    )
}