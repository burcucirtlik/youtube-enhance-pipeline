import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {overlayRanges, sceneSequences} from '../src/shared/timeline';
import type {Scene, ScenesFile} from '../src/shared/types';

const sc = (id: string, startSec: number, endSec: number, extra: Partial<Scene> = {}): Scene => ({
  id,
  markerId: id,
  line: 1,
  kind: 'ANİM',
  suggested: false,
  danger: false,
  startSec,
  endSec,
  anchorText: '',
  props: {type: 'stat', value: '1'},
  ...extra,
});
const data = (scenes: Scene[], fps = 29.997): ScenesFile => ({
  version: 1,
  generatedAt: '',
  title: '',
  format: 'talking-head',
  scriptFile: '',
  base: {kind: 'video', src: 'footage/kurgu.mp4', durationSec: 60, width: 1280, height: 720, fps},
  chapters: [],
  scenes,
  dropped: [],
  warnings: [],
});

describe('sahne kare aralıkları', () => {
  it('fps yuvarlanır; peş peşe sahnede öncekisi çapraz geçiş kadar uzar; silinen ve öneri (istenmezse) girmez', () => {
    const d = data([sc('a', 1, 3), sc('b', 3.1, 5), sc('c', 10, 12, {disabled: true}), sc('d', 20, 22, {suggested: true})]);
    const s = sceneSequences(d, {includeSuggested: false, crossfadeFrames: 12});
    assert.deepEqual(
      s.map((x) => [x.scene.id, x.from, x.durationInFrames, x.joinedPrev, x.joinedNext]),
      [
        ['a', 30, 60 + 14, false, true],
        ['b', 93, 57, true, false],
      ],
    );
  });

  it('görsel aralıkları 1 kare payla alınır, yakın olanlar birleşir, video sınırında kesilir', () => {
    const d = data([sc('a', 0, 2), sc('b', 2.5, 4), sc('c', 30, 32), sc('d', 59, 61)], 30);
    const r = overlayRanges(sceneSequences(d, {includeSuggested: true, crossfadeFrames: 12}), 1800, 60);
    assert.deepEqual(r, [
      [0, 120],
      [899, 960],
      [1769, 1799],
    ]);
  });
});
