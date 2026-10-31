import UrlForm from './components/UrlForm/UrlForm';
import styles from './App.module.css';
import Navbar from './components/Navbar/Navbar';
import Example from './components/Example/Example';
import TopLinks from './components/TopLinks/TopLinks';
import { useUser } from './context/userContext';

function App() {
  const { user } = useUser();

  return (
    // Navbar como HERMANO de .container: así es full-bleed natural (100% de
    // body = viewport) sin hacks de margen negativo ni 100vw. .container
    // concentra el max-width/centrado/padding del contenido.
    // Skip link + <main id="main">: WCAG 2.4.1 (bypass) y landmark único.
    <>
      <a href="#main" className="sr-only-focusable">
        Saltar al contenido
      </a>
      <Navbar />
      <main id="main">
        <div className={styles.container}>
          <h1>Acortador de URLs de código abierto</h1>
          <UrlForm />
          {user?.username && <TopLinks />}
          <Example />
        </div>
      </main>
    </>
  );
}

export default App;
