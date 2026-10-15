import styles from './Navbar.module.css';
import { AiFillGithub } from 'react-icons/ai';
import { useUser } from '../../context/userContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleHome = () => {
    if (window.location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <div className={styles.navbar}>
      <a onClick={handleHome}>
        <h1>Linko</h1>
      </a>

      <ul>
        <li>
          <a
            target="_blank"
            rel="noreferrer"
            href="https://github.com/JoaquinGabriel17/url-shortener"
          >
            <AiFillGithub className={styles.icon} />
          </a>
        </li>

        {user?.username ? (
          <>
            <li><a onClick={() => navigate('/user')}>Tablero</a></li>
            <li><a onClick={handleLogout} style={{ cursor: 'pointer' }}>Cerrar sesión</a></li>
          </>
        ) : (
          <li>
            <a onClick={() => navigate('/login')}>Iniciar sesión</a>
          </li>
        )}
      </ul>
    </div>
  );
}
