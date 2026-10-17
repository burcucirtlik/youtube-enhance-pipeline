import React, {useState} from 'react';
import {api, YTE_HEADER} from '../api';
import {navigate} from '../App';

export const NewProject: React.FC = () => {
  const [title, setTitle] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [script, setScript] = useState<File | null>(null);
  const [subs, setSubs] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!script) return setErr('İşaretli script dosyası gerekli');
    if (video && !subs) return setErr('Video yüklüyorsan Descript altyazısı (SRT) da gerekli: Export → Subtitles → SRT');
    setErr(null);
    setBusy(true);
    const form = new FormData();
    form.append('title', title);
    form.append('script', script);
    if (video) form.append('video', video);
    if (subs) form.append('subtitles', subs);
    // Büyük video dosyaları için yükleme ilerlemesi: XMLHttpRequest.
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/projects');
    for (const [k, v] of Object.entries(YTE_HEADER)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(ev.loaded / ev.total);
    xhr.onload = () => {
      setBusy(false);
      if (xhr.status >= 300) return setErr(JSON.parse(xhr.responseText || '{}').error ?? `Hata ${xhr.status}`);
      navigate(`/p/${JSON.parse(xhr.responseText).id}`);
    };
    xhr.onerror = () => {
      setBusy(false);
      setErr('Yükleme başarısız');
    };
    xhr.send(form);
  };

  const pick = (set: (f: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.files?.[0] ?? null);

  return (
    <div className="narrow">
      <h1>Yeni proje</h1>
      <form className="card form" onSubmit={submit}>
        <label>
          Video adı (boş bırakılırsa script başlığı kullanılır)
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="80'ler Akımı" />
        </label>
        <label>
          Kurgu videosu (Descript'ten dışa aktarılan MP4) ya da teknik eğitimde seslendirme (WAV / M4A)
          <input type="file" accept="video/*,audio/*,.mp4,.mov,.m4a,.wav" onChange={pick(setVideo)} />
          <div className={`drop ${video ? 'has' : ''}`}>{video ? `${video.name} · ${(video.size / 1e6).toFixed(0)} MB` : 'Video seçilmedi; sonra da ekleyebilirsin'}</div>
        </label>
        <label>
          Descript altyazısı: Export → Subtitles → SRT (ya da VTT). Görsellerin saniyesi buradan hesaplanır; video varsa zorunlu.
          <input type="file" accept=".srt,.vtt,text/plain" onChange={pick(setSubs)} />
          <div className={`drop ${subs ? 'has' : ''}`}>{subs ? subs.name : 'Altyazı seçilmedi'}</div>
        </label>
        <label>
          📍 işaretli script (script.md ya da script.final.md)
          <input type="file" accept=".md,text/markdown,text/plain" onChange={pick(setScript)} />
          <div className={`drop ${script ? 'has' : ''}`}>{script ? script.name : 'Skill\'in ürettiği .md dosyası'}</div>
        </label>
        {err ? <div className="err">{err}</div> : null}
        {busy ? (
          <div>
            <div className="bar">
              <div style={{width: `${Math.round(progress * 100)}%`}} />
            </div>
            <span className="muted">{progress < 1 ? `Yükleniyor %${Math.round(progress * 100)}` : 'Proje oluşturuluyor…'}</span>
          </div>
        ) : null}
        <div className="row">
          <button className="primary" type="submit" disabled={busy || !script}>
            Projeyi oluştur ve işlemeye başla
          </button>
          <button type="button" onClick={() => navigate('/')} disabled={busy}>
            Vazgeç
          </button>
        </div>
        <p className="muted" style={{margin: 0, fontSize: 12.5}}>
          Yüklemeden sonra pipeline otomatik başlar: script kontrolü → zamanlama → görseller → hizalama. Arşiv fotoğrafı aranan işaretler varsa seçim için duracak.
        </p>
      </form>
    </div>
  );
};
