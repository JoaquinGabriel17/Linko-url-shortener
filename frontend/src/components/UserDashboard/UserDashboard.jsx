import Navbar from '../Navbar/Navbar'
import styles from './UserDashboard.module.css'
import { useUser } from '../../context/userContext';
import api from '../../api';
import React, { useEffect, useState } from 'react';
import Link from '../Link/Link';
import UrlForm from '../UrlForm/UrlForm';
import Loading from '../Loading/Loading';

export default function UserDashboard(){

    const { user } = useUser()
    const [links, setLinks] = useState([]);
    const [error, setError] = useState(null);
    const [createLink, setCreateLink] = useState(false)
    const [ loading, setLoading ] = useState(false)

    useEffect(() => {
        const fetchLinks = async () => {
          setLoading(true)
          try {
            const res = await api.get('/links');
            setLinks(res.data);
          } catch (err) {
            setError(err.response?.data?.message || err.message);
          } finally {
            setLoading(false)
          }
        };

        if (user?.userId) {
          fetchLinks();
        }
      }, [user?.userId]);

      const createLinkHandle= async (e) => {
        e.preventDefault();
        setCreateLink(!createLink)
      }


    return(
        <div className={styles.container}>
            <Navbar></Navbar>
            <div className={styles.newLinkContainer}>
            <h1>Tablero</h1>
            <button 
            className={styles.createLink}
            onClick={createLinkHandle}
            >Nuevo link +</button>

            {createLink&&<UrlForm 
            inModal
            onClose={() => setCreateLink(false)}></UrlForm>}

            </div>
            { loading ? <Loading message='Cargando links de la cuenta'></Loading> : (
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
            )}
        </div>
    )
}