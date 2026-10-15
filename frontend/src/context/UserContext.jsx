import { createContext, useContext, useState } from 'react';
import { clearSession, getSession, setSession } from '../session';

// Creamos el contexto
export const UserContext = createContext();

// Proveedor del contexto. sessionStorage es la única fuente del token.
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => getSession());

  const login = (userData) => {
    setUser(userData);
    setSession(userData);
  };

  const logout = () => {
    setUser(null);
    clearSession();
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook personalizado para consumir el contexto
export const useUser = () => useContext(UserContext);
