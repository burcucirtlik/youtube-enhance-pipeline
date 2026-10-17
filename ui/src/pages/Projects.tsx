import React, {useEffect, useState} from 'react';
import {api, fmt, fmtBytes, STATUS_LABEL, type ProjectSummary} from '../api';
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

  const active = list.filter((p) => !p.archived);
  const archived = list.filter((p) => p.archived);
  const total = list.reduce((a, p) => a + (p.disk?.total ?? 0), 0);
  const shared = list.reduce((a, p) => a + (p.disk?.shared ?? 0), 0);

  return (
    <>
      <div className="row" style={{alignItems: 'baseline'}}>
        <h1>Projeler</h1>
        <span className="muted" style={{fontSize: 12}} title="Aynı kurgu kaydı birden çok projedeyse diskte bir kez yer kaplar (ortak medya deposu)">
          {total ? `diskte ~${fmtBytes(total - shared / 2)}` : ''}
        </span>
      </div>
      <div className="projects">{active.map((p) => <Card key={p.id} p={p} />)}</div>
      {archived.length ? (
        <>
          <h2 style={{marginTop: 24}} className="muted">
            Arşiv
          </h2>
          <div className="projects archived">{archived.map((p) => <Card key={p.id} p={p} />)}</div>
        </>
      ) : null}
    </>
  );
};

const Card: React.FC<{p: ProjectSummary}> = ({p}) => (
  <div className="card project" onClick={() => navigate(`/p/${p.id}`)}>
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
    {p.disk ? (
      <div className="muted" style={{fontSize: 12}} title={Object.entries(p.disk.byFolder).map(([k, v]) => `${k === '.' ? 'script vb.' : k}: ${fmtBytes(v)}`).join('\n')}>
        {fmtBytes(p.disk.total)}
        {p.disk.shared ? ` · ${fmtBytes(p.disk.shared)} başka projeyle ortak` : ''}
        {p.disk.reclaimable > 50e6 ? ` · ${fmtBytes(p.disk.reclaimable)} temizlenebilir` : ''}
      </div>
    ) : null}
    {p.error ? <div className="err" style={{fontSize: 12}}>{p.error}</div> : null}
  </div>
);
