import React from 'react';
import type {RunEvent, StageName} from '../../../src/pipeline/run';

export type StageState = {status: 'bekliyor' | 'çalışıyor' | 'tamam' | 'atlandı' | 'hata'; detail?: string; ratio?: number; text?: string};

/** Olay akışından aşama durumlarını türetir. */
export const reduceStages = (events: RunEvent[], names: StageName[]): Record<StageName, StageState> => {
  const st = Object.fromEntries(names.map((n) => [n, {status: 'bekliyor'} as StageState])) as Record<StageName, StageState>;
  for (const e of events) {
    if (e.type === 'stage') {
      const map = {start: 'çalışıyor', done: 'tamam', skip: 'atlandı', error: 'hata'} as const;
      st[e.stage] = {...st[e.stage], status: map[e.status], detail: e.detail ?? st[e.stage].detail};
    } else if (e.type === 'progress') st[e.stage] = {...st[e.stage], ratio: e.ratio, text: e.text};
  }
  return st;
};

const ICON: Record<StageState['status'], string> = {bekliyor: '○', çalışıyor: '◐', tamam: '●', atlandı: '◌', hata: '✕'};

export const Stages: React.FC<{stages: {name: StageName; label: string}[]; events: RunEvent[]; running: boolean; error?: string | null}> = ({stages, events, running, error}) => {
  const st = reduceStages(events, stages.map((s) => s.name));
  const logs = events.filter((e): e is Extract<RunEvent, {type: 'log'}> => e.type === 'log').slice(-200);
  const logRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    logRef.current?.scrollTo({top: logRef.current.scrollHeight});
  }, [logs.length]);
  return (
    <div className="stages">
      <div>
        {stages.map((s) => {
          const x = st[s.name];
          return (
            <div key={s.name} className={`stage ${x.status === 'çalışıyor' ? 'active' : ''} ${x.status === 'tamam' || x.status === 'atlandı' ? 'done' : ''} ${x.status === 'hata' ? 'error' : ''}`}>
              <span className="ico">{ICON[x.status]}</span>
              <div style={{flex: 1}}>
                <div>{s.label}</div>
                {x.status === 'çalışıyor' && x.ratio !== undefined ? (
                  <>
                    <div className="bar">
                      <div style={{width: `${Math.round(x.ratio * 100)}%`}} />
                    </div>
                    <div className="detail">{x.text}</div>
                  </>
                ) : x.detail ? (
                  <div className="detail">{x.detail}</div>
                ) : null}
              </div>
            </div>
          );
        })}
        {error ? <div className="err" style={{padding: 10}}>{error}</div> : null}
        {!running && !error && events.length ? <div className="ok" style={{padding: 10}}>Tamamlandı.</div> : null}
      </div>
      <div className="log mono" ref={logRef}>
        {logs.length ? logs.map((l, i) => <div key={i}>{l.text}</div>) : <span className="muted">{running ? 'Çalışıyor…' : 'Günlük boş'}</span>}
      </div>
    </div>
  );
};
