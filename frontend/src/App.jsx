import UrlForm from './components/UrlForm/UrlForm';
import styles from './App.module.css';
import Navbar from './components/Navbar/Navbar';
import Example from './components/Example/Example';


function App() {
  return (
    <div className={styles.container}>
      <Navbar></Navbar>
      <h1>Acortador de URLs de código abierto</h1>
      <UrlForm />
      <Example></Example>
    </div>
  );
}

export default App;
