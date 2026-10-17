# YouTube Enhance — Video Pipeline

Kurgusu biten videonun işaretli metnindeki (`script.final.md`) **📍 işaretlerini** kurgu kaydındaki doğru saniyeye hizalar, her işareti bileşen kütüphanesindeki bir sahneye çevirir ve Remotion ile videonun üstüne yerleştirir.

```
script.final.md + kurgu.srt ──► lint ──► zamanlama (SRT) ──► assets ──► align ──► scenes.json ──► Remotion studio / render
                                                  │
              haber ekran görüntüsü + fosforlu kalem, PDF sayfası + vurgu, arşiv fotoğrafı adayları, eksik listesi
```

Zena'nın tercihleri ve pipeline'da alınan kararlar [CLAUDE.md](CLAUDE.md) içindeki karar günlüğünde tutulur.

**Skill'ler** ayrı, gizli bir depoda: [my-skillset](https://github.com/burcucirtlik/my-skillset), bu Mac'te `~/.claude/skills`.
- `youtube-script-writer` çekimden önce script'i yazar (yalnızca konuşulacak metin + sonda "Görsel Fikirleri").
- `gorsel-isaretleme` kurgudan sonra Descript altyazısından (SRT) işaretli `script.final.md`'yi üretir; pipeline bunu okur.
Pipeline skill'leri `~/.claude/skills`'ten bulur (`YTE_SKILLS` ile değiştirilebilir): lint yazım skill'inin tükenmiş ifade listelerini okur; `npm run skill:sync` ve `npm run stats` işaretleme skill'ine yazar.

## Masaüstü uygulaması

Pipeline'ın tamamı bir masaüstü uygulamasından da yürütülür:

```bash
npm run app
```

Uygulama (Electron) yerel sunucuyu başlatır ve pencerede açar.

**Masaüstü ikonu:** `npm run launcher` masaüstüne çift tıklanabilir bir **YouTube Enhance.app** koyar (içinde bu projenin yolu yazar; klasörü taşırsan komutu yeniden çalıştır). Başlatıcı Terminal açmaz; çıktılar `~/Library/Logs/YouTubeEnhance.log` dosyasına yazılır. İkon `npm run icon` ile `electron/icon.png` ve `icon.icns` olarak yeniden üretilir.

Akış:

1. **Projeler:** `videos/` altındaki bütün videolar durumlarıyla listelenir.
2. **Yeni proje:** kurgu videosu (MP4), Descript altyazısı (SRT/VTT, isteğe bağlı) ve 📍 işaretli script (.md) yüklenir; pipeline otomatik başlar.
3. **İşlem:** script kontrolü → transkript → görseller → hizalama aşamaları canlı ilerlemeyle izlenir.
4. **Fotoğraflar:** Commons'tan gelen adaylar arasından her işaret için bir ya da birden fazla fotoğraf seçilir (birden fazla seçilirse cümle süresi aralarında bölünür). Atıf otomatik yazılır.
5. **Editör:** önizleme; alttaki zaman çizelgesinde sahneler türlerine göre şeritlerde durur, sürüklenir (kenarlara yapışır), kenarlarından kısaltılır, × ya da Delete ile silinir. Üstteki mini haritadan bütün videoda gezinilir; ⌘ + tekerlek, iki parmak, −/+/Sığdır ya da `+ − 0` tuşlarıyla yakınlaştırılır. Düzenlemeler `build/edits.json`'a yazılır ve hizalama yenilense de korunur.
6. **Videoyu oluştur:** render ilerlemesi izlenir, **İptal** ile durdurulabilir; sonuç sekmesinde video izlenir ve indirilir.

**Render:** Remotion'un Node API'siyle ayrı bir işçi süreçte çalışır. Remotion paketi kod (`src/remotion`, `brand/`) değişmedikçe bir kez üretilir ve `.cache/remotion/` altında kalır; proje klasörü pakete kopyalanmaz, bağlanır. Aynı anda tek render çalışır, diğerleri sırada bekler ("sırada: önünde 1 render var"). 10 sn'lik parça: eski CLI render 38 sn, şimdi 8 sn, çıktı bit bit aynı.

**Parça render'ı:** konuşan kafa videosunda görseller sürenin ~%25'ini kaplar. Tam videoda yalnızca görsel olan aralıklar Remotion'dan geçer, ffmpeg bunları kurgu kaydının üstüne kendi zamanlarında bindirir; görsel olmayan yerler ve ses kurgu kaydından gelir. Görseller videonun %60'ından fazlasını kaplıyorsa, katman (`--katman`) ya da kare aralığı (`--kareler`) istendiyse tam render yapılır; CLI'da `--tam` ile zorlanır. 2 dakikalık parça (%24 görsel): tam 62 sn → parça 39 sn; görsellerin olduğu karelerde tam render'la fark görünmez (ort. 46 dB), görsel olmayan yerlerde orijinal kayda tam render'dan daha sadık (50 dB / 38 dB: Remotion 29,997 fps'lik kaydı 30 fps'e yeniden örnekliyor).

