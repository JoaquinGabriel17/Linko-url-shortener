import styles from './Navbar.module.css';
import { AiFillGithub } from 'react-icons/ai';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // limpia el usuario del contexto
    localStorage.removeItem('token'); // elimina el token JWT
    navigate('/');
  };

  return (
    <div className={styles.navbar}>
      <h1>Linko</h1>

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
            <li><a>Preferencias</a></li>
            <li><a onClick={handleLogout} style={{ cursor: 'pointer' }}>Cerrar sesión</a></li>
          </>
        ) : (
          <li>
            <a href="http://localhost:5173/login">Iniciar sesión</a>
          </li>
        )}
      </ul>
    </div>
  );
}
