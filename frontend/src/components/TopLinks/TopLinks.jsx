import React, { useEffect, useState } from 'react';
import { useUser } from '../../context/UserContext';
import Link from '../Link/Link'
import styles from './TopLinks.module.css'

function TopLinks() {
  const [topLinks, setTopLinks] = useState([]);
  const [error, setError] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    const fetchTopLinks = async () => {
      try {
        const token = localStorage.getItem('token'); // si guardás el token ahí
        const res = await fetch(`http://localhost:3001/links/links?limit=5&sort=clicks&userId=${user.userId}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        });

        if (!res.ok) throw new Error('Error al obtener los links');
        const data = await res.json();
        setTopLinks(data);
      } catch (err) {
        setError(err.message);
      }
    };

    if (user.userId) {
      fetchTopLinks();
    }
  }, [user.userId]);
 
 

  if (error) return <p>Error: {error}</p>;

  return (
    <div className={styles.container}>
      <h3>Tus links más clickeados</h3>
      <ul>
        {topLinks.map(link => (
          <li key={link._id}>
            <Link url={link.originalUrl}></Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TopLinks;
