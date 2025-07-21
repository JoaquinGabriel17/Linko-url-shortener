import Alert from '../Alert/Alert';
import styles from './Register.module.css';
import { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const frontendUrl = import.meta.env.VITE_FRONTEND_URL

export default function Register() {

  const [alertData, setAlertData] = useState(null)
  const { login } = useUser()
  const  navigate  = useNavigate()
  const [form, setForm] = useState({
    name: '',
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
      console.log(form)
      setAlertData({
      type: 'error',
      title: 'Error en los datos de usuario',
      message: 'Las contraseñas deben coincidir'
    })
    return
  }

    try {
      const res = await fetch(`${backendUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!res.ok) {
        setAlertData({
          type: 'error',
          title: 'Error al crear usuario',
          message: data.error || 'El servidor devolvió un error, por favor inténtelo mas tarde'
        })
        return;
      }
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

      // localStorage.setItem('token', data.token);
      navigate('/');
    } catch (err) {
      console.log(err)
      setAlertData({
        type: 'error',
        title: 'Error al crear usuario',
        message: 'Error de red o del servidor, por favor intente mas tarde'
      })
    }
  };

  const resolve = async(e) => {
    setAlertData(null)
  }

  return (
    <div className={styles.background}>
      <a href={`${frontendUrl}`}
      className={styles.homeButton}
      >
        <button>Página principal</button>
      </a>
    <div className={styles.container}>
      <h2 className={styles.title}>Crear cuenta</h2>
      <form className={styles.form}>
        <input 
        type="text" 
        name='name'
        placeholder="Nombre"
        value={form.name}
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
          onClick={handleSubmit}
          type="submit" 
          className={styles.button}>Registrarse</button>
          <a 
          className={styles.loginButton}
          ><button onClick={() => navigate('/login')} >¿Ya tienes una cuenta? Inicia sesión aquí</button></a>
      </form>
      { alertData && <Alert resolve={resolve} alertData={alertData} ></Alert>}
    </div>
    </div>
  );
}
