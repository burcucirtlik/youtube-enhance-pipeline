import React, {useEffect, useState} from 'react';
import {api, fmt, STATUS_LABEL, type ProjectSummary} from '../api';
import {navigate} from '../App';

export const Projects: React.FC = () => {
  const [list, setList] = useState<ProjectSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => api.projects().then(setList).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    // Çalışan işler listede güncel görünsün.
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  if (err) return <p className="err">{err}</p>;
  if (!list) return <p className="muted">Yükleniyor…</p>;
  if (!list.length)
    return (
      <div className="narrow card">
        <h1>Henüz proje yok</h1>
        <p className="muted">Bir kurgu videosu ve 📍 işaretli script yükleyerek başla.</p>
        <button className="primary" onClick={() => navigate('/new')}>
          + Yeni proje
        </button>
      </div>
    );

  return (
    <>
      <h1>Projeler</h1>
      <div className="projects">
        {list.map((p) => (
          <div key={p.id} className="card project" onClick={() => navigate(`/p/${p.id}`)}>
            <div className="row">
              <span className={`badge ${p.status}`}>{STATUS_LABEL[p.status]}</span>
              {p.pendingPhotos ? <span className="badge foto-seçimi">{p.pendingPhotos} fotoğraf bekliyor</span> : null}
            </div>
            <div className="title">{p.title}</div>
            <div className="muted mono">{p.id}</div>
            <div className="muted" style={{fontSize: 12}}>
              {p.durationSec ? `${fmt(p.durationSec)} · ` : ''}
              {p.sceneCount ? `${p.sceneCount} sahne · ` : ''}
              {!p.hasVideo ? 'kurgu kaydı yok · ' : ''}
              {new Date(p.updatedAt ?? p.createdAt).toLocaleString('tr-TR')}
            </div>
            {p.error ? <div className="err" style={{fontSize: 12}}>{p.error}</div> : null}
          </div>
        ))}
      </div>
    </>
  );
};
