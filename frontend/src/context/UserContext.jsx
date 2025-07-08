import { createContext, useContext, useState } from 'react';

// Creamos el contexto
export const UserContext = createContext();

// Proveedor del contexto
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Intentamos cargar desde localStorage si ya estaba logueado
    const saved = sessionStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook personalizado para consumir el contexto
export const useUser = () => useContext(UserContext);
