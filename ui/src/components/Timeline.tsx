import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {Scene} from '../../../src/shared/types';
import {fmt, TYPE_LABEL} from '../api';

/**
 * Editör zaman çizelgesi.
 * - Sahneler türe göre şeritlerde (Fotoğraf, Haber · Belge, Ekran kaydı, Animasyon); solda şerit adları.
 * - Üstte bütün videonun mini haritası: görünen aralık bir çerçeve; tıkla/sürükle ile gezin.
 * - Yakınlaştırma piksel/saniye cinsinden; oynatma kafası (ya da fare) yerinde kalacak şekilde.
 *   −/+/Sığdır düğmeleri, kaydırıcı, ⌘/Ctrl + tekerlek ve trackpad pinch.
 * - Genişlik kaydırma alanının kendisinden ölçülür; içerik genişliği ölçümü etkilemez (eski sürümde
 *   bu döngü yakınlaştırmayı 33 milyon piksele şişiriyordu).
 */

const LANE_H = 30;
const RULER_H = 24;
const LABEL_W = 116;
const MAX_PX = 240; // ≈ 8 px/kare
const DEFAULT_WINDOW_SEC = 90; // açılışta görünen aralık
const SNAP_PX = 8;
const MIN_LEN = 0.3;

type TrackId = 'foto' | 'haber' | 'ekran' | 'anim';
const TRACKS: {id: TrackId; label: string; types: string[]}[] = [
  {id: 'foto', label: 'Fotoğraf', types: ['photo']},
  {id: 'haber', label: 'Haber · Belge', types: ['news', 'document', 'post']},
  {id: 'ekran', label: 'Ekran kaydı', types: ['screen']},
  {id: 'anim', label: 'Animasyon', types: ['flow', 'compare', 'table', 'timeline', 'stat', 'quote', 'concept', 'terminal', 'code']},
];
const trackOf = (s: Scene): TrackId => TRACKS.find((t) => t.types.includes(s.props.type))?.id ?? 'anim';

/** Blok üzerindeki kısa başlık: türün kendisinden en ayırt edici bilgi. */
const blockTitle = (s: Scene): string => {
  const p = s.props;
  switch (p.type) {
    case 'photo':
      return (p.caption ?? p.file).split(/ · |,/)[0];
    case 'news':
      try {
        return new URL(p.url).hostname.replace(/^www\./, '');
      } catch {
        return 'Haber';
      }
    case 'document':
      return `${p.file} s.${p.page}`;
    case 'stat':
      return p.value;
    case 'concept':
      return p.term;
    case 'flow':
      return `Akış · ${p.steps[0] ?? ''}`;
    case 'screen':
      return p.file;
    default:
      return TYPE_LABEL[p.type] ?? p.type;
  }
};

/** Aynı şeritte çakışan sahneler alt satırlara dizilir. */
const assignLanes = (scenes: Scene[]): Map<string, number> => {
  const ends: number[] = [];
  const out = new Map<string, number>();
  for (const sc of [...scenes].sort((a, b) => a.startSec - b.startSec)) {
    let lane = ends.findIndex((end) => end <= sc.startSec + 0.01);
    if (lane < 0) {
      lane = ends.length;
      ends.push(0);
    }
    ends[lane] = sc.endSec;
    out.set(sc.markerId, lane);
  }
  return out;
};

const TICK_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
const fmtTick = (t: number, step: number) => (step < 1 ? `${fmt(t)}.${Math.round((t % 1) * 10)}` : fmt(t));

type Drag = {id: string; mode: 'move' | 'l' | 'r'; startX: number; orig: Scene};

