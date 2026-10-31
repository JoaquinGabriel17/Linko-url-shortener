import styles from './Loading.module.css';

export default function Loading({
  size = 40,
  color = 'var(--color-primary)',
  fullscreen = false,
  message,
}) {
  return (
    <div
      className={fullscreen ? styles.fullscreenContainer : styles.inlineContainer}
      aria-busy="true"
    >
      <div
        className={styles.spinner}
        style={{ width: size, height: size, borderTopColor: color }}
        aria-hidden="true"
      />
      {/* role="status" ya implica aria-live="polite": no se duplica. */}
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
