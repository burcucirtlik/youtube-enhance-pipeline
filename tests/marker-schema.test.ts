import assert from 'node:assert/strict';
import fs from 'node:fs';
import {describe, it} from 'node:test';
import {MARKER_LINE, parseMarker} from '../src/pipeline/markers';
import {MARKING_SKILL} from '../src/pipeline/util';
import {ANIM_MARKERS, REAL_MARKERS, SKILL_BLOCK_END, SKILL_BLOCK_START, skillDictionary, TYPE_LABEL} from '../src/shared/marker-schema';

const inner = (line: string) => line.match(MARKER_LINE)![1];

describe('işaret sözlüğü (tek kaynak)', () => {
  it("skill'deki her örnek parser'dan hatasız ve doğru türle geçer", () => {
    for (const m of ANIM_MARKERS) {
      const p = parseMarker(inner(m.example));
      assert.equal(p.kind, 'ANİM', m.example);
      assert.equal(p.props.type, m.type, m.example);
      assert.deepEqual(p.issues, [], m.example);
    }
    for (const m of REAL_MARKERS)
      for (const [ex] of m.examples) {
        const p = parseMarker(inner(ex));
        assert.equal(p.kind, m.kind, ex);
        assert.equal(p.props.type, m.type, ex);
      }
  });

  // Skill kişisel skill deposunda (~/.claude/skills); kurulu değilse bu denetim atlanır.
  it("gorsel-isaretleme skill'indeki sözlük bloğu şemadan üretilenle aynı (değilse: npm run skill:sync)", {skip: !fs.existsSync(MARKING_SKILL) && 'skill kurulu değil'}, () => {
    const skill = fs.readFileSync(MARKING_SKILL, 'utf8');
    const a = skill.indexOf(SKILL_BLOCK_START);
    const b = skill.indexOf(SKILL_BLOCK_END);
    assert.ok(a >= 0 && b > a, 'blok işaretleri var');
    assert.equal(skill.slice(a, b + SKILL_BLOCK_END.length), skillDictionary());
  });

  it('her türün arayüz etiketi var', () => {
    for (const m of [...ANIM_MARKERS, ...REAL_MARKERS]) assert.ok(TYPE_LABEL[m.type], m.type);
  });
});
