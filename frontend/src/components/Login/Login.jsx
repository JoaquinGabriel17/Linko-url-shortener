import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import { useUser } from '../../context/UserContext'; // contexto de usuario
const backendUrl = process.env.BACKEND_URL;

export default function Login() {
  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  const navigate = useNavigate();

  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };
  const { login } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${backendUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }
      login({
        token: data.token,
        username: data.user.username,
        email: data.user.email,
        userId: data.user.id
      });

      // localStorage.setItem('token', data.token);
      navigate('/');
    } catch (err) {
      setError('Error de red o del servidor');
    }
  };

  return (
    <div className={styles.background}>
      <div className={styles.container}>
        <h2 className={styles.title}>Iniciar sesión</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            className={styles.input}
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            className={styles.input}
            value={form.password}
            onChange={handleChange}
            required
          />
          <button type="submit" className={styles.button}>Ingresar</button>
          {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
        </form>
        <a href={`${backendUrl}/register`}>Crear una cuenta</a>
      </div>
    </div>
  );
}
