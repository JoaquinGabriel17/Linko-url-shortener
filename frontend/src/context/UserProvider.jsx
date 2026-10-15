import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from './userContext';
import { AUTH_EXPIRED_EVENT } from '../api';
import { clearSession, getSession, setSession } from '../session';

// La sesión se inicializa de forma síncrona desde sessionStorage, por lo que no
// hay estado de carga: el `user` está disponible en el primer render.
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => getSession());
  const navigate = useNavigate();

  const login = (userData) => {
    setUser(userData);
    setSession(userData);
  };

  const logout = () => {
    setUser(null);
    clearSession();
  };

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      clearSession();
      navigate('/login?expired=1', { replace: true });
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [navigate]);

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
