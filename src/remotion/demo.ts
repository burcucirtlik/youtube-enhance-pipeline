// Galeri kompozisyonu için örnek sahneler (dosya gerektirmeyen türler).

import type {Scene, SceneProps} from '../shared/types';

const mk = (props: SceneProps, danger = false): Scene => ({
  id: `demo-${props.type}-${danger ? 'd' : 'n'}`,
  markerId: '',
  line: 0,
  kind: 'ANİM',
  suggested: false,
  danger,
  startSec: 0,
  endSec: 4,
  anchorText: '',
  props,
});

export const DEMO_SCENES: Scene[] = [
  mk({type: 'flow', steps: ['Ajan görevi alıyor', 'Sandbox açığını buluyor', 'Duvara şifreleri yazıyor', 'Diğerleri kopyalıyor']}),
  mk({type: 'compare', left: {label: 'Sohbet botu', text: 'Yol tarifi verir, direksiyona dokunmaz.'}, right: {label: 'Ajan', text: 'Direksiyona geçer, gaza basar, kararı kendisi verir.'}}),
  mk({type: 'table', headers: ['Model', 'Erişim', 'Risk'], rows: [['Sohbet botu', 'Metin', 'Düşük'], ['Tarayıcı ajanı', 'Web + form', 'Orta'], ['Masaüstü ajanı', 'Dosyalar + e-posta', 'Yüksek']]}),
  mk({type: 'timeline', points: [{label: '1966', text: 'ELIZA'}, {label: '2015', text: 'hitchBOT'}, {label: '2022', text: 'Replika krizi'}, {label: 'bugün', text: 'Ajanlar'}]}),
  mk({type: 'stat', value: '13 milyar $', caption: 'iki yılda'}),
  mk({type: 'stat', value: '700 ajan', caption: 'tek puan bile kazanamadı'}, true),
  mk({type: 'quote', text: 'Yapay zekâya karşı asla iddiaya girmem.', author: 'Leopold Aschenbrenner'}),
  mk({type: 'concept', term: 'Görünmez kartel', definition: 'Kimse anlaşma yapmadan fiyatların aynı yöne kayması.'}),
  mk({type: 'terminal', commands: ['npm install -g @anthropic-ai/claude-code', 'claude']}),
  mk({type: 'code', file: 'index.js', highlight: [4], code: "import express from 'express';\n\nconst app = express();\napp.get('/', (req, res) => res.send('Merhaba'));\n\napp.listen(3000);"}),
  mk({type: 'post', platform: 'X', handle: '@ornekhesap', text: 'Bu bir örnek gönderi metnidir; gerçek gönderiler script içindeki POST işaretinden gelir.'}),
];
