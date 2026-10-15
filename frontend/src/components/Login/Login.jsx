import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './Login.module.css';
import { useUser } from '../../context/userContext';
import api, { getErrorMessage } from '../../api';
import Loading from '../Loading/Loading';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expired = searchParams.get('expired') === '1';
  const { login } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', form);
      const data = res.data;

      login({
        token: data.token,
        username: data.user.username,
        email: data.user.email,
        userId: data.user.id,
      });

      navigate('/');
    } catch (err) {
      // Un 401 acá son credenciales inválidas (el interceptor no marca esta
      // request como sesión expirada).
      setError(getErrorMessage(err, 'Error al iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.background}>
      <button className={styles.homeButton} onClick={() => navigate('/')}>
        Página principal
      </button>

      {loading ? (
        <Loading fullscreen />
      ) : (
        <div className={styles.container}>
          <h2 className={styles.title}>Iniciar sesión</h2>

          {expired && (
            <p className={styles.expired}>Tu sesión expiró. Iniciá sesión de nuevo.</p>
          )}

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
            <button type="submit" className={styles.button}>
              Ingresar
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </form>

          <a onClick={() => navigate('/register')}>Crear una cuenta</a>
        </div>
      )}
    </div>
  );
}
