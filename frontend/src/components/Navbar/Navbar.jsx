import styles from './Navbar.module.css';
import { AiFillGithub } from 'react-icons/ai';
import { useUser } from '../../context/UserContext';
import { useLocation, useNavigate } from 'react-router-dom';
const frontendUrl = process.env.FRONTEND_URL;


export default function Navbar() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // limpia el usuario del contexto
    localStorage.removeItem('token'); // elimina el token JWT
    navigate('/');
  };
  const handleHome = () => {
    if (location.pathname !== '/') {
      navigate('/');
    }
  }

  return (
    <div className={styles.navbar}>
      <a onClick={handleHome} ><h1>Linko</h1></a>

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
            <li><a href={`${frontendUrl}/user`}>Cuenta</a></li>
            <li><a onClick={handleLogout} style={{ cursor: 'pointer' }}>Cerrar sesión</a></li>
          </>
        ) : (
          <li>
            <a href={`${frontendUrl}/login`}>Iniciar sesión</a>
          </li>
        )}
      </ul>
    </div>
  );
}
