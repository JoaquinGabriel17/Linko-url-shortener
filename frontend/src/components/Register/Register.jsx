import Alert from '../Alert/Alert';
import styles from './Register.module.css';
import { useState } from 'react';
import { useUser } from '../../context/userContext';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../api';

export default function Register() {
  const [alertData, setAlertData] = useState(null);
  const [confirmError, setConfirmError] = useState('');
  const { login } = useUser();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    // Si el usuario corrige cualquiera de los dos campos, se limpia el error.
    if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
      setConfirmError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertData(null);
    setConfirmError('');

    // Error de campo => inline, asociado con aria-describedby/aria-invalid
    // al input que falla (no un diálogo suelto sin vínculo).
    if (form.password !== form.confirmPassword) {
      setConfirmError('Las contraseñas deben coincidir');
      return;
    }

    try {
      const res = await api.post('/auth/register', {
        username: form.username,
        email: form.email,
        password: form.password,
      });
      const data = res.data;

      login({
        token: data.token,
        username: data.user.username,
        email: data.user.email,
        userId: data.user.id,
      });
      setAlertData({
        type: 'info',
        title: 'Usuario creado con éxito',
      });

      navigate('/');
    } catch (err) {
      setAlertData({
        type: 'error',
        title: 'Error al crear usuario',
        message: getErrorMessage(
          err,
          'El servidor devolvió un error, por favor inténtelo más tarde'
        ),
      });
    }
  };

  const resolve = () => {
    setAlertData(null);
  };

  return (
    <div className={styles.background}>
      {/* Skip link: primer foco de la página (WCAG 2.4.1). */}
      <a href="#main" className="sr-only-focusable">
        Saltar al contenido
      </a>
      {/* Antes era <a onClick> envolviendo un <button>: interactivos anidados,
          HTML inválido. Ahora un solo <button>. */}
      <button
        type="button"
        className={styles.homeButton}
        onClick={() => navigate('/')}
      >
        Página principal
      </button>

      {/* <main id="main"> + h1: landmark único y página con un solo h1
          (axe: landmark-one-main / page-has-heading-one). */}
      <main id="main">
        <div className={styles.container}>
          <h1 className={styles.title}>Crear cuenta</h1>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="register-username">
              Nombre de usuario
            </label>
            <input
              id="register-username"
              type="text"
              name="username"
              placeholder="Nombre de usuario"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              required
              className={styles.input}
            />

            <label className="sr-only" htmlFor="register-email">
              Correo electrónico
            </label>
            <input
              id="register-email"
              type="email"
              name="email"
              placeholder="tu@correo.com"
              className={styles.input}
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              spellCheck={false}
              required
            />

            <label className="sr-only" htmlFor="register-password">
              Contraseña
            </label>
            <input
              id="register-password"
              type="password"
              name="password"
              placeholder="Contraseña"
              className={styles.input}
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />

            <label className="sr-only" htmlFor="register-confirm">
              Confirmar contraseña
            </label>
            <input
              id="register-confirm"
              type="password"
              name="confirmPassword"
              placeholder="Confirmar contraseña"
              className={styles.input}
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
              aria-invalid={confirmError ? true : undefined}
              aria-describedby={confirmError ? 'register-confirm-error' : undefined}
            />
            {confirmError && (
              <p id="register-confirm-error" className={styles.fieldError} role="alert">
                {confirmError}
              </p>
            )}

            <button type="submit" className={styles.button}>
              Registrarse
            </button>

            {/* Navegación a /login => <Link> (antes <a> envolviendo <button>). */}
            <Link to="/login" className={styles.loginButton}>
              ¿Ya tenés una cuenta? Iniciá sesión
            </Link>
          </form>

          {/* Montado siempre: el <dialog> interno solo togglea `open`. */}
          <Alert resolve={resolve} alertData={alertData} />
        </div>
      </main>
    </div>
  );
}
