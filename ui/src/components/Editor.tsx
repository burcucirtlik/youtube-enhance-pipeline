import {Player, type PlayerRef} from '@remotion/player';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Main} from '../../../src/remotion/Main';
import type {Scene, ScenesFile} from '../../../src/shared/types';
import {api, fmt, fmtMs, TYPE_LABEL} from '../api';
import {Timeline} from './Timeline';

/**
 * Son karar editörü: önizleme + altında sürüklenip kısaltılabilen ve silinebilen sahne blokları.
 * Düzenlemeler sunucuda build/edits.json'a yazılır; render o hali kullanır.
 *
 * Önizlemede kurgu videosunu düz bir <video> etiketi oynatır; Remotion Player yalnızca görselleri
 * (overlayOnly) üstüne çizer ve her karede videonun zamanına çekilir. Remotion'un kendi oynatıcısı
 * kullanılmaz, çünkü ağır sahnelerde saati gerçek zamandan geri kalıyor ve videoyu her birkaç saniyede
 * 0,5 sn geri sararak sesi tekrarlatıyordu. Render'da bu katman yok; orada OffthreadVideo kare kare çizer.
 */
export const Editor: React.FC<{projectId: string; scenes: ScenesFile; onScenes: (s: ScenesFile) => void; onRender: (opts: {frames?: string}) => void; rendering: boolean}> = ({projectId, scenes, onScenes, onRender, rendering}) => {
  const [local, setLocal] = useState<Scene[]>(scenes.scenes);
  const [selected, setSelected] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [saveState, setSaveState] = useState<'kaydedildi' | 'değişti' | 'kaydediliyor' | string>('kaydedildi');
  const player = useRef<PlayerRef>(null);
  const media = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => setLocal(scenes.scenes), [scenes]);

  const fps = Math.round(scenes.base.fps) || 30;
  const duration = scenes.base.durationSec;
  const durationInFrames = Math.max(1, Math.ceil(duration * fps));

  // Video ana saat: Player her karede videonun zamanına çekilir (görseller videoyu izler, tersi değil).
  useEffect(() => {
    let raf = 0;
    let last = -1;
    const tick = () => {
      const m = media.current;
      if (m) {
        const f = Math.min(durationInFrames - 1, Math.max(0, Math.floor(m.currentTime * fps)));
        if (f !== last) {
          last = f;
          player.current?.seekTo(f);
          setFrame(f);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fps, durationInFrames]);

  useEffect(() => {
    const m = media.current;
    if (!m) return;
    const on = () => setPlaying(!m.paused);
    m.addEventListener('play', on);
    m.addEventListener('pause', on);
    m.addEventListener('ended', on);
    return () => {
      m.removeEventListener('play', on);
      m.removeEventListener('pause', on);
      m.removeEventListener('ended', on);
    };
  }, []);

  const seek = useCallback(
    (sec: number) => {
      const m = media.current;
      if (m) m.currentTime = Math.max(0, Math.min(duration, sec));
      setFrame(Math.round(sec * fps));
    },
    [fps, duration],
  );
  const toggle = () => {
    const m = media.current;
    if (!m) return;
    if (m.paused) m.play().catch(() => {});
    else m.pause();
  };

  const persist = useCallback(
    (list: Scene[]) => {
      setSaveState('kaydediliyor');
      api
        .saveScenes(projectId, list.map((s) => ({markerId: s.markerId, startSec: s.startSec, endSec: s.endSec, disabled: s.disabled})))
        .then((r) => {
          setSaveState('kaydedildi');
          onScenes(r.scenes);
        })
        .catch((e) => setSaveState(`hata: ${e.message}`));
    },
    [projectId, onScenes],
  );

  const change = (list: Scene[], commit: boolean) => {
    setLocal(list);
    setSaveState('değişti');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    if (commit) saveTimer.current = window.setTimeout(() => persist(list), 600);
  };

  // Delete / Backspace seçili sahneyi siler.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        change(local.map((s) => (s.markerId === selected ? {...s, disabled: true} : s)), true);
      }
      if (e.key === ' ' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (e.target instanceof HTMLInputElement) return;
        e.preventDefault();
        seek((media.current?.currentTime ?? 0) + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 5 : 1 / fps));
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const restore = (id: string) => change(local.map((s) => (s.markerId === id ? {...s, disabled: false} : s)), true);
  const resetAll = async () => {
    if (!confirm('Bütün kaydırma ve silmeler geri alınsın mı?')) return;
    const r = await api.resetEdits(projectId);
    onScenes(r.scenes);
  };

  const data = useMemo(() => ({...scenes, scenes: local}), [scenes, local]);
  const removed = local.filter((s) => s.disabled);
  const timeSec = frame / fps;
  const current = local.find((s) => !s.disabled && timeSec >= s.startSec && timeSec < s.endSec);

  return (
    <div className="editor">
      <div className="player">
        <div className="stage" style={{aspectRatio: `${scenes.base.width} / ${scenes.base.height}`}} onClick={toggle}>
          {scenes.base.kind === 'video' ? (
            <video ref={media} src={`/files/${projectId}/${scenes.base.src}`} playsInline preload="auto" />
          ) : (
            <audio ref={media} src={`/files/${projectId}/${scenes.base.src}`} preload="auto" />
          )}
          <div className="overlay">
            <Player
              ref={player}
              component={Main}
              inputProps={{data, includeSuggested: true, overlayOnly: true, assetBase: `/files/${projectId}/`}}
              durationInFrames={durationInFrames}
              fps={fps}
              compositionWidth={scenes.base.width}
              compositionHeight={scenes.base.height}
              controls={false}
              style={{width: '100%', height: '100%'}}
              acknowledgeRemotionLicense
            />
          </div>
        </div>
        <div className="controls">
          <button className="small" onClick={toggle} title="Boşluk tuşu">
            {playing ? '❚❚' : '▶'}
          </button>
          <span className="mono">{fmtMs(timeSec)} / {fmt(duration)}</span>
          <input type="range" min={0} max={duration} step={0.05} value={timeSec} onChange={(e) => seek(Number(e.target.value))} style={{flex: 1}} />
          <span title="Ses">🔊</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (media.current) media.current.volume = v;
            }}
            style={{width: 90}}
          />
        </div>
      </div>
      <div className="timeline-wrap">
        <Timeline
          scenes={local}
          duration={duration}
          timeSec={timeSec}
          playing={playing}
          selected={selected}
          onSelect={setSelected}
          onSeek={seek}
          onChange={change}
          header={
            <>
              <span className="mono">{fmtMs(timeSec)}</span>
              <span className="muted">{current ? `${TYPE_LABEL[current.props.type] ?? current.props.type} · satır ${current.line}` : 'kamera'}</span>
              <span className={saveState.startsWith('hata') ? 'err' : 'muted'}>· {saveState}</span>
            </>
          }
        />
        <p className="muted" style={{fontSize: 12, margin: '6px 0 0'}}>
          Sürükle: kaydır · kenarlar: kısalt/uzat · × ya da Delete: sil · ⌘ + tekerlek ya da iki parmak: yakınlaştır · + / − / 0 · cetvelde sürükle: tara · kesikli çerçeve: önerilen (?) işaret
        </p>
      </div>
      <aside className="side">
        <div className="row">
          <button className="primary" onClick={() => onRender({})} disabled={rendering}>
            {rendering ? 'Render alınıyor…' : 'Videoyu oluştur'}
          </button>
          <button onClick={() => onRender({frames: `0-${fps * 60 - 1}`})} disabled={rendering} title="Hızlı kontrol için yalnızca ilk dakika">
            İlk 1 dk
          </button>
        </div>
        <div className="row">
          <button className="small" onClick={resetAll}>
            Düzenlemeleri sıfırla
          </button>
          <span className="muted" style={{fontSize: 12}}>
            {local.filter((s) => !s.disabled).length} sahne · {removed.length} silindi
          </span>
        </div>
        <h2>Sahneler</h2>
        <div className="scene-list">
          {local.map((s) => (
            <div
              key={s.markerId}
              ref={selected === s.markerId ? (el) => el?.scrollIntoView({block: 'nearest'}) : undefined}
              className={`scene-item ${selected === s.markerId ? 'sel' : ''} ${s.disabled ? 'off' : ''}`}
              onClick={() => {
                setSelected(s.markerId);
                seek(s.startSec);
              }}
            >
              <span className="t">{fmt(s.startSec)}</span>
              {TYPE_LABEL[s.props.type] ?? s.props.type}
              {s.suggested ? ' ?' : ''}
              {s.danger ? ' ⚠' : ''}
              {s.missingAsset ? <span className="warn"> · eksik</span> : null}
              <span className="muted"> · satır {s.line}</span>
              {s.disabled ? (
                <button
                  className="small"
                  style={{marginLeft: 8}}
                  onClick={(e) => {
                    e.stopPropagation();
                    restore(s.markerId);
                  }}
                >
                  geri al
                </button>
              ) : null}
              <span className="anchor">{s.anchorText}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};
