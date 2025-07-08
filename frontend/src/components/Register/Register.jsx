import styles from './Register.module.css';

export default function Register() {
  return (
    <div className={styles.background}>
    <div className={styles.container}>
      <h2 className={styles.title}>Crear cuenta</h2>
      <form className={styles.form}>
        <input type="text" placeholder="Nombre completo" className={styles.input} />
        <input type="email" placeholder="Correo electrónico" className={styles.input} />
        <input type="password" placeholder="Contraseña" className={styles.input} />
        <input type="password" placeholder="Confirmar contraseña" className={styles.input} />
        <button type="submit" className={styles.button}>Registrarse</button>
      </form>
    </div>
    </div>
  );
}
