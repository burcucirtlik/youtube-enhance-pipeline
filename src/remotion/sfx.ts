// Ses efekti dosyaları (brand/sfx/, scripts/make-sfx.sh üretir). Webpack (render) ve Vite (önizleme) adres olarak çözer.
import blip from '../../brand/sfx/blip.wav';
import glitch from '../../brand/sfx/glitch.wav';
import pop from '../../brand/sfx/pop.wav';
import tick from '../../brand/sfx/tick.wav';
import whoosh from '../../brand/sfx/whoosh.wav';
import type {SfxName} from '../shared/timeline';

export const SFX: Record<SfxName, string> = {whoosh, tick, pop, glitch, blip};
