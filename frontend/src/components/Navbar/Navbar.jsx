import styles from './Navbar.module.css';
import { AiFillGithub } from 'react-icons/ai';
import { useUser } from '../../context/userContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className={styles.navbar}>
      {/* Navegación => <Link> (soporta Cmd/Ctrl+click y middle-click).
          El logo no es un <h1>: la página ya tiene su propio h1. */}
      <Link to="/" className={styles.brand}>
        Linko
      </Link>

      <ul>
        <li>
          <a
            target="_blank"
            rel="noreferrer"
            href="https://github.com/JoaquinGabriel17/url-shortener"
            aria-label="Repositorio en GitHub"
            className={styles.iconLink}
          >
            <AiFillGithub className={styles.icon} aria-hidden="true" focusable="false" />
          </a>
        </li>

        {user?.username ? (
          <>
            <li>
              <Link to="/user">Tablero</Link>
            </li>
            <li>
              {/* Cerrar sesión es una ACCIÓN, no navegación => <button>. */}
              <button type="button" className={styles.navButton} onClick={handleLogout}>
                Cerrar sesión
              </button>
            </li>
          </>
        ) : (
          <li>
            <Link to="/login">Iniciar sesión</Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
