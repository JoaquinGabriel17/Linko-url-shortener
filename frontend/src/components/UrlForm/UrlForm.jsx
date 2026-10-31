import { useEffect, useRef, useState } from 'react';
import { FaCheck, FaRegCopy } from 'react-icons/fa';
import api, { getErrorMessage } from '../../api';
import { useUser } from '../../context/userContext';
import { useCopy } from '../../lib/useCopy';
import { syncModalScrollLock } from '../../lib/modalScrollLock';
import Loading from '../Loading/Loading';
import styles from './UrlForm.module.css';

const ERROR_ID = 'urlform-error';

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Formulario único de creación: se usa inline en la home y en modo modal en el
// dashboard. El alias solo se ofrece a usuarios autenticados (el backend lo
// rechaza con 401 para anónimos).
export default function UrlForm({ inModal = false, open = true, onClose, onCreated }) {
  const { user } = useUser();
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const { copied, copy } = useCopy();
  const dialogRef = useRef(null);

  // <dialog> SIEMPRE montado (en modo modal); solo se togglea `open`.
  // Sincroniza ambos sentidos para no llamar showModal() sobre un nodo
  // inexistente. Regala Esc, ::backdrop, inert del resto y retorno de foco.
  useEffect(() => {
    if (!inModal) return undefined;
    const el = dialogRef.current;
    if (!el) return undefined;
    if (open && !el.open) {
      el.showModal();
      syncModalScrollLock();
    }
    if (!open && el.open) {
      el.close();
      syncModalScrollLock();
    }
    return () => {
      // Si el componente se desmonta con el diálogo abierto, cerrarlo y soltar
      // el bloqueo de scroll; si no, la página quedaría inmovilizada.
      if (el.open) el.close();
      syncModalScrollLock();
    };
  }, [inModal, open]);

  // Antes el montaje condicional reseteaba el formulario; ahora que el
  // diálogo queda montado, se limpia cada vez que se abre.
  useEffect(() => {
    if (!inModal || !open) return;
    setResult(null);
    setUrl('');
    setAlias('');
    setName('');
    setDescription('');
    setError('');
  }, [inModal, open]);

  // Omite los campos vacíos: un alias vacío fallaría la validación y name/
  // description vacíos desactivarían la deduplicación del backend.
  const buildPayload = (forceNew) => {
    const payload = { originalUrl: url.trim() };
    if (alias.trim()) payload.shortCode = alias.trim();
    if (name.trim()) payload.name = name.trim();
    if (description.trim()) payload.description = description.trim();
    if (forceNew) payload.forceNew = true;
    return payload;
  };

  const submit = async (forceNew = false) => {
    setError('');

    if (!isValidHttpUrl(url.trim())) {
      setError('Ingresá una URL válida (debe empezar con http:// o https://).');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/links/create', buildPayload(forceNew));
      setResult(res.data);
      if (typeof onCreated === 'function') onCreated(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo acortar la URL.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submit(false);
  };

  const handleReset = () => {
    setResult(null);
    setUrl('');
    setAlias('');
    setName('');
    setDescription('');
    setError('');
  };

  const form = (
    <>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="urlform-url">
          URL a acortar
        </label>
        <input
          id="urlform-url"
          className={styles.input}
          type="text"
          inputMode="url"
          placeholder="Pegá tu URL (https://…)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoComplete="url"
          disabled={loading}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? ERROR_ID : undefined}
        />

        {user && (
          <div className={styles.metaFields}>
            <label className="sr-only" htmlFor="urlform-alias">
              Alias
            </label>
            <input
              id="urlform-alias"
              className={styles.input}
              type="text"
              placeholder="Alias (opcional)"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              autoComplete="off"
              disabled={loading}
            />

            <label className="sr-only" htmlFor="urlform-name">
              Nombre
            </label>
            <input
              id="urlform-name"
              className={styles.input}
              type="text"
              placeholder="Nombre (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              disabled={loading}
            />

            <label className="sr-only" htmlFor="urlform-description">
              Descripción
            </label>
            <input
              id="urlform-description"
              className={styles.input}
              type="text"
              placeholder="Descripción (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoComplete="off"
              disabled={loading}
            />
          </div>
        )}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? 'Acortando…' : 'Acortar'}
        </button>
      </form>

      {loading && <Loading message="Acortando link…" />}

      {error && (
        <p id={ERROR_ID} className={styles.error} role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className={styles.result}>
          {result.deduplicated && (
            <p className={styles.notice}>
              Ya habías acortado esta URL; este es tu enlace existente.
            </p>
          )}

          <a
            className={styles.shortLink}
            href={result.shortUrl}
            target="_blank"
            rel="noreferrer"
          >
            {result.shortUrl}
          </a>

          <div className={styles.resultActions}>
            <button
              type="button"
              className={styles.copyButton}
              onClick={() => copy(result.shortUrl)}
            >
              {copied ? (
                <>
                  <FaCheck aria-hidden="true" focusable="false" /> ¡Copiado!
                </>
              ) : (
                <>
                  <FaRegCopy aria-hidden="true" focusable="false" /> Copiar
                </>
              )}
            </button>

            {result.deduplicated && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => submit(true)}
                disabled={loading}
              >
                Crear uno nuevo igualmente
              </button>
            )}

            <button type="button" className={styles.secondaryButton} onClick={handleReset}>
              Acortar otra
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (inModal) {
    return (
      <dialog
        ref={dialogRef}
        className={styles.modal}
        aria-labelledby="urlform-modal-title"
        onCancel={onClose}
        onClick={(e) => {
          // El click sobre el ::backdrop llega con target === el propio dialog.
          if (e.target === dialogRef.current) onClose();
        }}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        <h2 className={styles.title} id="urlform-modal-title">
          Nuevo link
        </h2>
        {form}
      </dialog>
    );
  }

  return <div className={styles.container}>{form}</div>;
}
