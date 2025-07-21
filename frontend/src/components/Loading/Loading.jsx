import styles from './Loading.module.css';

export default function Loading({ size = 40, color = '#1e90ff', fullscreen = false, message }) {
  return (
    <div className={fullscreen ? styles.fullscreenContainer : styles.inlineContainer}>
      <div
        className={styles.spinner}
        style={{
          width: size,
          height: size,
          borderTopColor: color,
        }}
      ></div>
      <h2>{message}</h2>
    </div>
  );
}
