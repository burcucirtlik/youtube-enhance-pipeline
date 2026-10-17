import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {renderFeedback, sceneOutcomes} from '../src/pipeline/feedback';
import type {Scene} from '../src/shared/types';

const sc = (id: string, startSec: number, extra: Partial<Scene> = {}): Scene => ({
  id,
  markerId: id,
  line: 1,
  kind: 'ANİM',
  suggested: true,
  danger: false,
  startSec,
  endSec: startSec + 3,
  anchorText: '',
  props: {type: 'stat', value: '1'},
  ...extra,
});

describe('editör istatistikleri', () => {
  it('her sahnenin sonucunu ayırır: tutuldu, kaydırıldı, taşındı, süresi değişti, silindi', () => {
    const aligned = [sc('a', 10), sc('b', 20), sc('c', 30), sc('d', 40), sc('e', 50)];
    const r = sceneOutcomes('p', aligned, {b: {startSec: 21.5, endSec: 24.5}, c: {startSec: 5, endSec: 8}, d: {startSec: 40, endSec: 45}, e: {disabled: true}});
    assert.deepEqual(
      r.map((x) => x.outcome),
      ['tutuldu', 'kaydırıldı', 'taşındı', 'süresi değişti', 'silindi'],
    );
  });

  it('yeterli örnekte çok silinen öneri türü için kural yazar, taşımalar kaydırma ortancasına girmez', () => {
    const aligned = Array.from({length: 6}, (_, i) => sc(`s${i}`, i * 20));
    const edits = {s0: {disabled: true}, s1: {disabled: true}, s2: {disabled: true}, s3: {startSec: 200, endSec: 203}};
    const text = renderFeedback({projects: ['p'], rows: sceneOutcomes('p', aligned, edits)});
    assert.match(text, /`ANİM stat` önerileri \(\?\): silinme oranı %50 \(6 işaret\)/);
    assert.doesNotMatch(text, /kaydırılanlar ortanca/);
  });
});
