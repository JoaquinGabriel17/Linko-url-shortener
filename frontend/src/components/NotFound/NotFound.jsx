import { Link } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <Navbar />
      <div className={styles.content}>
        <h1 className={styles.code}>404</h1>
        <p className={styles.message}>La página que buscás no existe o fue movida.</p>
        <Link className={styles.home} to="/">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
