import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import RedirectPage from './components/RedirectPage';
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import './main.css'; // <--- IMPORTANTE
import { UserProvider } from './context/UserContext';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
    <UserProvider>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path="/:shortCode" element={<RedirectPage />} />
      </Routes>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
