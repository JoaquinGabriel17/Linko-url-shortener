import styles from './Example.module.css';
import { FaArrowDown } from 'react-icons/fa';

export default function Example() {
  const longUrl =
    'https://www.ejemplo.com/un-path-muy-largo/con-muchos-parametros-y-detalles?search=abc&filter=xyz';
  const shortUrl = 'https://linko.ly/abc123';

  return (
    <div className={styles.container}>
      {/* h2, no h3: la página ya tiene un h1, así la jerarquía no se salta. */}
      <h2>Que tus links no ocupen media pantalla</h2>
      <p className={styles.longUrl}>{longUrl}</p>
      <FaArrowDown className={styles.arrow} aria-hidden="true" focusable="false" />
      <p className={styles.shortUrl}>{shortUrl}</p>
    </div>
  );
}