**Kaynaklar:** render işçisi kendi süreç grubunda ve proje içindeki geçici bir klasörde (`build/.render-tmp-*`) çalışır. Render bitince, iptal edilince ya da uygulama kapanınca bütün alt süreçler (Remotion, Chrome, ffmpeg) sonlandırılır, geçici klasör silinir. Video önce geçici klasöre yazılır ve yalnızca render başarılı olursa yerine konur; iptal edilen ya da hata veren yeniden render önceki videoyu silmez. Uygulama çökerse sunucu bunu 2 sn içinde fark edip kendini kapatır.

**Yalnızca değişen yeniden çalışır:** her aşama girdilerinin özetini `build/state.json`'a yazar (script, altyazı, görseller, editör düzenlemeleri, kurgu kaydının imzası, ilgili kod). Hiçbiri değişmediyse aşama atlanır (◌ "değişmedi"); render de öyle: hiçbir şey değişmediyse aynı videoyu yeniden üretmez. İşlem sekmesi son çalıştırmadan beri hangi aşamanın girdisinin değiştiğini **değişti** etiketiyle gösterir; **Güncelle** yalnızca onları çalıştırır. Bir işin günlüğü `build/logs/` altına kaydedilir (en yeni 15); uygulama kapanıp açıldığında son işin aşamaları ve hatası görünür. Zorla yeniden yapmak için CLI'da `--force`.

**Disk:** kurgu kayıtları ortak bir medya deposunda (`.media/`, içerik özetiyle) bir kez tutulur; projelerdeki `footage/kurgu.mp4` ona sabit bağlantıdır (hardlink). Aynı video iki projeye yüklenirse diskte bir kez yer kaplar; uygulama açılışta var olan projeleri de tarar. Proje listesi her projenin boyutunu, başka projeyle ortak kısmını ve temizlenebilir kısmını gösterir. **Temizle** yeniden üretilebilir dosyaları siler (Commons aday fotoğrafları, görsel katmanı, yarım render); script, kurgu kaydı, seçilen fotoğraflar, düzenlemeler, haber/belge görüntüleri ve son video kalır. **Arşivle** projeyi listenin altına alır ve temizler. Proje silinince kaydını başka proje kullanmıyorsa depodan da silinir.

**Güvenlik:** sunucu yalnızca 127.0.0.1'i dinler ve yalnızca uygulamanın kendisinden gelen istekleri kabul eder: `Host` başlığı `localhost`/`127.0.0.1` olmalı (DNS rebinding'e karşı), tarayıcı isteklerinde `Origin` uygulamanın adresi olmalı, değiştiren isteklerde (POST/PUT/DELETE) `X-YTE: 1` başlığı zorunlu. Böylece tarayıcıda açık başka bir site projelere dokunamaz. Komut satırından API'yi denerken: `curl -X POST -H 'X-YTE: 1' …`.

Geliştirme: `npm run server` (API, :3030) ve `npm run ui:dev` (Vite, :5173). Tarayıcıda `http://localhost:5173`. Uygulama arayüzü `dist/ui` altına `npm run ui:build` ile derlenir; `npm run app` bunu kendisi yapar.

## Kurulum (bir kere)

```bash
npm run setup
```

Kurulanlar: projeye özel Node (`.runtime/node`, Apple Silicon'da arm64; render Rosetta'ya göre ~3 kat hızlı), npm paketleri (Remotion, Playwright), `.venv` içinde Python (yalnızca PyMuPDF, PDF vurgusu için), Chromium.

Terminalden `npm run …` komutlarını bu Node'la çalıştırmak için önce:

```bash
export PATH="$PWD/.runtime/node/bin:$PATH"
```

Masaüstü ikonu ve uygulama bunu kendisi yapar.

## Bir videonun akışı

1. **Klasör aç**

   ```bash
   npm run new -- 2026-10-kisa-baslik
   ```

   Teknik eğitim için sona `--egitim` ekle.

2. **Script'i koy.** `youtube-script-writer`'ın yazdığı `script.md`'yi `videos/2026-10-kisa-baslik/` içine kopyala (çekim script'i; işaret içermez).

3. **Malzemeyi topla.** Ekran kayıtlarını, fotoğrafları, PDF'leri ve kod dosyalarını script'teki adlarla `assets/` içine koy. Descript'ten dışa aktardığın kurguyu `footage/kurgu.mp4`, altyazısını (Export → Subtitles → SRT) `footage/kurgu.srt` olarak kaydet. **Altyazı zorunlu:** görsellerin saniyesi yalnızca buradan hesaplanır. Teknik eğitimde buraya seslendirme (`.wav` ya da `.m4a`) gelir.

