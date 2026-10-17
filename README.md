# YouTube Enhance — Video Pipeline

`youtube-script-writer` skill'inin yazdığı `script.md` içindeki **📍 işaretlerini** kurgu kaydındaki doğru saniyeye hizalar, her işareti bileşen kütüphanesindeki bir sahneye çevirir ve Remotion ile videonun üstüne yerleştirir.

```
script.md + kurgu.srt ──► lint ──► zamanlama (SRT) ──► assets ──► align ──► scenes.json ──► Remotion studio / render
                                                  │
              haber ekran görüntüsü + fosforlu kalem, PDF sayfası + vurgu, arşiv fotoğrafı adayları, eksik listesi
```

Zena'nın tercihleri ve pipeline'da alınan kararlar [CLAUDE.md](CLAUDE.md) içindeki karar günlüğünde tutulur.

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

**Kaynaklar:** render kendi süreç grubunda ve proje içindeki geçici bir klasörde (`build/.render-tmp-*`) çalışır. Render bitince, iptal edilince ya da uygulama kapanınca bütün alt süreçler (Remotion, Chrome, ffmpeg) sonlandırılır, geçici klasör silinir, yarım kalan video kaldırılır. Uygulama çökerse sunucu bunu 2 sn içinde fark edip kendini kapatır.

Geliştirme: `npm run server` (API, :3030) ve `npm run ui:dev` (Vite, :5173). Tarayıcıda `http://localhost:5173`. Uygulama arayüzü `dist/ui` altına `npm run ui:build` ile derlenir; `npm run app` bunu kendisi yapar.

## Kurulum (bir kere)

```bash
npm run setup
```

Kurulanlar: npm paketleri (Remotion, Playwright), `.venv` içinde Python (yalnızca PyMuPDF, PDF vurgusu için), Chromium.

## Bir videonun akışı

1. **Klasör aç**

   ```bash
   npm run new -- 2026-10-kisa-baslik
   ```

   Teknik eğitim için sona `--egitim` ekle.

2. **Script'i koy.** Skill'in ürettiği `script.md`'yi `videos/2026-10-kisa-baslik/` içine kopyala, sonra kontrol et:

   ```bash
   npm run lint -- 2026-10-kisa-baslik
   ```

   Lint, işaret sözlüğünü ve skill'in "İç Kalite Kontrol" listesinin makineyle denetlenebilen kısmını kontrol eder: yazım, yoğunluk, art arda tam ekran, tehlike oranı, kaynak tablosu, yasaklı kalıplar, tükenmiş ifadeler, imzalar.

3. **Malzemeyi topla.** Ekran kayıtlarını, fotoğrafları, PDF'leri ve kod dosyalarını script'teki adlarla `assets/` içine koy. Descript'ten dışa aktardığın kurguyu `footage/kurgu.mp4`, altyazısını (Export → Subtitles → SRT) `footage/kurgu.srt` olarak kaydet. **Altyazı zorunlu:** görsellerin saniyesi yalnızca buradan hesaplanır. Teknik eğitimde buraya seslendirme (`.wav` ya da `.m4a`) gelir.

4. **Kurgudan sonra (önerilir):** Descript transkriptini skill'e verip `script.final.md` üret ve aynı klasöre koy. Pipeline varsa onu kullanır, böylece işaretler gerçekte söylenen cümlelere oturur.

5. **Çalıştır**

   ```bash
   npm run pipeline -- 2026-10-kisa-baslik
   ```

   Bu komut sırayla lint → zamanlama → assets → align adımlarını çalıştırır. Çıktılar:
   - `build/scenes.json`: zamanlanmış sahneler (pipeline'ın son hali; skill'in öğrenme döngüsüne de girdi olur)
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
.claude/skills/youtube-script-writer/   skill (script yazımı, görsel işaret sözlüğü, kurgu sonrası mod)
brand/brand.ts                          görsel kimlik
src/pipeline/                           parser, lint, hizalama, varlık toplama, CLI
src/remotion/                           sahne kütüphanesi ve kompozisyonlar
scripts/                                PDF yardımcısı (Python), ikon ve masaüstü başlatıcı
videos/YYYY-MM-kisa-baslik/
  script.md, script.final.md
  footage/   kurgu kaydı
  assets/    elle konan malzeme
  build/     transcript.json, scenes.json, rapor.md, üretilen varlıklar
  out/       video.mp4, gorsel-katmani.mov, bolumler.txt
```
