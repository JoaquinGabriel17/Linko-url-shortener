import styles from './Example.module.css';
import { FaArrowDown } from 'react-icons/fa';

export default function Example() {
  const longUrl = "https://www.ejemplo.com/un-path-muy-largo/con-muchos-parametros-y-detalles?search=abc&filter=xyz";
  const shortUrl = "https://linko.ly/abc123";

  return (
    <div className={styles.container}>
        <h3>Que tus links no ocupen media pantalla</h3>
      <p className={styles.longUrl}>{longUrl}</p>
      <FaArrowDown className={styles.arrow} />
      <p className={styles.shortUrl}>{shortUrl}</p>
    </div>
  );
}
