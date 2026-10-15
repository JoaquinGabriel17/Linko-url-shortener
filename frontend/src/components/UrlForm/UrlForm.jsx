import { useState } from 'react';
import { FaCheck, FaRegCopy } from 'react-icons/fa';
import api, { getErrorMessage } from '../../api';
import { useUser } from '../../context/userContext';
import { useCopy } from '../../lib/useCopy';
import Loading from '../Loading/Loading';
import styles from './UrlForm.module.css';

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
export default function UrlForm({ inModal = false, onClose, onCreated }) {
  const { user } = useUser();
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const { copied, copy } = useCopy();

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
        <input
          className={styles.input}
          type="text"
          placeholder="Pegá tu URL (https://...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          required
        />

        {user && (
          <div className={styles.metaFields}>
            <input
              className={styles.input}
              type="text"
              placeholder="Alias (opcional)"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              disabled={loading}
            />
            <input
              className={styles.input}
              type="text"
              placeholder="Nombre (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            <input
              className={styles.input}
              type="text"
              placeholder="Descripción (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? 'Acortando...' : 'Acortar'}
        </button>
      </form>

      {loading && <Loading message="Acortando link" />}

      {error && (
        <p className={styles.error} role="alert">
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
                  <FaCheck /> ¡Copiado!
                </>
              ) : (
                <>
                  <FaRegCopy /> Copiar
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
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
          <h2 className={styles.title}>Nuevo link</h2>
          {form}
        </div>
      </div>
    );
  }

  return <div className={styles.container}>{form}</div>;
}
