import Navbar from '../Navbar/Navbar'
import styles from './UserDashboard.module.css'
import { useUser } from '../../context/UserContext';
import React, { useEffect, useState } from 'react';
import Link from '../Link/Link';

export default function UserDashboard(){

    const { user } = useUser()
    const [links, setLinks] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLinks = async () => {
          try {
            const res = await fetch(`http://localhost:3001/links/links?userId=${user.userId}`, {
              headers: {
                'Authorization': `Bearer ${user.token}`,
              },
            });
    
            if (!res.ok) throw new Error('Error al obtener los links');
            const data = await res.json();
            setLinks(data);
          } catch (err) {
            setError(err.message);
          }
        };
    
        if (user.userId) {
          fetchLinks();
        }
      }, [user.userId]);


    return(
        <div className={styles.container}>
            <Navbar></Navbar>
            <h1>Dashboard</h1>
            <div className={styles.linkContainer}>
                    <ul>
                        {links.map(link => (
                        <li key={link._id}>
                          <Link 
                          url={link.originalUrl}
                          name={link.name}
                          description={link.description}
                          linkId={link._id}
                          shortCode={link.shortCode}
                          ></Link>
                        </li>
                        ))}
                    </ul>
            </div>
        </div>
    )
}