4. **Kurgudan sonra işaretle:** Descript altyazısını (ve varsa `script.md`'yi) `gorsel-isaretleme` skill'ine ver; ürettiği `script.final.md`'yi aynı klasöre koy ve kontrol et:

   ```bash
   npm run lint -- 2026-10-kisa-baslik
   ```

   Lint işaret sözlüğünü ve skill'lerin kalite listesinin makineyle denetlenebilen kısmını kontrol eder: yazım, yoğunluk, art arda tam ekran, tehlike oranı, kaynak tablosu, yasaklı kalıplar, tükenmiş ifadeler, imzalar. İşaretler doğrudan söylenen metne konduğu için hizalama kelimesi kelimesine eşleşir. Pipeline `script.final.md` varsa onu kullanır.

5. **Çalıştır**

   ```bash
   npm run pipeline -- 2026-10-kisa-baslik
   ```

   Bu komut sırayla lint → zamanlama → assets → align adımlarını çalıştırır. Çıktılar:
   - `build/scenes.json`: zamanlanmış sahneler (pipeline'ın son hali; editör istatistikleri buradan çıkar)
   - `build/rapor.md`: lint sonuçları, varlık kontrol listesi, düşen işaretler, sahne listesi
   - `out/bolumler.txt`: YouTube bölüm işaretleri (`##` başlıklarının gerçek başlama anları)

6. **Önizle, sonra render al**

   ```bash
   npm run studio -- 2026-10-kisa-baslik
   ```

   ```bash
   npm run render -- 2026-10-kisa-baslik
   ```

   Render çıktısı `out/video.mp4` olur. Sadece görsel katmanı almak için (şeffaf ProRes 4444, Descript ya da Premiere'de üst kanala konur) `--katman` ekle; çıktı `out/gorsel-katmani.mov` olur.

## Arşiv fotoğrafları (Commons'tan otomatik)

Tarihten anlatılan her hikâyenin gerçek bir fotoğrafı olur (skill kuralı; lint, eski yıl geçen ama FOTO/BELGE'si olmayan bölümü uyarır). Skill bu fotoğraflar için arama sorgusu yazar:

```
📍 [FOTO: pearl-harbor-1941.jpg, "Pearl Harbor baskını, 7 Aralık 1941", ara: "USS Arizona burning Pearl Harbor 1941"]
```

`npm run assets` Wikimedia Commons'ta arar ve her işaret için 3 adayı `build/fotolar/` içine indirir. Lisansı belirsiz, çok küçük, aynı fotoğrafın kopyası olan ya da şiddet içeren (ceset, kafatası, toplu mezar vb.) kareler elenir. Adayları `build/fotolar/index.html` sayfasında görüp seç:

```bash
npm run foto -- 2026-10-kisa-baslik pearl-harbor-1941.jpg 2
```

Seçilen fotoğraf `assets/` içine kopyalanır. Yazar ve lisans `assets/kaynaklar.json`'a, altyazıya ("· Foto: yazar (lisans)") ve script'in Kaynaklar tablosuna otomatik yazılır. Seçim yapılana kadar önizlemede 1. aday geçici olarak kullanılır. `npm run foto -- <klasör>` hangi fotoğrafların seçim beklediğini listeler. Uygun aday çıkmazsa sorguyu değiştir ya da dosyayı elle `assets/` içine koy.

## Editör istatistikleri → skill

Editörde her kayıtta (ve `npm run stats` ile) bütün projelerin editör kararları toplanır: her işaret türü için tutulan, ≤ 10 sn kaydırılan, başka cümleye taşınan, süresi değişen ve silinen oranı; kesin ve önerilen (?) işaretlerin silinme oranı; yeterli örnek varsa (tür başına ≥ 5) çıkarımlar. Sonuç `.claude/skills/youtube-script-writer/editor-istatistikleri.md` dosyasına yazılır, skill işaret koymadan önce onu okur. Yalnızca editörde en az bir düzenleme yapılmış projeler sayılır.

## Önerilen (?) işaretler

`📍 [ANİM?: ...]` gibi soru işaretli işaretler studio önizlemesinde köşede "? öneri" rozetiyle görünür, final render'a ise **girmez**. Tutmak istediğin önerinin `?`'ini script'ten sil, ya da hepsini dahil etmek için render'a `--oneriler` ekle.

## Hizalama nasıl çalışır?

- **Zamanlama kaynağı:** Descript'ten **Export → Subtitles → SRT** (ya da VTT), `footage/kurgu.srt`. Her satırın süresi kelimelere harf sayısıyla orantılı dağıtılır; sonuç `build/transcript.json`. Altyazı yoksa pipeline durur ve yüklemeni ister (Whisper 2026-10-17'de kaldırıldı). Descript'in Markdown/metin transkripti dakikada bir zaman damgası içerdiği için zamanlama kaynağı olarak yetmez; Timeline dışa aktarımları (AAF, FCPXML, Premiere XML) ise kurguyu anlatır, kelime içermez.
- Script'teki konuşulan kelimeler transkriptle bulanık eşleştirilir (Needleman–Wunsch). Türkçe ekler, küçük söyleyiş farkları ve doğaçlamalar tolere edilir.
- Her işaret, **hemen üstündeki cümleye** bağlıdır. Sahne o cümlenin başladığı anda girer, cümle bitince çıkar (en az 2,5 sn, en fazla 9 sn). Ekran kayıtları kendi süreleri kadar kalır (en fazla 25 sn). Aynı cümlenin altında birden fazla işaret varsa cümlenin süresi aralarında bölünür.
- Kurguda kesilen cümlenin işareti **düşer** ve raporda listelenir.
- Teknik eğitimde yüz olmadığı için sahneler arada boşluk bırakmadan birbirine bağlanır.

## Görsel stil: `brand/brand.ts`

Kanalın stili siberpunk / Matrix: fosfor yeşili ve camgöbeği neon, dijital yağmur, tarama çizgileri, HUD panelleri, "çözülen" metin. Renk, font, tip boyutları, animasyon hızı, çerçeve ve doku yoğunlukları (`rain`, `scanlines`, `grid`, `photoTint`) bu dosyada. Script stil tarif etmez. Değişiklikleri video olmadan görmek için:

```bash
npm run studio
```

Açılan **Galeri** kompozisyonu bütün animasyon türlerini örnek verilerle gösterir.

## İşaret → sahne eşlemesi

İşaret türlerinin tek kaynağı `src/shared/marker-schema.ts`: parser'ın tanıdığı türler, TypeScript türleri, arayüz etiketleri ve skill'deki sözlük bloğu oradan türer. Şemayı değiştirince `npm run skill:sync` SKILL.md'deki bloğu yeniden yazar; test, bloğun şemayla aynı olduğunu ve her örneğin parser'dan hatasız geçtiğini denetler.

| İşaret | Sahne | Girdi |
|---|---|---|
| `ANİM: flow / compare / table / timeline / stat / quote / concept` | Kodla çizilen animasyon | script'teki metin |
| `ANİM: terminal` | Yazılan komut | script'teki `komut` |
| `ANİM: code` | Kod penceresi + satır vurgusu | `assets/dosya.js` |
| `EKRAN` | Çerçeveli ekran kaydı | `assets/screen-01.mp4` |
| `HABER` | Sayfa görüntüsü + fosforlu kalem + yakınlaşma | Playwright otomatik çeker |
| `BELGE` | PDF sayfası + vurgu | `assets/rapor.pdf` |
| `FOTO` | Ken Burns + isim/unvan | `assets/kisi.jpg` |
| `POST` | Gönderi kartı | script'teki metin |
| `, ton: tehlike` | Kırmızı-pembe vurgu + glitch girişi | — |

Eksik bir varlık render'ı durdurmaz: o sahne "EKSİK GÖRSEL" yer tutucusuyla çizilir ve raporda listelenir.

**Elle değiştirme:** Otomatik haber görüntüsü kötü çıktıysa (paywall, çerez ekranı), rapordaki adla (`haber-xxxxxxxx.png`) kendi ekran görüntünü `assets/` içine koy. Elle konan dosya üretilenin yerine geçer.

**İllüstrasyon (AI görseli) yok:** 2026-10-17'de kaldırıldı. Eski script'lerde kalan İLLÜSTRASYON satırları hata vermeden atlanır.

## Klasör yapısı

```
brand/brand.ts                          görsel kimlik
src/pipeline/                           parser, lint, hizalama, varlık toplama, CLI
src/remotion/                           sahne kütüphanesi ve kompozisyonlar
scripts/                                PDF yardımcısı (Python), ikon ve masaüstü başlatıcı
videos/YYYY-MM-kisa-baslik/
  script.md, script.final.md
  footage/   kurgu kaydı
  assets/    elle konan malzeme
  build/     transcript.json, scenes.json, edits.json, state.json, logs/, rapor.md, üretilen varlıklar
.media/                                 ortak medya deposu (kurgu kayıtları, hardlink; git'e girmez)
.cache/remotion/                        Remotion paketi önbelleği
  out/       video.mp4, gorsel-katmani.mov, bolumler.txt
```
