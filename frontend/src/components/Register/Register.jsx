import Alert from '../Alert/Alert';
import styles from './Register.module.css';
import { useState } from 'react';
import { useUser } from '../../context/userContext';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../api';

export default function Register() {

  const [alertData, setAlertData] = useState(null)
  const { login } = useUser()
  const  navigate  = useNavigate()
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertData(null);

    if(form.password !== form.confirmPassword) {
      setAlertData({
      type: 'error',
      title: 'Error en los datos de usuario',
      message: 'Las contraseñas deben coincidir'
    })
    return
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
        userId: data.user.id
      });
      setAlertData({
        type: 'info',
        title: 'Usuario creado con éxito'
      })

      navigate('/');
    } catch (err) {
      setAlertData({
        type: 'error',
        title: 'Error al crear usuario',
        message: getErrorMessage(
          err,
          'El servidor devolvió un error, por favor inténtelo más tarde'
        ),
      })
    }
  };

  const resolve = () => {
    setAlertData(null)
  }

  return (
    <div className={styles.background}>
      <a onClick={() => navigate('/')}
      className={styles.homeButton}
      >
        <button>Página principal</button>
      </a>
    <div className={styles.container}>
      <h2 className={styles.title}>Crear cuenta</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input 
        type="text" 
        name='username'
        placeholder="Nombre"
        value={form.username}
        onChange={handleChange}
        required
        className={styles.input} />
        <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            className={styles.input}
            value={form.email}
            onChange={handleChange}
            required
          />        <input
            type="password"
            name="password"
            placeholder="Contraseña"
            className={styles.input}
            value={form.password}
            onChange={handleChange}
            required
          />        
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirmar contraseña"
            className={styles.input}
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />        
          <button
          type="submit" 
          className={styles.button}>Registrarse</button>
          <a 
          className={styles.loginButton}
          ><button type="button" onClick={() => navigate('/login')} >¿Ya tienes una cuenta? Inicia sesión aquí</button></a>
      </form>
      { alertData && <Alert resolve={resolve} alertData={alertData} ></Alert>}
    </div>
    </div>
  );
}
