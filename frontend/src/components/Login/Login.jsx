import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './Login.module.css';
import { useUser } from '../../context/userContext';
import api, { getErrorMessage } from '../../api';
import Loading from '../Loading/Loading';

// AMBOS campos (email y password) apuntan al MISMO id: el error de login que
// llega al UI es SIEMPRE genérico — "Credenciales inválidas" (401), "Error del
// servidor" (500) o mensajes de red. Los errores específicos de campo del backend
// ("Email inválido", "La contraseña es obligatoria" / zod 400 en routes/auth.js)
// son INALCANZABLES: el input usa type="email" + required, así que la validación
// nativa del navegador bloquea el submit antes de la request.
// Si algún flujo llegara a devolver un error de UN campo, crear ids separados
// (login-email-error / login-password-error) para que password no anuncie el
// error del email.
const LOGIN_ERROR_ID = 'login-error';

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
      {/* Skip link: primer foco de la página (WCAG 2.4.1). */}
      <a href="#main" className="sr-only-focusable">
        Saltar al contenido
      </a>
      <button type="button" className={styles.homeButton} onClick={() => navigate('/')}>
        Página principal
      </button>

      {loading ? (
        <Loading fullscreen />
      ) : (
        // <main id="main"> + h1: landmark único y página con un solo h1
        // (axe: landmark-one-main / page-has-heading-one). .title es clase,
        // no selector de elemento: el estilo visual no cambia.
        <main id="main">
          <div className={styles.container}>
            <h1 className={styles.title}>Iniciar sesión</h1>

            {expired && (
              <p className={styles.expired} role="status">
                Tu sesión expiró. Iniciá sesión de nuevo.
              </p>
            )}

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="login-email">
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="tu@correo.com"
                className={styles.input}
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                spellCheck={false}
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? LOGIN_ERROR_ID : undefined}
              />

              <label className="sr-only" htmlFor="login-password">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                name="password"
                placeholder="Contraseña"
                className={styles.input}
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? LOGIN_ERROR_ID : undefined}
              />

              <button type="submit" className={styles.button}>
                Ingresar
              </button>

              {error && (
                <p id={LOGIN_ERROR_ID} className={styles.error} role="alert">
                  {error}
                </p>
              )}
            </form>

            <Link to="/register">Crear una cuenta</Link>
          </div>
        </main>
      )}
    </div>
  );
}
