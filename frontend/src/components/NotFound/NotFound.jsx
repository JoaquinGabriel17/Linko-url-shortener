import { Link } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    // Skip link + <main>: WCAG 2.4.1 y landmark (ver App.jsx).
    <>
      <a href="#main" className="sr-only-focusable">
        Saltar al contenido
      </a>
      <Navbar />
      <main id="main">
        <div className={styles.container}>
          <div className={styles.content}>
            <h1 className={styles.code}>404</h1>
            <p className={styles.message}>La página que buscás no existe o fue movida.</p>
            <Link className={styles.home} to="/">
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
