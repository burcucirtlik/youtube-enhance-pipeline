import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {RunEvent} from '../../../src/pipeline/run';
import type {ScenesFile} from '../../../src/shared/types';
import {api, fmt, fmtBytes, STATUS_LABEL, type ProjectDetail} from '../api';
import {navigate} from '../App';
import {Editor} from '../components/Editor';
import {Photos} from '../components/Photos';
import {Stages} from '../components/Stages';

type Tab = 'islem' | 'fotolar' | 'editor' | 'sonuc';

export const Project: React.FC<{id: string}> = ({id}) => {
  const [d, setD] = useState<ProjectDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const unsub = useRef<(() => void) | null>(null);

  const load = useCallback(() => api.project(id).then(setD).catch((e) => setErr(e.message)), [id]);

  /** Çalışan işe abone ol; iş bitince projeyi yeniden yükle ve uygun sekmeye geç. */
  const follow = useCallback(() => {
    unsub.current?.();
    setEvents([]);
    setJobError(null);
    setRunning(true);
    unsub.current = api.events(
      id,
      (e) => setEvents((ev) => [...ev, e]),
      (error) => {
        setRunning(false);
        setJobError(error);
        load().then(() => setTab(null));
      },
    );
  }, [id, load]);

  useEffect(() => {
    load();
    return () => unsub.current?.();
  }, [load]);

  // Çalışan iş yoksa diske kaydedilmiş son işin günlüğünü göster (uygulama yeniden açıldığında da).
  const loadedLog = useRef(false);
  useEffect(() => {
    if (!d || loadedLog.current || d.status === 'işleniyor' || d.status === 'render') return;
    loadedLog.current = true;
    api
      .lastLog(id)
      .then((r) => setEvents((ev) => (ev.length ? ev : r.events)))
      .catch(() => {});
  }, [d, id]);

  // İlk yüklemede çalışan iş varsa akışa bağlan; sekmeyi duruma göre seç.
  useEffect(() => {
    if (!d) return;
    if ((d.status === 'işleniyor' || d.status === 'render') && !running) follow();
    if (tab === null) {
      setTab(
        d.status === 'işleniyor' || d.status === 'render' || d.status === 'yeni' || d.status === 'hata'
          ? 'islem'
          : d.status === 'foto-seçimi'
            ? 'fotolar'
            : d.status === 'bitti'
              ? 'sonuc'
              : 'editor',
      );
    }
  }, [d, tab, running, follow]);

  const [uploading, setUploading] = useState(false);
  /** Var olan projeye video ya da altyazı yükle; ikisi de tamamsa pipeline'ı başlat. */
  const upload = async (field: 'video' | 'subtitles', file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append(field, file);
      const r = await api.uploadFiles(id, form);
      setD(r);
      if (r.hasVideo && r.hasSubtitles && r.hasScript) await prepare(false);
    } catch (e: any) {
      setJobError(e.message);
      setTab('islem');
    } finally {
      setUploading(false);
    }
  };

  const prepare = async (force: boolean) => {
    await api.prepare(id, force);
    setTab('islem');
    follow();
  };
  const render = async (opts: {frames?: string}) => {
    await api.render(id, opts);
    setTab('islem');
    follow();
  };
  const savePhotos = async (selections: Record<string, number[]>) => {
    const r = await api.photos(id, selections);
    setD(r);
    setTab('editor');
  };
  const onScenes = (scenes: ScenesFile) => setD((x) => (x ? {...x, scenes} : x));
  const cleanup = async () => {
    const plan = await api.cleanupPlan(id);
    if (!plan.items.length) return alert('Temizlenecek yeniden üretilebilir dosya yok.');
    const list = plan.items.map((i) => `• ${i.path} (${fmtBytes(i.bytes)}): ${i.why}`).join('\n');
    if (!confirm(`Silinecekler:\n${list}\n\nScript, kurgu kaydı, seçilen fotoğraflar, düzenlemeler ve son video kalır.`)) return;
    const r = await api.cleanup(id);
    alert(`${fmtBytes(r.bytes)} yer açıldı.`);
    load();
  };
  const archive = async (archived: boolean) => {
    if (archived && !confirm('Proje arşive alınsın mı? Listede alta iner, yeniden üretilebilir dosyaları (aday fotoğraflar, görsel katmanı) silinir. Script, kurgu kaydı, düzenlemeler ve son video kalır.')) return;
    const r = await api.archive(id, archived);
    if (r.freed) alert(`${fmtBytes(r.freed)} yer açıldı.`);
    load();
  };
  const remove = async () => {
    if (!confirm(`"${d?.title}" projesi ve bütün dosyaları silinsin mi? Bu geri alınamaz.`)) return;
    await api.remove(id);
    navigate('/');
  };

  if (err) return <p className="err">{err}</p>;
  if (!d) return <p className="muted">Yükleniyor…</p>;

  const pendingPhotos = d.photos.filter((p) => p.state === 'bekliyor').length;
  const canEdit = Boolean(d.scenes);

  return (
    <div>
      <div className="row" style={{marginBottom: 10}}>
        <h1 style={{margin: 0}}>{d.title}</h1>
        <span className={`badge ${d.status}`}>{STATUS_LABEL[d.status]}</span>
        <span className="muted mono">{d.id}</span>
        <span style={{flex: 1}} />
        {running ? (
          <button className="small danger" onClick={() => api.cancel(id).catch((e) => setJobError(e.message))} title="Çalışan işi durdurur; yarım render ve geçici dosyalar silinir">
            İptal
          </button>
        ) : null}
        {d.hasVideo && d.hasScript && d.hasSubtitles ? (
          <button className="small" onClick={() => prepare(false)} disabled={running} title="Script ya da kurgu değiştiyse pipeline'ı baştan çalıştırır">
            Pipeline'ı yeniden çalıştır
          </button>
        ) : null}
        {d.hasSubtitles ? (
          <label className="button small" title="Yanlış ya da eski altyazı yüklendiyse Descript'ten aldığın doğru SRT'yi yükle; hazırlık yeniden çalışır" style={{cursor: running || uploading ? 'default' : 'pointer', opacity: running || uploading ? 0.5 : 1}}>
            Altyazıyı değiştir
            <input type="file" accept=".srt,.vtt" style={{display: 'none'}} disabled={running || uploading} onChange={(e) => upload('subtitles', e.target.files?.[0])} />
          </label>
        ) : null}
        <button className="small" onClick={cleanup} disabled={running} title="Yeniden üretilebilir dosyaları (aday fotoğraflar, görsel katmanı, yarım render) siler">
          Temizle{d.disk?.reclaimable ? ` (${fmtBytes(d.disk.reclaimable)})` : ''}
        </button>
        <button className="small" onClick={() => archive(!d.archived)} disabled={running}>
          {d.archived ? 'Arşivden çıkar' : 'Arşivle'}
        </button>
        <button className="small danger" onClick={remove} disabled={running}>
          Projeyi sil
        </button>
      </div>
      {!d.hasVideo || !d.hasSubtitles ? (
        <div className="card" style={{marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10}}>
          <div className="warn">
            {!d.hasVideo && !d.hasSubtitles ? 'Kurgu videosu ve Descript altyazısı eksik.' : !d.hasVideo ? 'Kurgu videosu eksik.' : "Descript altyazısı (SRT) eksik: Descript'te Export → Subtitles → SRT."}
          </div>
          <div className="row" style={{flexWrap: 'wrap'}}>
            {!d.hasVideo ? (
              <label className="row">
                Video <input type="file" accept="video/*,audio/*" onChange={(e) => upload('video', e.target.files?.[0])} disabled={uploading} />
              </label>
            ) : null}
            {!d.hasSubtitles ? (
              <label className="row">
                Altyazı <input type="file" accept=".srt,.vtt" onChange={(e) => upload('subtitles', e.target.files?.[0])} disabled={uploading} />
              </label>
            ) : null}
            {uploading ? <span className="muted">Yükleniyor…</span> : null}
          </div>
        </div>
      ) : null}
      <div className="tabs">
        <button className={tab === 'islem' ? 'active' : ''} onClick={() => setTab('islem')}>
          İşlem{running ? <span className="dot" style={{background: 'var(--accent2)'}} /> : null}
        </button>
        <button className={tab === 'fotolar' ? 'active' : ''} onClick={() => setTab('fotolar')} disabled={!d.photos.length}>
          Fotoğraflar{pendingPhotos ? <span className="dot" /> : null}
        </button>
        <button className={tab === 'editor' ? 'active' : ''} onClick={() => setTab('editor')} disabled={!canEdit}>
          Editör
        </button>
        <button className={tab === 'sonuc' ? 'active' : ''} onClick={() => setTab('sonuc')} disabled={!d.hasOut}>
          Sonuç
        </button>
      </div>

      {tab === 'islem' ? (
        <div>
          <Stages stages={d.stages} events={events} running={running} error={jobError ?? d.error ?? (running ? null : (d.lastJob?.error ?? null))} freshness={d.freshness} />
          {!running && (['lint', 'timing', 'assets', 'align'] as const).some((k) => d.freshness?.[k]?.state === 'değişti') && d.hasVideo && d.hasSubtitles ? (
            <div className="card" style={{marginTop: 12}}>
              <span className="warn">Script, altyazı ya da görseller son çalıştırmadan beri değişti.</span> Yalnızca değişen aşamalar yeniden çalışır.{' '}
              <button className="primary small" onClick={() => prepare(false)}>
                Güncelle
              </button>
            </div>
          ) : null}
          {!running && d.status === 'foto-seçimi' ? (
            <div className="card" style={{marginTop: 12}}>
              {pendingPhotos} arşiv fotoğrafı seçim bekliyor.{' '}
              <button className="primary small" onClick={() => setTab('fotolar')}>
                Fotoğrafları seç
              </button>
            </div>
          ) : null}
          {!running && canEdit && d.status !== 'foto-seçimi' ? (
            <div className="card" style={{marginTop: 12}}>
              Hizalama hazır: {d.sceneCount} sahne, {d.durationSec ? fmt(d.durationSec) : ''}.{' '}
              <button className="primary small" onClick={() => setTab(d.hasOut ? 'sonuc' : 'editor')}>
                {d.hasOut ? 'Sonucu gör' : 'Editörü aç'}
              </button>
            </div>
          ) : null}
          {d.lint ? (
            <div className="card" style={{marginTop: 12}}>
              <h2>Script kontrolü · {d.lint.file}</h2>
              <div className="muted" style={{fontSize: 12, marginBottom: 6}}>
                {Object.entries(d.lint.stats)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')}
              </div>
              <div className="lint-list">
                {d.lint.issues.map((i, k) => (
                  <div key={k}>
                    <span className={i.level === 'hata' ? 'err' : i.level === 'uyarı' ? 'warn' : 'muted'}>{i.level}</span> <span className="muted mono">satır {i.line}</span> {i.msg}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'fotolar' ? <Photos projectId={id} photos={d.photos} onSave={savePhotos} /> : null}

      {tab === 'editor' && d.scenes ? <Editor projectId={id} scenes={d.scenes} onScenes={onScenes} onRender={render} rendering={running} /> : null}

      {tab === 'sonuc' && d.hasOut ? (
        <div className="video-result">
          <video controls src={`/files/${id}/out/video.mp4?t=${d.outUpdatedAt ?? ''}`} />
          <div className="row" style={{marginTop: 10}}>
            <a href={`/files/${id}/out/video.mp4`} download={`${id}.mp4`}>
              <button className="primary">Videoyu indir</button>
            </a>
            <a href={`/files/${id}/out/bolumler.txt`} target="_blank" rel="noreferrer">
              <button>YouTube bölümleri</button>
            </a>
            <button onClick={() => setTab('editor')}>Editöre dön</button>
            <span className="muted mono">videos/{id}/out/video.mp4</span>
          </div>
          {d.scenes && d.outUpdatedAt && new Date(d.outUpdatedAt) < new Date(d.scenes.generatedAt) ? (
            <p className="warn">Sahneler bu render'dan sonra değişti; yeni bir render al.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
