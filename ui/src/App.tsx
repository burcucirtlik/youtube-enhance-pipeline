import React, {useEffect, useState} from 'react';
import {NewProject} from './pages/NewProject';
import {Project} from './pages/Project';
import {Projects} from './pages/Projects';

// Basit hash yönlendirme: #/ liste · #/new yeni proje · #/p/<id> proje
const useRoute = () => {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.replace(/^#/, '');
};

export const navigate = (to: string) => {
  window.location.hash = to;
};

export const App: React.FC = () => {
  const route = useRoute();
  const m = route.match(/^\/p\/([a-z0-9-]+)/);
  return (
    <div className="app">
      <header className="topbar">
        <a href="#/" className="brand">
          YOUTUBE ENHANCE<small>Zena'nın video pipeline'ı</small>
        </a>
        <div className="spacer" />
        <a href="#/">Projeler</a>
        <button className="primary small" onClick={() => navigate('/new')}>
          + Yeni proje
        </button>
      </header>
      <main className="main">{m ? <Project id={m[1]} key={m[1]} /> : route === '/new' ? <NewProject /> : <Projects />}</main>
    </div>
  );
};
