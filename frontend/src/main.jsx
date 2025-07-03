import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import RedirectPage from './components/RedirectPage';
import Login from './components/Login/Login';
import Register from './components/Register/Register';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path="/:shortCode" element={<RedirectPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
