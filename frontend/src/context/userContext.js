import { createContext, useContext } from 'react';

// Contexto y hook viven sin JSX para que el archivo del provider solo exporte
// componentes (regla react-refresh: no mezclar componentes y no-componentes).
export const UserContext = createContext(null);

export const useUser = () => useContext(UserContext);
