import Navbar from '../Navbar/Navbar'
import styles from './UserDashboard.module.css'
import { useUser } from '../../context/UserContext';
import React, { useEffect, useState } from 'react';
import Link from '../Link/Link';
import CreateLink from '../CreateLink/CreateLink';

export default function UserDashboard(){

    const { user } = useUser()
    const [links, setLinks] = useState([]);
    const [error, setError] = useState(null);
    const [createLink, setCreateLink] = useState(false)


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

      const createLinkHandle= async (e) => {
        e.preventDefault();
        setCreateLink(!createLink)
      }


    return(
        <div className={styles.container}>
            <Navbar></Navbar>
            <div className={styles.newLinkContainer}>
            <h1>Dashboard</h1>
            <button 
            className={styles.createLink}
            onClick={createLinkHandle}
            >Nuevo link +</button>

            {createLink&&<CreateLink 
            onClose={() => setCreateLink(false)}
            visible={createLink}></CreateLink>}

            </div>
            <div className={styles.linkContainer}>
                    <ul className={styles.linkList}>
                        {links.map(link => (
                        <li key={link._id}>
                          <Link 
                          url={link.originalUrl}
                          name={link.name}
                          description={link.description}
                          linkId={link._id}
                          shortCode={link.shortCode}
                          onDelete={(id) => setLinks(prev => prev.filter(l => l._id !== id))}
                          ></Link>
                        </li>
                        ))}
                    </ul>
            </div>
        </div>
    )
}