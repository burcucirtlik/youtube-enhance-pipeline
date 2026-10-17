import React, {useState} from 'react';
import type {PhotoStatus} from '../../../src/pipeline/run';

/**
 * Arşiv fotoğrafı seçimi. Her işaret için adaylar; birden fazla seçilirse aynı cümlenin süresi
 * aralarında bölünür ve fotoğraflar sırayla gösterilir.
 */
export const Photos: React.FC<{projectId: string; photos: PhotoStatus[]; onSave: (selections: Record<string, number[]>) => Promise<void>}> = ({projectId, photos, onSave}) => {
  const searchable = photos.filter((p) => p.query);
  const initial = Object.fromEntries(searchable.map((p) => [p.file, p.picks]));
  const [sel, setSel] = useState<Record<string, number[]>>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (file: string, n: number) =>
    setSel((s) => {
      const cur = s[file] ?? [];
      return {...s, [file]: cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort((a, b) => a - b)};
    });

  const pending = searchable.filter((p) => p.candidates.length && !(sel[p.file]?.length)).length;
  const changed = searchable.filter((p) => JSON.stringify(sel[p.file] ?? []) !== JSON.stringify(p.picks));

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onSave(Object.fromEntries(changed.filter((p) => sel[p.file]?.length).map((p) => [p.file, sel[p.file]])));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!searchable.length) return <p className="muted">Bu script'te Commons'ta aranan fotoğraf işareti yok.</p>;

  return (
    <div>
      <p className="muted">
        Her işaret için bir ya da birden fazla fotoğraf seç; birden fazla seçersen cümle süresi aralarında bölünür. Seçilmeyen işaretlerde önizleme 1. adayı kullanır. Yazar ve lisans atfı altyazıya otomatik yazılır.
      </p>
      {searchable.map((p) => (
        <section key={p.file} className="photo-set">
          <h3>
            {p.caption ?? p.file} <span className="muted mono">· {p.file} · satır {p.line}</span>
          </h3>
          <div className="muted" style={{fontSize: 12, marginBottom: 8}}>
            ara: "{p.query}" {p.state === 'aday-yok' ? <span className="warn">· aday bulunamadı; sorguyu script'te değiştir ya da dosyayı elle assets/ içine koy</span> : null}
          </div>
          <div className="candidates">
            {p.candidates.map((c, i) => {
              const n = i + 1;
              const on = sel[p.file]?.includes(n);
              return (
                <div key={c.title} className={`cand ${on ? 'on' : ''}`} onClick={() => toggle(p.file, n)} title={c.description ?? c.title}>
                  <div className="num">{on ? (sel[p.file].indexOf(n) + 1) : n}</div>
                  {c.local ? <img src={`/files/${projectId}/${c.local}`} alt="" loading="lazy" /> : null}
                  <div className="meta">
                    <b>{c.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '')}</b>
                    <span>
                      {c.artist} · {c.license} · {c.width}×{c.height}
                      {c.date ? ` · ${c.date}` : ''}
                    </span>
                    <a href={c.page} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                      Commons sayfası ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <div className="sticky-actions">
        <button className="primary" onClick={save} disabled={busy || !changed.length}>
          {busy ? 'Kaydediliyor…' : changed.length ? `Seçimi kaydet (${changed.length} işaret) ve devam et` : 'Değişiklik yok'}
        </button>
        <span className="muted">{pending ? `${pending} işaret seçim bekliyor` : 'Bütün işaretler seçildi'}</span>
        {err ? <span className="err">{err}</span> : null}
      </div>
    </div>
  );
};