export const Timeline: React.FC<{
  scenes: Scene[];
  duration: number;
  timeSec: number;
  playing: boolean;
  selected: string | null;
  header?: React.ReactNode;
  onSelect: (id: string | null) => void;
  onSeek: (sec: number) => void;
  onChange: (scenes: Scene[], commit: boolean) => void;
}> = ({scenes, duration, timeSec, playing, selected, header, onSelect, onSeek, onChange}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [px, setPx] = useState<number | null>(null); // piksel / saniye
  const pending = useRef<{t: number; x: number} | null>(null);
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  // Güncel değerler: pencere düzeyindeki dinleyiciler bunlardan okur.
  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const timeRef = useRef(timeSec);
  timeRef.current = timeSec;

  const fitPx = viewW > 0 ? viewW / Math.max(1, duration) : 1;
  const pxPerSec = Math.min(MAX_PX, Math.max(fitPx, px ?? fitPx));
  const pxRef = useRef(pxPerSec);
  pxRef.current = pxPerSec;
  const inner = duration * pxPerSec;

  // Genişlik yalnızca kaydırma alanından ölçülür (flex: 1, min-width: 0), içerikten bağımsız.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // İlk açılış: ~90 sn'lik pencere, oynatma kafası görünür.
  useEffect(() => {
    if (px === null && viewW > 0) {
      const start = Math.min(MAX_PX, Math.max(viewW / Math.max(1, duration), viewW / DEFAULT_WINDOW_SEC));
      pending.current = {t: timeRef.current, x: viewW * 0.2};
      setPx(start);
    }
  }, [px, viewW, duration]);

  // Yakınlaştırmadan sonra çapa noktasını yerinde tut.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const a = pending.current;
    if (!el || !a) return;
    pending.current = null;
    el.scrollLeft = Math.max(0, a.t * pxPerSec - a.x);
    setScrollLeft(el.scrollLeft);
  }, [pxPerSec]);

  /** Yakınlaştır: çapa = fare konumu; yoksa görünüyorsa oynatma kafası, değilse görünümün ortası. */
  const zoomTo = useCallback(
    (next: number, clientX?: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const cur = pxRef.current;
      const rect = el.getBoundingClientRect();
      const headX = timeRef.current * cur - el.scrollLeft;
      const x = clientX !== undefined ? clientX - rect.left : headX >= 0 && headX <= el.clientWidth ? headX : el.clientWidth / 2;
      pending.current = {t: (el.scrollLeft + x) / cur, x};
      setPx(Math.min(MAX_PX, Math.max(el.clientWidth / Math.max(1, duration), next)));
    },
    [duration],
  );

  // ⌘/Ctrl + tekerlek ve pinch: yakınlaştır. Dikey tekerlek: yatay kaydır.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomTo(pxRef.current * Math.exp(-e.deltaY * 0.01), e.clientX);
      } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, {passive: false});
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomTo]);

  // Klavye: + / − yakınlaştır, 0 sığdır (yazı alanlarında değil).
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey) return;
      if (e.key === '+' || e.key === '=') zoomTo(pxRef.current * 1.5);
      else if (e.key === '-' || e.key === '_') zoomTo(pxRef.current / 1.5);
      else if (e.key === '0') zoomTo(0);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [zoomTo]);

  // Oynatma kafası görünümden çıkarsa kaydır: oynarken sayfa sayfa, dururken ortala.
  // Yalnızca zaman değişince çalışır; duraklatılmışken elle gezinmeyi bozmaz.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || drag.current) return;
    const x = timeSec * pxRef.current;
    const left = el.scrollLeft;
    const w = el.clientWidth;
    if (playing) {
      if (x > left + w * 0.9 || x < left) el.scrollLeft = x - w * 0.1;
    } else if (x < left || x > left + w) el.scrollLeft = x - w / 2;
  }, [timeSec, playing]);

  const toSec = (clientX: number) => {
    const el = scrollRef.current!;
    const rect = el.getBoundingClientRect();
    return Math.min(duration, Math.max(0, (clientX - rect.left + el.scrollLeft) / pxRef.current));
  };

  // ── Blok sürükleme (yapışmalı) ──────────────────────────────────────────

  const snap = (t: number, exclude: string): number => {
    const tol = SNAP_PX / pxRef.current;
    let best = t;
    let bestD = tol;
    const edges = [timeRef.current, 0, duration];
    for (const s of scenesRef.current) {
      if (s.disabled || s.markerId === exclude) continue;
      edges.push(s.startSec, s.endSec);
    }
    for (const e of edges) {
      const d = Math.abs(e - t);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  };

  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dt = (e.clientX - d.startX) / pxRef.current;
    const o = d.orig;
    const len = o.endSec - o.startSec;
    let start = o.startSec;
    let end = o.endSec;
    if (d.mode === 'move') {
      start = Math.min(Math.max(0, o.startSec + dt), duration - len);
      // Başı ya da sonu, hangisi daha yakınsa, bir kenara yapıştır.
      const s1 = snap(start, d.id);
      const s2 = snap(start + len, d.id) - len;
      const d1 = s1 !== start ? Math.abs(s1 - start) : Infinity;
      const d2 = s2 !== start ? Math.abs(s2 - start) : Infinity;
      if (d1 < Infinity || d2 < Infinity) start = d1 <= d2 ? s1 : s2;
      start = Math.min(Math.max(0, start), duration - len);
      end = start + len;
    } else if (d.mode === 'l') start = Math.min(Math.max(0, snap(o.startSec + dt, d.id)), o.endSec - MIN_LEN);
    else end = Math.max(Math.min(duration, snap(o.endSec + dt, d.id)), o.startSec + MIN_LEN);
    onChangeRef.current(
      scenesRef.current.map((s) => (s.markerId === d.id ? {...s, startSec: Math.round(start * 100) / 100, endSec: Math.round(end * 100) / 100} : s)),
      false,
    );
  };

  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    if (!drag.current) return;
    drag.current = null;
    setDragging(null);
    onChangeRef.current(scenesRef.current, true);
  };

  const begin = (e: React.PointerEvent, sc: Scene, mode: Drag['mode']) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    drag.current = {id: sc.markerId, mode, startX: e.clientX, orig: sc};
    setDragging(sc.markerId);
    onSelect(sc.markerId);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // ── Cetvelde sürükleyerek tarama ────────────────────────────────────────

  const scrub = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    onSeek(toSec(e.clientX));
    const mv = (ev: PointerEvent) => onSeek(toSec(ev.clientX));
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  // ── Mini harita ─────────────────────────────────────────────────────────

  const mapRef = useRef<HTMLDivElement>(null);
  const mapNav = (e: React.PointerEvent) => {
    const map = mapRef.current;
    const el = scrollRef.current;
    if (!map || !el) return;
    const go = (clientX: number) => {
      const r = map.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * duration;
      el.scrollLeft = t * pxRef.current - el.clientWidth / 2;
    };
    go(e.clientX);
    const mv = (ev: PointerEvent) => go(ev.clientX);
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  // ── Çizim ───────────────────────────────────────────────────────────────

  const active = scenes.filter((s) => !s.disabled);
  const tracks = TRACKS.map((t) => {
    const items = active.filter((s) => trackOf(s) === t.id);
    const lanes = assignLanes(items);
    const count = Math.max(1, ...[...lanes.values()].map((l) => l + 1));
    return {...t, items, lanes, count};
  }).filter((t) => t.items.length);

  const step = TICK_STEPS.find((s) => s * pxPerSec >= 80) ?? 600;
  const visFrom = Math.max(0, scrollLeft / pxPerSec - step);
  const visTo = Math.min(duration, (scrollLeft + viewW) / pxPerSec + step);
  const ticks: number[] = [];
  for (let t = Math.floor(visFrom / step) * step; t <= visTo; t += step) ticks.push(Math.round(t * 100) / 100);

  // Kaydırıcı logaritmik: 0 = sığdır, 1 = en yakın.
  const span = Math.log(MAX_PX / Math.max(fitPx, 0.0001));
  const sliderVal = span > 0 ? Math.log(pxPerSec / fitPx) / span : 0;
  const windowSec = viewW / pxPerSec;

  return (
    <div className="timeline">
      <div className="tl-toolbar">
        {header}
        <span style={{flex: 1}} />
        <span className="muted" title="Görünen aralık">
          {windowSec >= duration - 0.5 ? 'tümü' : windowSec >= 60 ? `${(windowSec / 60).toFixed(1)} dk` : `${windowSec.toFixed(windowSec < 10 ? 1 : 0)} sn`}
        </span>
        <button className="small" title="Uzaklaştır (−)" onClick={() => zoomTo(pxPerSec / 1.5)}>
          −
        </button>
        <input type="range" min={0} max={1} step={0.001} value={sliderVal} onChange={(e) => zoomTo(fitPx * Math.exp(Number(e.target.value) * span))} title="Yakınlaştırma (⌘ + tekerlek ya da iki parmakla)" />
        <button className="small" title="Yakınlaştır (+)" onClick={() => zoomTo(pxPerSec * 1.5)}>
          +
        </button>
        <button className="small" title="Bütün videoyu sığdır (0)" onClick={() => zoomTo(0)}>
          Sığdır
        </button>
      </div>

      <div className="tl-map" ref={mapRef} onPointerDown={mapNav} title="Bütün video: tıkla ya da sürükle">
        {active.map((s) => (
          <div
            key={s.markerId}
            className={`m ${trackOf(s)}`}
            style={{left: `${(s.startSec / duration) * 100}%`, width: `${Math.max(0.12, ((s.endSec - s.startSec) / duration) * 100)}%`, top: TRACKS.findIndex((t) => t.id === trackOf(s)) * 6 + 3}}
          />
        ))}
        <div className="view" style={{left: `${(scrollLeft / Math.max(1, inner)) * 100}%`, width: `${Math.min(100, (viewW / Math.max(1, inner)) * 100)}%`}} />
        <div className="head" style={{left: `${(timeSec / duration) * 100}%`}} />
      </div>

      <div className="tl-body">
        <div className="tl-labels">
          <div style={{height: RULER_H}} />
          {tracks.map((t) => (
            <div key={t.id} className={`tl-label ${t.id}`} style={{height: t.count * LANE_H}}>
              {t.label}
              <span className="muted"> {t.items.length}</span>
            </div>
          ))}
        </div>
        <div className="tl-scroll" ref={scrollRef} onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}>
          <div className="tl-inner" style={{width: inner}}>
            <div className="ruler" style={{height: RULER_H}} onPointerDown={scrub}>
              {ticks.map((t) => (
                <div key={t} className="tick" style={{left: t * pxPerSec}}>
                  {fmtTick(t, step)}
                </div>
              ))}
            </div>
            {tracks.map((t) => (
              <div
                key={t.id}
                className={`track ${t.id}`}
                style={{height: t.count * LANE_H}}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) {
                    onSelect(null);
                    onSeek(toSec(e.clientX));
                  }
                }}
              >
                {t.items.map((s) => {
                  const w = (s.endSec - s.startSec) * pxPerSec;
                  const sel = selected === s.markerId;
                  return (
                    <div
                      key={s.markerId}
                      className={`block ${t.id} ${s.danger ? 'danger' : ''} ${s.suggested ? 'suggested' : ''} ${s.missingAsset ? 'missing' : ''} ${sel ? 'sel' : ''} ${dragging === s.markerId ? 'dragging' : ''}`}
                      style={{left: s.startSec * pxPerSec, width: Math.max(4, w), top: (t.lanes.get(s.markerId) ?? 0) * LANE_H + 3, height: LANE_H - 6}}
                      title={`${TYPE_LABEL[s.props.type] ?? s.props.type} · satır ${s.line} · ${fmt(s.startSec)}–${fmt(s.endSec)} (${(s.endSec - s.startSec).toFixed(1)} sn)${s.missingAsset ? `\nEKSİK: ${s.missingAsset}` : ''}\n“${s.anchorText}”`}
                      onPointerDown={(e) => begin(e, s, 'move')}
                      onDoubleClick={() => onSeek(s.startSec)}
                    >
                      {w >= 14 ? <span className="h l" onPointerDown={(e) => begin(e, s, 'l')} /> : null}
                      {w >= 36 ? <span className="txt">{blockTitle(s)}</span> : null}
                      {w >= 14 ? <span className="h r" onPointerDown={(e) => begin(e, s, 'r')} /> : null}
                      {w >= 44 ? (
                        <span
                          className="x"
                          title="Sahneyi sil (Delete)"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onChange(scenes.map((x) => (x.markerId === s.markerId ? {...x, disabled: true} : x)), true);
                          }}
                        >
                          ×
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="playhead" style={{left: timeSec * pxPerSec}} />
          </div>
        </div>
      </div>
    </div>
  );
};
