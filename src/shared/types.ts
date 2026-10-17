// Pipeline ile Remotion arasında paylaşılan veri şekilleri.
// scenes.json bu tiplere göre yazılır ve okunur.

export type VideoFormat = 'talking-head' | 'tutorial';

// İşaret türleri tek kaynaktan: marker-schema.ts (skill sözlüğü de oradan üretilir).
import type {AnimType, MarkerKind} from './marker-schema';
import type {SystemActor, SystemEvent} from './system-diagram';
export type {AnimType, MarkerKind};

export type LabeledText = {label?: string; text: string};

export type SceneProps =
  | {type: 'flow'; steps: string[]}
  | {type: 'compare'; left: LabeledText; right: LabeledText}
  | {type: 'table'; headers: string[]; rows: string[][]}
  | {type: 'timeline'; points: LabeledText[]}
  | {type: 'stat'; value: string; caption?: string}
  | {type: 'quote'; text: string; author?: string}
  | {type: 'terminal'; commands: string[]}
  | {type: 'code'; file: string; highlight: number[]; code?: string; language?: string}
  | {type: 'concept'; term: string; definition?: string}
  | {type: 'screen'; file: string; note?: string; mediaDurationSec?: number}
  | {type: 'news'; url: string; highlight: string | null; image?: string; rects?: HighlightRect[]; imageSize?: Size}
  | {type: 'document'; file: string; page: number; highlight: string | null; image?: string; rects?: HighlightRect[]; imageSize?: Size}
  | {type: 'photo'; file: string; caption?: string; search?: string; provisional?: boolean}
  | {type: 'post'; platform: string; handle: string; text: string}
  | {type: 'map'; place: string; caption?: string; lat?: number; lon?: number}
  | {type: 'system'; actors: SystemActor[]; events: SystemEvent[]}
  | {type: 'chart'; points: {label: string; value: number; display: string}[]; unit?: string; style: 'bar' | 'line'}
  | {type: 'list'; items: ListItem[]}
  | {type: 'chat'; assistant: string; turns: string[]}
  | {type: 'clip'; file: string; caption?: string; search?: string; provisional?: boolean; mediaDurationSec?: number}
  // Kameranın üstünde (yüz görünür kalır):
  | {type: 'lower'; name: string; title?: string}
  | {type: 'emphasis'; text: string}
  | {type: 'zoom'}
  | {type: 'source'; name: string; date?: string};

/** Liste maddesi; at: söylendiği kelime, offsetSec: hizalama doldurur (sahne başından itibaren). */
export type ListItem = {text: string; at?: string; offsetSec?: number};

/** Tam ekran görsellerin yerleşimi: tam ekran (varsayılan) ya da yan yana (yüz solda, görsel sağda). */
export type Layout = 'tam' | 'yan';

export type Size = {width: number; height: number};
export type HighlightRect = {x: number; y: number; width: number; height: number};

export type Marker = {
  id: string; // m001, m002, ...
  kind: MarkerKind;
  anim?: AnimType;
  suggested: boolean; // 📍 [ANİM?: ...]
  danger: boolean; // ton: tehlike
  layout?: Layout; // yerleşim: yan
  at?: string; // @ "kelime": görsel bu kelimenin söylendiği anda girer
  raw: string; // satırın kendisi
  line: number; // script içindeki satır numarası (1'den başlar)
  props: SceneProps;
  sentenceIndex: number; // desteklediği cümle; -1 = bağlanamadı
  section: string | null;
};

export type Sentence = {
  index: number;
  text: string;
  section: string | null;
  line: number;
  wordStart: number; // spoken word dizisindeki ilk kelime
  wordEnd: number; // hariç
};

export type ScriptHeader = {
  title: string;
  fields: Record<string, string>;
  format: VideoFormat;
  stage: 'çekim' | 'kurgu-sonrası';
};

export type Scene = {
  id: string;
  markerId: string;
  line: number;
  kind: MarkerKind;
  suggested: boolean;
  danger: boolean;
  layout?: Layout;
  startSec: number;
  endSec: number;
  anchorText: string;
  props: SceneProps;
  missingAsset?: string; // varsa sahne yer tutucu olarak çizilir
  disabled?: boolean; // editörde silindi; render'a girmez
  edited?: boolean; // zamanı editörde değiştirildi
};

export type Chapter = {title: string; startSec: number};

export type ScenesFile = {
  version: 1;
  generatedAt: string;
  title: string;
  format: VideoFormat;
  scriptFile: string;
  base: {
    kind: 'video' | 'audio';
    src: string; // video klasörüne göre göreli yol (public-dir = video klasörü)
    durationSec: number;
    width: number;
    height: number;
    fps: number;
  };
  chapters: Chapter[];
  scenes: Scene[];
  dropped: {markerId: string; line: number; raw: string; reason: string}[];
  warnings: string[];
  aligned?: Scene[]; // düzenlemeler uygulanmadan önceki ham hizalama (editör farkı bundan hesaplar)
};
