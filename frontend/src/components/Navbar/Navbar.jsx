import styles from './Navbar.module.css'
import { AiFillGithub } from 'react-icons/ai';
import { useUser } from '../../context/UserContext';


export default function Navbar(){

  const { user, login, logout } = useUser();

    return(
        <div className={styles.navbar}>
            <h1>Linko</h1>
            <ul>
                <li >
                    <a 
                    target='_blank'
                    href='https://github.com/JoaquinGabriel17/url-shortener'>
                    <AiFillGithub className={styles.icon}></AiFillGithub></a>
                </li>
                <li>
                  {user.username? 
                  <a>{user.username}</a>
                : 
                <a 
                    href='http://localhost:5173/login'
                    >Iniciar sesión</a>}
                    
                </li>
            </ul>
        </div>
    )
}