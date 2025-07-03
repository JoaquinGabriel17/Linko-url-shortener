import styles from './Login.module.css';

export default function Login() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Iniciar sesión</h2>
      <form className={styles.form}>
        <input type="email" placeholder="Correo electrónico" className={styles.input} />
        <input type="password" placeholder="Contraseña" className={styles.input} />
        <button type="submit" className={styles.button}>Ingresar</button>
      </form>
      <a href='http://localhost:5173/register'>Crear una cuenta</a>
    </div>
  );
}
