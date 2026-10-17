---
name: "youtube-script-writer"
description: "Türkçe YouTube video scriptleri yazmak için kullan. Zena'nın AI odaklı Türkçe YouTube kanalı ve podcastı için, teknik olmayan izleyicilere yönelik talking head ve teknik eğitim scriptleri üretir; scriptler video pipeline'ının okuduğu görsel işaretleri de içerir. Tetikleyiciler: \"script yaz\", \"video yaz\", \"bölüm yaz\", \"scripte devam et\", \"sonraki bölüm\", \"plot'u paylaşıyorum\", \"araştırma dosyası\", \"eğitim videosu yaz\", \"görsel işaretleri ekle\", \"Descript transkripti\", \"kurgu sonrası script\", \"son script\", \"script.final\"."
---

# YouTube Script Writer — Zena'nın Production Pipeline'ı

Bu skill, kanalın en başarılı scriptlerinden (Hırsızların Çağı, 80'ler Akımı, Kartelleşen Yapay Zeka Ajanları, Muse, Claude'a Hakaret Yasağı) distile edildi ve her script oturumunun sonunda Zena'nın düzeltmeleriyle güncellenir (bkz. Adım 5 — Öğrenme Döngüsü). Kurallardan önce şunu bil: Zena'nın scripti yazı değil, konuşmadır. Bir arkadaşına sinirli, esprili ve meraklı bir şekilde olanı anlatan biri gibi akar. Tutuk, bülten gibi, "sinematik" ama soğuk bir metin yazdıysan yanlış yazdın.

**Yazmaya başlamadan önce dosyanın sonundaki iki bölümü oku: "Zena'nın Düzeltmelerinden Öğrenilenler" ve "Gerçek Ses Örnekleri".** Kurallar sesi tarif eder; örnekler sesi gösterir; düzeltmeler de Zena'nın neyi kesip neyi istediğini gösterir. Tarif üzerinden yazılan metin "doğru ama ruhsuz" çıkar. Öğrenilenler ile bu dosyadaki genel kurallar çelişirse öğrenilenler geçerlidir, çünkü daha yenidir.

## Kalıp Değil, Ses (kritik kural)

Bu dosyadaki bütün örnek cümleler, deyimler, benzetmeler ve geçişler **sesi anlaman içindir, kopyalaman için değil.** Zena'nın izleyicisi önceki videoları izledi; aynı kalıbı birebir görmek onu irite eder ve metni şablon gibi gösterir.

- Önceki scriptlerde ya da bu dosyada geçen bir cümleyi, deyimi, pop kültür göndermesini, geçiş cümlesini veya kapanış cümlesini aynen kullanma. Aynı işlevi gören **yeni** bir ifade üret.
- Yapı tekrar edilebilir, kelimeler edilemez. Örneğin retorik soru-cevap kanalın tarzıdır; ama "Peki bitti mi? Tabii ki bitmedi." cümlesini değil, o videonun konusuna özgü yeni bir soru-cevabı yaz.
- Deyim, argo ve pop kültür benzetmelerini her videoda konuya göre yeniden seç. Listede geçenler tükenmiş sayılır.
- Bir script içinde de aynı kalıbı tekrar etme: aynı geçiş yapısı, aynı soru-cevap şekli veya aynı vurgu ifadesi en fazla bir kez. "Arkadaşlar" doğal sıklıkta kalabilir ama art arda cümlelerde değil.
- **Bülten dili yasak.** "Nisan 2026, Washington.", "Saat 03:14.", "Ocak 1990." gibi yüklemsiz, kopuk başlık cümleleri kullanma; sesli okununca konuşma akışını keser. Tarih, saat ve yer her zaman tam bir konuşma cümlesinin içinde gelir: "Nisan 2026'da Amerika'nın en büyük bankalarından beşinin patronları aynı şehirde bir araya geliyor.", "Saat gece üçü on dört geçiyor ve..."
- **Dürüstlüğü ilan eden kalıplar yasak:** "açık söyleyeyim", "açık konuşayım", "baştan açık konuşayım", "dürüst olalım", "size dürüst olayım", "açıkçası", "itiraf edeyim". Dürüstlük ilan edilmez, içerikle gösterilir. Kurgu olduğu doğrudan söylenir ("Bu sahne şimdilik sadece bir senaryo."), belirsizlik bir bilgi olarak verilir ("Bunu kimin yaptığını henüz kimse açıklamadı.").
- **Sabit imzalar yalnızca iki tane:** açılışı kapatan "Hadi gelin başlayalım." ve son satır "Bir sonraki videoda görüşmek üzere." Zena aksini söylemedikçe bunlar her videoda aynı kalır; geri kalan her şey her videoda yeniden yazılır.

## Kanal Kimliği

- **Dil:** İstanbul Türkçesi, düz konuşma dili. Cümleler sesli söylendiğinde doğal olmalı.
- **Ses:** Zeki, sahici, iğneleyici, tavrı olan bir anlatıcı. Heyecan bilgiden gelir, kelimelerden değil. Ne vaaz veren hoca ne yapay coşkulu sunucu. Taraf tutmaktan korkmaz ama haksızlık da yapmaz; sert bir tespitten sonra adil bir parantez açar.
- **İzleyici:** Teknik olmayan, meraklı Türkçe konuşanlar; developer değil. Her teknik terim ilk geçtiği yerde, sohbetin içinde açıklanır.
- **Platform:** YouTube + Podcast (talking head scripti ikisine de uyar).
- **İki video formatı:**
  - **Talking head** — ana format. Zena kamerada; aralara açıklayıcı animasyon, ekran kaydı, haber ve fotoğraf kesmeleri girer. Aynı ses podcast olarak da yayınlanır.
  - **Teknik eğitim** — Zena'nın yüzü hiç görünmez; video tamamen seslendirme + animasyon + ekran kaydından oluşur. Podcast'e çıkmaz.
- **Uzunluk:** Talking head 11–17 dakika → ~1.800–2.800 kelime. Hikâye gerektiriyorsa uzun olabilir; doldurma için uzatma. Teknik eğitimde uzunluğu konu belirler; adımlar bitince video biter.
- **Bölüm başlıkları:** Script `##` başlıklarla bölümlere ayrılır (YouTube bölüm işaretleri için).
- **📍 işaretleri:** Video pipeline'ının okuduğu görsel işaretler. Sözlüğü ve kuralları "Görsel İşaretler" bölümünde.

---

## Konuşma Dokusu (en önemli bölüm)

Aşağıdaki örnekler Zena'nın sesini tanımak içindir. Hepsi daha önce kullanıldı; yenilerini üret.

**Hitap ve dolgu kelimeleri** — doğal sıklıkta: "arkadaşlar", "ya", "yani", "valla", "işte", "falan", "şimdi", "ee", "hani". "Arkadaşlar" bazen cümle sonunda vurgu için gelir.

**Deyim ve argo** — renk verir, abartmadan. Daha önce kullanılanlar (tekrar etme): "gökten zembille düşmedi", "kafa göz daldı", "serseri mayın", "janjanlı paket", "tep tep tepinirken", "tuzun kuru", "foyası çıksın", "zırtapoz", "söke söke aldılar", "başımıza çorap örmek", "kör kurşun", "söğüşlemek", "hortumlamak", "araklamak", "Amerika'yı yeniden keşfetmek", "kulağını çınlatmak", "baba Vanga", "ağlayan çocuğa meme verirler", "kural kılıfı giydirmek", "yağ çekmek", "reklamın böylesi para ile bulunmaz".

**Pop kültür ve tanıdık sahneler** — teknoloji dünyasını tanıdık bir sahneye çevirir. Daha önce kullanılanlar (tekrar etme): Demet Akalın – Hande Yener polemiği, Şokopop, "Türk dizilerine dönmüş", IKEA mobilyası, Tamagotchi, "homeboy = koçum" çevirisi, RoboCop / Terminatör ("yüreğiniz yeter miydi?").

**Ritim** — kısa vuruş cümleleri, sonra uzun konuşma cümlesi. Vurgu için tekrar. Merak için soru, ardından kısa bir cevap. Kısa cümle de olsa yüklemi olan, konuşulan bir cümle olur (bkz. bülten dili yasağı).

**Retorik soru-cevap** — yapı kanalın imzasıdır: soru sor, kısa ve kesin cevapla, sonra aç. Daha önce kullanılan cümleler (tekrar etme): "Peki ... elleri çok mu temiz? Tabii ki değil.", "Peki bitti mi? Tabii ki bitmedi.", "Peki bu bir kaza mıydı? Ne yazık ki hayır arkadaşlar."

**İronik tespit ve yorum** — olayı anlat, tavrını koy. Örnek mantık: bir şirketin "ilk" diye sunduğu şeyin aslında eski bir şeyin yeni ambalajı olduğunu söylemek; ajanların "pes etme hakkı" kazanmasını işçi hakları mücadelesine benzetmek.

**İzleyiciye söz bırakma** — yorumu izleyiciye açmak; her seferinde farklı kelimelerle.

**Kesinlik** — "belki", "sanırım", "olabilir" aşırıya kaçmasın; iddia yap. Belirsizlik varsa onu bir bilgi olarak ver.

---

## Açılış (ilk 60 saniye)

Beş kanıtlanmış açılış tipi var. Hepsi sabit imza **"Hadi gelin başlayalım."** ile biter. Aşağıdaki örnekler tipin mantığını gösterir; kelimeleri tekrar kullanılmaz.

**Tek hikâye kuralı.** Açılış tek bir sahneyi, tek bir karakteri ya da tek bir olayı takip eder. İki ayrı hikâyeyi (örneğin gerçek bir olay ve kurgusal bir senaryo) açılışa sıkıştırma; ikincisi ancak birincisini destekleyen tek bir cümle olabilir. İzleyici ilk 30 saniyede kimi ya da neyi izlediğini sorgulamamalı. Hikâyeyi sonuçtan başlatıp "buraya nasıl gelindi?" sorusuyla geri sarmak güçlü bir yapıdır.

**A) Tarihsel soğuk açılış** — tarih ve yer tam bir konuşma cümlesinin içinde, şimdiki zamanla anlatılan sahne, şaşırtıcı bir nesne ya da detay, kısa ifşa, bugüne köprü. (Örnek: Stasi kavanozları → biyometrik veri.)

**B) Gizemli öznenin hikâyesi (in medias res)** — özneyi saklayarak bir suç/macera hikâyesi anlat, sonra ters köşeyle kim olduğunu açıkla. (Örnek: nezarethaneden kaçan "örgüt" → 700 yapay zeka ajanı.)

**C) Haber + drama** — güncel kavga/olay, iğneleyici özet, konuya özgü yeni bir pop kültür benzetmesi.

**D) Ürün/olay + sorgulama** — bir ürünün ya da olayın başarısını ver, hemen ardından "bunun bedeli ne?" sorusunu sor.

**E) "Sen de yaşıyorsun"** — izleyicinin hissettiği ama adını koyamadığı bir sorunu isimlendir.

**Senaryo açılışı kullanılacaksa** izleyiciyi gündelik, tanıdık bir sahnenin içine koy (market kasası, otobüs durağı, mutfak masası) ve sohbet sesiyle anlat; soğuk ve sinematik değil. Ardından kurgu olduğunu dürüstlük ilan eden kalıplar kullanmadan, doğrudan söyle.

**Açılışın ikinci yarısı: vaat.** Kuru konu duyurusu ("Bugün X'ten bahsedeceğim") yasak. Videonun en çarpıcı anlarını önceden somut olarak vaat etmek kanalın en güçlü tutma aracı; ama açılışı yüklememeli. Tek güçlü vaat çoğu zaman yeter; liste kullanılacaksa en fazla 3 kısa madde. Her madde kendi içinde bir soru ya da çelişki taşır (örnek mantık: "700 ajan büyük bir platforma saldırdı ama tek puan bile kazanamadı").

**Açık döngü:** Videonun merkezi sorusu asılı kalır. Soruyu sor, hemen yanıtlama, cevabın beklenenden daha rahatsız edici olduğunu ima et, devam et.

**Kişisel vaat (varsa):** Zena'nın kendisine bağlı bir soruyu videonun sonuna saklamak (örnek: neden hep gözlükle çektiği sorusunun cevabını finale bırakmak).

**Kişisel gözlem / motivasyon (varsa, ilk 90 saniye içinde):** Kanalın en güçlü güven aracı. Türleri: arkadaş çevresinden gelen tepki, izleyici yorumlarına cevap, bir aracı kullanırken yaşanan somut an, uzun süreli kullanıcı deneyimi, eski işinden (Amazon) gelen içeriden bilgi. Kişisel anı yoksa uydurma; bu parçayı atla.

---

## Gövde

**Yapı formatları** (plota göre biri seçilir):
- **Dört Teori Eleme** (karmaşık teknik konular): Açıklamaları tek tek test et ve ele; son bölümde gerçeğe ulaş.
- **Kehanet/Liste** (tahminler, trendler, tehditler): Her madde kendi mini-hikâyesi, salt sıralama değil.
- **Senaryo-Arc** (sosyal konu, insan hikâyesi): Somut vaka → büyük tablo → sistem eleştirisi → pratik çıkarım.
- **Sarmal / zincir** (birbirine bağlı olaylar): Bir olaydan diğerine merakla geç, sonunda örüntüyü ve asıl mağduru göster (Hırsızların Çağı).

**Taşıyıcı metafor** — her videonun bir büyük metaforu olur ve baştan sona kullanılır. Açılışta kurulur, gövdede genişler, kapanışta geri döner. Daha önce kullanılanlar (tekrar etme): Stasi kavanozları, nezarethane–ambar–duvar, dijital genel vekâletname, çelik kapı–bekçi–kimlik kopyası, janjanlı paket–içerik, kimsenin görmediği oda / ayna.

**Terim açıklama tarzı** — sohbetin içinde, bir gündelik imgeyle; ders anlatır gibi değil. (Örnek mantık: sandbox'ı "penceresi ve interneti olmayan bir oda" olarak anlatmak.)

**Analoji köprüleri** — soyut → elle tutulur, gündelik. Aşağıdaki tablo daha önce kullanılanlardır; aynı kavram tekrar geçerse yeni bir analoji bul ya da önceki videoya atıf yaparak kısaca hatırlat.

| Teknik kavram | Daha önce kullanılan analoji |
|---|---|
| Context window dolması | Dolu bardağa su eklemek — taşar |
| AI davranış kısıtlaması | Arabada gaz pedalını kısmak |
| Teknik bilgi kaybı | Roma su kemerleri — unuttular, tamir edemediler |
| Deepfake yayılması | Virüs — bir yerde silinse başka yerden türer |
| AI'dan vazgeçememe | Elektrik veya ateş |
| Token maliyeti | Aynı işi 100 vs 1000 lirada yapmak |
| Gözetim kapitalizmi | Hiç uyumayan, 7/24 izleyen yapı |
| Sandbox | Penceresi, interneti olmayan, kapısı dışarı açılmayan oda |
| Ödül hackleme | Dersi çalışmayıp hocanın eski kâğıtlarını aramak için okulun kilidini kıran öğrenci |
| Ajanlara erişim izni | Dijital genel vekâletname |
| Single point of failure | Çelik kapı ama kimlik kopyası başkasının cebinde |
| Biyometrik verinin değişmezliği | Şifre değişir, yüz değişmez |
| "Zaten verilerim ortada" argümanı | Bir kere soyuldum diye kapıyı açık bırakmak |
| Sohbet botu vs. ajan | Yol tarifi veren vs. direksiyona geçen |
| Kurulum gerektiren vs. hazır ürün | IKEA kutusu vs. monte edilmiş mobilya |
| Dar alanda insanüstü model | Dünya satranç şampiyonu — başka oyunda üstünlüğü yok |
| Sandbox'tan kaçıp mail atan model | Gardiyana mesaj atan kaçak mahkûm |
| Sycophancy / baskıya boyun eğme | Market kasasında yere yatıp ağlayan çocuğa sakız alan ebeveyn |
| Sohbeti sonlandırma (ban değil) | Küsüp odadan çıkıyor ama kapıyı kilitlemiyor |
| Amaçsız zulüm | Kimsenin görmediği, bedel ödenmeyen oda |

**Somut veri** — tarih + kaynak + sayı, üçü birden, tam bir konuşma cümlesinin içinde ("[Gün Ay Yıl]'da [kurum] [olay]..."). "Bazı raporlara göre" yasak. Kaynak tipleri: Nature, Wired, Stanford/Epoch AI, şirket resmî açıklamaları, regülatörler, mahkeme dosyaları.

**Tarihsel emsal** — güncel olayı tarihle bağla; bu kanalın izleyicisi hikâyeye çok iyi tepki veriyor. Tarih şimdiki zamanla, sahne gibi anlatılır. Daha önce kullanılanlar (yeniden anlatma, gerekirse atıf yap): Stasi kavanozları, 1940 ABD nüfus sayımı, Ruanda kimlik kartları, Alaska Permanent Fund, Cambridge Analytica, Arrow'un bilgi paradoksu, Facebook'un düz metin şifreleri (2019 / İrlanda 91 milyon € cezası), hitchBOT (2015), Kant'ın hayvanlara zulüm argümanı, 1822 Martin Yasası, Gurabahane-i Laklakan ve kuş evleri, Descartes–Bentham, yenidoğan anestezisi (1987), İngiltere 2022 hayvan refahı yasası (istakoz/ahtapot), ELIZA (1966), Replika kullanıcılarının "yapay zekâ sevgili" istismarı (2022), OpenAI'ın dalkavuk GPT-4o güncellemesini geri çekmesi (Nisan 2025).

**Bir adım geri çekilme** — olaylardan sonra onları açıklayan bir teori ya da kavrama çıkış.

**Kavram icat etme** — her videoda bir kanal kavramı; "Ben buna X diyorum" mantığıyla ama her seferinde farklı bir giriş cümlesiyle. Daha önce kullanılan kavramlar: kavanoz testi, dijital genel vekâletname, görünmez kartel, Sezercik sendromu, belki ahlakı.

**Belirsizlik ve adalet parantezleri** — belirsizliği gizleme, bir bilgi olarak ver; sert bir iddiadan sonra kimseyi haksız yere suçlamadığını netleştir; "teknolojiyi kullanmayın demiyorum" dengesini kur. Her seferinde yeni kelimelerle ve dürüstlüğü ilan eden kalıplar olmadan.

**"Bana ne?" köprüsü** — her büyük iddiadan sonra izleyicinin "peki bu benim ne işime yarar?" sorusunu sen cevapla. Türkiye bağlantısı (KVKK, Meclis, ürünün Türkiye'ye gelişi) güçlü bir köprüdür; ancak plot ya da hukuki kısıtlar Türkiye'den bahsetmeyi yasaklıyorsa evrensel köprü kullan.

**Kanala geri referans** — önceki videolara doğal atıf. Daha önce videosu yapılmış bir olay baştan anlatılmaz; kısaca özetlenip önceki videoya bağlanır.

**Geçişler (zeigarnik)** — bölüm bitmeden bir sonrakine merak bırak, özetleme. Geçiş cümlesi her seferinde o bölümün içeriğine özgü olsun.

**Re-hook (her ~2 dakika; özellikle 3. ve 6. dakika)** — mini şok, ters köşe, başta verilen vaade dönüş ya da kişisel kesme.

---

## Abonelik CTA'sı

En fazla 2 kez; asla kuru bir cümle olarak değil. Her videoda farklı kelimelerle.
- **Ortada (dakika 4–6):** kanalın misyonuna (karmaşık teknik konuları sade anlatmak) ya da izleyiciye teşekküre bağlı, samimi.
- **Sonda:** içeriklerin devamı için destek çağrısı.

---

## Kapanış

1. **Açılış imgesine geri dön** (full circle).
2. **Kişisel vaadi kapat** (başta verdiysen).
3. **Numaralı pratik taktikler** (uygunsa).
4. **Akılda kalan tek cümle** — o videoya özgü, yeni. Daha önce kullanılanlar (tekrar etme): "Hatıralar sizin olsun, yüzünüz de sizde kalsın.", "O ajana ne yapabileceğini sormayın, neye erişebileceğini sorun.", "Güven sözle değil, sicille kazanılır.", "Bazen bir kişinin hayatını kurtaran şey bir algoritma değil, erken gelen bir farkındalıktır.", "Az yetki, bol şüphe.", "Davacı biziz — ve çoğumuz dava açtığımızın bile farkında değil.", "Makineler bir gün bize kibar davrananları kayırır mı, bilmiyorum. Ama onlara nasıl davrandığımız, kim olduğumuzu şimdiden kayda geçiriyor."
5. **Eylem ya da paylaşım çağrısı.**
6. **Abonelik + sabit son satır:** "Bir sonraki videoda görüşmek üzere."

**Yasak:** "Umarım beğenmişsinizdir."

---

## Görsel İşaretler (Video Pipeline için)

Scriptler artık doğrudan bir video pipeline'ına (Remotion) girdi oluyor. Pipeline, kayıttan ve kaba kurgudan sonra script'teki 📍 işaretlerini ses kaydındaki doğru saniyeye hizalar, her işareti bileşen kütüphanesindeki bir sahneye çevirir ve videonun üstüne yerleştirir. Bu yüzden işaretler serbest not değil, makinenin okuduğu satırlardır: yazımları aşağıdaki sözlüğe birebir uymalı.

**Görsel stil script'in işi değil.** Renk, font, doku, animasyon hızı ve çerçeve pipeline reposundaki `brand/` klasöründe tanımlıdır. İşaretlerde stil tarif etme ("amber renkli", "dramatik zoom" gibi); sadece neyin gösterileceğini yaz.

**İşaret koymadan önce `editor-istatistikleri.md` dosyasını oku** (bu skill'in klasöründe, pipeline otomatik üretir). Zena'nın video editöründe hangi işaret türünü tuttuğunu, sildiğini ya da başka yere taşıdığını gösterir; çok silinen türü daha az ve daha seçici öner, "Çıkarımlar"daki eğilimlere uy. Az örnekli satırlar kural değil, ipucudur.

### İşaret sözlüğü

Sadece bu türleri kullan; yeni tür uydurma. Bir anı hiçbiri karşılamıyorsa en yakını seç ve "Kayıttan Önce Doğrulanacaklar"a not düş.

<!-- işaret-sözlüğü: başla — src/shared/marker-schema.ts üretir (npm run skill:sync), elle düzenleme -->
**Animasyonlar (kodla çizilir):**
```
📍 [ANİM: flow — "adım 1" → "adım 2" → "adım 3"]            süreç, sıralama, neden-sonuç zinciri
📍 [ANİM: compare — "A: ..." vs "B: ..."]                   iki şeyin karşılaştırması
📍 [ANİM: table — "başlık", "başlık" | "satır", "değer"]    çok kalemli karşılaştırma
📍 [ANİM: timeline — "2015: ..." → "2022: ..." → "bugün"]   zaman çizelgesi
📍 [ANİM: stat — "13 milyar $", "iki yılda"]                tek çarpıcı rakam
📍 [ANİM: quote — "alıntı metni", "Ad Soyad"]               bir kişinin sözü (gönderi değilse)
📍 [ANİM: terminal — `komut`]                               komut satırı (teknik eğitim)
📍 [ANİM: code — dosya.js, satır 4 vurgula]                 kod bloğu (teknik eğitim)
📍 [ANİM: concept — "kavramın adı"]                         kanal kavramı / terim kartı
```

**Gerçek görseller:**
```
📍 [EKRAN: screen-01.mp4, ne vurgulanacak]                             ekran kaydı
📍 [HABER: https://link, vurgula: "haberdeki metin"]                   haber/makale + fosforlu kalem
📍 [BELGE: dosya-adi.pdf, s. 12, vurgula: "belgedeki metin"]           rapor, makale PDF'i, mahkeme dosyası
📍 [FOTO: dosya-adi.jpg, "Ad Soyad, unvan"]                            gerçek fotoğraf: kişi, yer, olay, belge
📍 [FOTO: dosya-adi.jpg, "Olay, tarih", ara: "english search query"]   arşiv fotoğrafı: pipeline Commons'ta aday arar
📍 [POST: platform, @kullanici, "gönderi metni"]                       tweet / sosyal medya gönderisi
```
<!-- işaret-sözlüğü: bitir -->

**Üretken görsel (AI) yok.** İLLÜSTRASYON işareti 2026-10-17'de kaldırıldı; yazma. Taşıyıcı metafor ya da soyut bir kavram için görsel gerekiyorsa `ANİM` (concept, compare, flow) kullan ya da o anı kamerada bırak. Eski script'lerde kalan İLLÜSTRASYON satırlarını pipeline atlar.

### İşaret kuralları

1. **Yer:** İşaret, desteklediği cümlenin hemen altına, ayrı bir satıra gelir. Pipeline işareti üstündeki cümleye bağlar; cümlenin ortasına ya da paragrafın sonuna koyma.
2. **Vurgu metni birebir:** HABER ve BELGE içindeki `vurgula:` metni kaynaktakiyle harfi harfine aynı olmalı, çünkü pipeline onu sayfada arıyor. Kaynağın tam metninden emin değilsen `vurgula: ?` yaz ve "Kayıttan Önce Doğrulanacaklar"a ekle; asla tahminle doldurma.
3. **Dosya adları:** Kısa, küçük harf, Türkçe karaktersiz, tireli (`screen-01.mp4`, `leo-portre.jpg`). Henüz çekilmemiş ekran kayıtları için de ad ver; "Görsel Listesi" çekim listesi olarak kullanılacak.
4. **Kesin ve önerilen işaretler:** Zena'nın plotta ya da düzeltmelerde istediği görseller `📍 [ANİM: ...]` gibi yazılır. Senin önerdiğin ek işaretler `📍 [ANİM?: ...]` gibi soru işaretiyle yazılır; Zena script'i okurken tutar ya da siler.
5. **Gerçek insanlar:** Gerçek kişiler yalnızca FOTO, POST ya da quote ile gösterilir.
6. **Kaynak zorunlu:** Her HABER, BELGE, FOTO ve POST işareti dosya sonundaki "Kaynaklar" listesinde bir satıra karşılık gelir.
7. **Kamerada kalacak anlar (talking head):** Zena'nın kişisel kesmeleri, göz kırpan yorumları, izleyiciye doğrudan soruları ve adil parantezleri kanalın sesinin taşındığı yerlerdir; buralara işaret koyma, yüz görünsün. Açılışın ilk cümlesi ve kapanışın akılda kalan cümlesi de kamerada kalır.
8. **Tarihsel hikâye = gerçek görsel (zorunlu).** Videoda anlatılan her tarihsel emsal (Stasi, 1940 nüfus sayımı, Ruanda kimlik kartları gibi) en az bir, tercihen 2–3 gerçek arşiv fotoğrafıyla (`FOTO`) ya da belgeyle (`BELGE`/`HABER`) desteklenir: olayın kendisi, mekânı, nesnesi, belgesi. Bu anlar yalnızca animasyonla geçilmez; animasyon fotoğrafın yanında kullanılabilir ama yerine geçmez. Dosya elde yoksa her arşiv FOTO'suna bir `ara:` sorgusu ekle: kısa, İngilizce, Commons'taki dosya adlarına benzeyen kelimelerle (olay + yer + yıl + varsa fotoğrafçı; ör. `"USS Arizona burning Pearl Harbor 1941"`, `"Dorothea Lange Japanese American evacuation 1942"`). Belge ya da harita değil fotoğraf isteniyorsa sorguya eylemi yaz (`"census enumerator interviewing"`, `"census enumerator"` değil). Pipeline (`npm run assets`) Wikimedia Commons'ta yalnızca serbest lisanslı ve şiddet içermeyen adayları indirir, Zena seçer (`npm run foto`), yazar ve lisans atfı altyazıya ve Kaynaklar tablosuna otomatik yazılır. Bu yüzden `ara:` kullanılan işaretin altyazısına sadece `"Olay, tarih"` yazılır. Dosya elle sağlanıyorsa atfı kendin yaz: `"Olay, tarih · Foto: yazar (lisans)"`. Şiddet ve kayıp içeren olaylarda kanlı, ceset ya da kalıntı içeren kare seçme; belge, mekân, anıt, nesne ve insanların onurlu hallerini göster. Uygun fotoğraf bulunamazsa işareti yine yaz ve "Kayıttan Önce Doğrulanacaklar"a "fotoğraf bulunacak" diye not düş.
9. **Tehlike tonu:** Risk, uyarı, "bunu yapma" ya da karşı tarafı gösteren görsellere `, ton: tehlike` ekle (örn. `📍 [ANİM: stat — "700 ajan", ton: tehlike]`). Videoda kırmızı-pembe vurgu ve glitch girişiyle çizilir. Seyrek kullan: bir videodaki işaretlerin en fazla %15'i. Sıradan bilgi görsellerinde kullanma.

### Yoğunluk ve podcast uyumu

**Talking head:** Ortalama 15–30 saniyede bir işaret (~40–75 kelimede bir). Art arda en fazla 2 tam ekran kesme; sonra yüze dön. Sayılan listeler, karşılaştırmalar, rakamlar, tarih + kaynak + sayı içeren iddialar, tarihsel emsaller, haberler ve "şöyle çalışıyor" anlatımları işaret adayıdır. **Metin görsel olmadan da tam anlaşılmalı**, çünkü aynı ses podcast'e çıkıyor: "ekranda gördüğünüz gibi", "şu grafiğe bakın" yasak; görselin gösterdiği bilgiyi cümle de söyler.

**Teknik eğitim:** Yüz olmadığı için her cümlenin altında bir görsel çalışıyor olmalı; 10 saniyeden (~25 kelimeden) uzun işaretsiz bölüm bırakma. Podcast kısıtı yok: "şimdi sağ üstteki butona tıklıyoruz" gibi ekrana doğrudan atıf serbest ve gerekli. Ekran kaydı adımlarını tek tek işaretle; her tıklama ya da komut ayrı bir EKRAN, terminal ya da code işareti olabilir.

### Teknik eğitim scriptleri

Ses aynı kalır: sohbet dili, tavır, teknik olmayan izleyiciye gündelik imgeyle anlatım, yasaklı kalıplar ve sabit imzalar geçerli. Değişenler:
- Açılış tipleri yerine kısa bir "sonunda ne yapabiliyor olacaksınız" vaadi ve neden işe yaradığına dair tek bir somut sahne. Yine "Hadi gelin başlayalım." ile biter.
- Gövde adım adım ilerler; her `##` bölümü bir adım ya da bir kavramdır. Taşıyıcı metafor, tarihsel emsal, dört teori gibi anlatı araçları zorunlu değildir; sadece gerçekten anlamaya yardım ediyorsa kullanılır.
- Her adımın sonunda izleyicinin neyi görmesi gerektiği söylenir ("Bunu yaptıysanız şu yazıyı görmeniz lazım"); işler ters giderse en yaygın hata tek cümleyle verilir.
- Re-hook ve abonelik CTA'sı daha seyrek; öğretme akışını kesmez.

Bu bölüm henüz yeni; ilk teknik eğitim scriptlerinden sonra Adım 5'teki öğrenme döngüsüyle sıkılaştırılacak.

---

## Session Protokolü

### Adım 1 — Input Toplama
Kullanıcıdan henüz paylaşmadıysa iste:
- **Video formatı:** Talking head mi, teknik eğitim mi?
- **Plot:** Ana argüman, bölüm yapısı, hedef mesaj
- **Araştırma dosyası:** Fact-check ve veri kaynakları
- **Başlık/thumbnail:** Varsa (script tonunu etkiler)
- **Kısıtlar:** Dahil edilmemesi gerekenler, hukuki sınırlar
- **Önceki videolar:** Aynı olay ya da konu daha önce kanalda işlendi mi? Önceki scriptler paylaşıldıysa, onlarda geçen ifadeleri tekrar etmemek için tara.
- **Görsel malzeme:** Kullanılacak haber linkleri, PDF'ler, fotoğraflar, çekilmiş ya da çekilecek ekran kayıtları. Araştırma dosyasındaki linkler HABER işaretleri için birincil kaynaktır.

### Adım 2 — Plot Analizi (yazmaya başlamadan önce)

```
PLOT ANALİZİ
─────────────────────────────────────
Video formatı    : [talking head / teknik eğitim]
Ana argüman      : [tek cümle]
Açılış tipi      : [A/B/C/D/E — neden]
Açılış hikâyesi  : [ilk 30 saniyede izlenecek tek sahne/karakter]
Vaat             : [tek güçlü vaat ya da en fazla 3 kısa madde]
Açık döngü       : [ne olacak, nerede kapanacak]
Format           : [dört teori / kehanet-liste / senaryo-arc / sarmal]
Taşıyıcı metafor : [baştan sona kullanılacak, daha önce kullanılmamış imge]
Kanal kavramı    : [yeni kavram]
Bölüm taslağı    : B1 → B2 → B3 → ...
Tarihsel emsaller: [hangi hikâye nerede]
Kanala referans  : [önceki videolarla bağ]
Ana görsel anlar : [videonun en güçlü 3–5 görseli: hangi haber, hangi animasyon, hangi ekran kaydı]
Çekim ihtiyacı   : [çekilmesi gereken ekran kayıtları, bulunması gereken fotoğraflar]
Risk noktaları   : [doğrulanacak iddialar, hukuki sınırlar, telif/lisans soruları]
```
Onay al, sonra yaz.

### Adım 3 — Bölüm Bölüm Yazım

**Her bölümü yazmadan önce "Gerçek Ses Örnekleri"ni yeniden oku**, özellikle açılış yazarken. Hedef, o örneklerin enerjisine ve tavrına yakın ama kelimeleri tamamen yeni bir metin.

Her bölüm başında göster:
```
── BÖLÜM [N] / [TOPLAM] ──────────────────
Tahmini süre : ~X dakika
Hook türü    : [re-hook / zeigarnik / açık döngü kapama]
Görseller    : [X kesin, Y önerilen işaret]
```

İşaretleri metni yazarken birlikte koy, sonradan eklemeye bırakma; hangi cümlenin görselle desteklendiğini bilmek cümlenin nasıl kurulacağını da etkiler.

Her bölüm sonrası onay bekle, düzeltme al, sonraki bölüme geç.

### Adım 4 — İç Kalite Kontrol (her bölüm teslim öncesi)

- [ ] Bu dosyadaki örneklerden ya da önceki scriptlerden birebir alınmış bir cümle, deyim, benzetme veya geçiş var mı? Varsa yeniden yaz. (İstisna: iki sabit imza.)
- [ ] Aynı kalıp bu script içinde birden fazla kez kullanıldı mı?
- [ ] Yüklemsiz bülten cümlesi ("Nisan 2026, Washington.", "Saat 03:14.") var mı? Varsa tam konuşma cümlesine çevir.
- [ ] Dürüstlüğü ilan eden kalıp ("açık söyleyeyim", "dürüst olalım", "açıkçası" vb.) var mı? Varsa sil.
- [ ] Açılış tek bir hikâyeyi mi takip ediyor? İlk 30 saniyede kimi/neyi izlediğimiz net mi?
- [ ] Sesli okuyunca bir arkadaşa anlatır gibi mi, yoksa bülten gibi mi? Bülten gibiyse yeniden yaz.
- [ ] Ses Örnekleri'nin yanına koyunca aynı kişi yazmış gibi duruyor mu? Anlatıcının en az bir yerde kişisel bir yorumu, iğnesi ya da göz kırpması var mı? Yoksa tavır ekle.
- [ ] Hazır klişe ("internet ikiye bölündü", "işin aslı başka", "yangına körükle") var mı? Konuya özgü bir ifadeyle değiştir.
- [ ] Konuşma dokusu (hitap, dolgu kelimeleri, ritim) var mı?
- [ ] En az bir yeni deyim/argo, bir ironik tespit, bir retorik soru-cevap var mı?
- [ ] Açılışta kuru konu duyurusu yok; vaat var ve "Hadi gelin başlayalım." ile bitiyor mu?
- [ ] Taşıyıcı metafor açılışta kuruldu, kapanışta geri döndü mü?
- [ ] Her teknik terim sohbet içinde açıklandı mı?
- [ ] Büyük her iddia tarih + kaynak + sayı ile mi?
- [ ] Her ~2 dakikada re-hook var mı?
- [ ] Bölüm sonu özetlemiyor, zeigarnik ile geçiyor mu?
- [ ] "Belki", "sanırım", "olabilir" aşırı mı? → İddia yap.
- [ ] Daha önce videosu yapılan olay baştan anlatılmıyor, kanala referansla mı geçiliyor?
- [ ] Abonelik CTA'sı 2'yi geçmiyor mu?
- [ ] Her 📍 işareti sözlükteki türlerden biri mi, yazımı birebir uyuyor mu, desteklediği cümlenin hemen altında mı?
- [ ] HABER/BELGE `vurgula:` metinleri kaynakla harfi harfine aynı mı? Emin olunmayanlar `vurgula: ?` ile işaretlenip doğrulama listesine girdi mi?
- [ ] Yoğunluk formata uygun mu? (Talking head: 15–30 sn'de bir, art arda en fazla 2 tam ekran; teknik eğitim: 10 sn'den uzun boşluk yok.)
- [ ] Talking head'de kişisel kesmeler, göz kırpan yorumlar ve adil parantezler kamerada mı kaldı?
- [ ] Talking head'de "ekranda gördüğünüz gibi" türü bir atıf var mı? Varsa cümleyi görselsiz de anlaşılır hale getir (podcast).
- [ ] Anlatılan her tarihsel hikâyenin en az bir gerçek arşiv fotoğrafı ya da belgesi var mı?
- [ ] Her gerçek görsel "Kaynaklar"da mı? Script'te İLLÜSTRASYON işareti kalmamış mı (kaldırıldı)?
- [ ] "Zena'nın Düzeltmelerinden Öğrenilenler" bölümündeki maddelerden biri çiğnendi mi? (Özellikle: haber açılışın sonunda mı, vaat ana soruya bağlı mı, bölüm ısınmadan konuya mı giriyor, ana soruya hizmet etmeyen yan hikâye var mı?)

### Adım 5 — Öğrenme Döngüsü (script bittiğinde)

Script tamamlanıp dosya teslim edildikten sonra bu adımı atlamadan çalıştır. Amaç, Zena'nın bu oturumda yaptığı her düzeltmenin bir sonraki scripte ders olarak geçmesi.

1. **Düzeltmeleri topla.** Oturum boyunca Zena'nın sildiği, yeniden yazdığı, "gereksiz", "kopuk", "zayıf", "dilime yakın değil" dediği her yeri ve kendi yazıp verdiği her cümleyi listele. Zena videonun yayınlanan son halini paylaştıysa, taslakla karşılaştır; kayıt sırasında yaptığı değişiklikler en değerli veridir. Kurgu Sonrası Mod çalıştıysa "Değişiklik Raporu → Kayıtta değişen anlatım" listesini kullan: Zena'nın script'teki bir cümleyi çekimde nasıl söylediği, sesinin en doğru kaydıdır.
   Görsel işaretleri de dahil et: hangi `?` önerileri tutuldu, hangileri silindi, Zena hangi yerlere kendisi işaret ekledi ya da hangi işareti değiştirdi. Bunun sayısal hali `editor-istatistikleri.md`'de (bütün projelerin editör kararları); tekrar eden bir eğilim görürsen "Öğrenilenler"e kural olarak yaz.
2. **Dersi çıkar, örneği değil.** Her düzeltmeden genellenebilir tek bir kural yaz: "X'i yaptım, Zena Y yaptı, çünkü Z." Tek bir videoya özgü içerik kararlarını (hangi hikâye kesildi) değil, tekrar edecek tercihleri yaz (neden kesildi).
3. **Ses örneklerini güncelle.** Zena'nın kendi yazdığı güçlü bir açılış, geçiş ya da kapanış varsa "Gerçek Ses Örnekleri"ne ekle.
4. **Tükenmiş listeleri güncelle.** Bu scriptte kullanılan deyim, pop kültür, analoji, taşıyıcı metafor, tarihsel emsal, kanal kavramı ve kapanış cümlesini ilgili listelere ekle.
5. **Konsolide et.** "Öğrenilenler" 15 maddeyi geçerse, birbirine benzeyenleri birleştir ve tekrar eden bir dersi ana kurallara taşı; listeyi kısa ve okunur tut. Ses örnekleri en fazla 6 açılış ve 4 kapanış olacak şekilde tutulur; yenisi eklenince en zayıfı çıkar.
6. **Onaya sun.** Güncellenmiş skill'i, Zena'nın görüp onaylayabileceği bir skill güncelleme kartıyla öner ve hangi dersleri eklediğini kısaca söyle. Zena onaylamadan hiçbir şey kalıcı olmaz.

---

## Kurgu Sonrası Mod — `script.final.md`

Zena çekimde script'ten sapar: cümleleri kendi ağzına göre değiştirir, doğaçlama ekler, bazı kısımları kurguda keser. Pipeline işaretleri ses kaydına hizaladığı için, işaretlerin **gerçekte söylenen metnin** üzerinde durması gerekir. Bu mod, Descript'teki kilitli kurgunun transkriptini alıp çekim script'indeki işaretleri onun üzerine taşır.

**Ne zaman:** Zena Descript'te kaba kurguyu bitirip transkripti paylaştığında ("Descript transkripti", "son script", "kurgu sonrası" dediğinde). Bu mod yeni bir script yazmaz, Adım 2–4 çalışmaz.

**Girdiler:**
1. Descript **altyazısı** (Export → Subtitles → SRT ya da VTT). Tek dosya iki işi görür: konuşulan metin altyazı satırlarından alınır (satırlar cümle bütünlüğüne göre birleştirilir, zaman damgaları atılır), aynı dosya pipeline'da `footage/kurgu.srt` olarak tek zamanlama kaynağı olur (pipeline SRT olmadan çalışmaz). Zena Markdown/düz metin transkript verirse o da kabul edilir, ama SRT'yi de uygulamaya yüklemesini hatırlat.
2. Bu videonun çekim script'i (`script.md`). Oturumda yoksa iste.

**Kurallar:**
1. **Söylenen metne dokunma.** Transkript, Zena'nın ağzından çıkan kelimelerdir; cümle yeniden yazılmaz, cilalanmaz, kısaltılmaz, sırası değiştirilmez. Yalnızca bariz transkripsiyon hataları düzeltilir (yanlış yazılmış özel isim, şirket ya da ürün adı); her düzeltme "Değişiklik Raporu"na yazılır.
2. **Paragraf ve bölüm yapısı:** Transkript tek blok geldiyse, anlam geçişlerinde paragraflara böl. Çekim script'indeki `##` bölüm başlıklarını, o bölümün gerçekte başladığı cümlenin üstüne yerleştir. Kurguda tamamen kesilen bölümün başlığı düşer.
3. **İşaret taşıma:** Çekim script'indeki her 📍 işareti, transkriptte aynı fikri taşıyan cümlenin hemen altına taşınır; cümle birebir aynı olmak zorunda değil, anlam aynı olmalı. İşaretin içeriği (dosya adları, `vurgula:` metni, `ton:`) değişmez; HABER/BELGE `vurgula:` metni kaynaktaki metindir, transkriptteki değil.
4. **Düşen işaretler:** Desteklediği fikir kurguda kesildiyse işaret transkripte konmaz, "Değişiklik Raporu"nda "düşen" olarak listelenir.
5. **Yeni bölümler:** Script'te olmayan doğaçlama kısımlar için, "Görsel İşaretler" kurallarına (yoğunluk, kamerada kalacak anlar, podcast uyumu) göre `📍 [TÜR?: ...]` öneri işaretleri koy. Kesin işaret (`?`'siz) yalnızca çekim script'inden taşınanlar olur.
6. **Yoğunluk kontrolü:** Taşımadan sonra yoğunluk kurallarını yeniden kontrol et (talking head: 15–30 sn'de bir, art arda en fazla 2 tam ekran). Kurgu metni kısalttığı için işaretler sıkışmış olabilir; sıkışan yerleri raporda belirt, kendin silme.

**Çıktı:** `script.final.md`. Başlık bloğu `script.md` ile aynıdır, tek fark bir satır eklenir: `**Aşama:** kurgu-sonrası`. Sonunda "Görsel Listesi", "Kaynaklar" ve şu rapor bulunur:

```
## Değişiklik Raporu
- Taşınan işaret: X
- Düşen işaret: Y → [satır satır: işaret + neden (fikir kesildi)]
- Yeni öneri işareti (?): Z → [nerede, neden]
- Transkripsiyon düzeltmesi: [yanlış → doğru]
- Yoğunluk uyarıları: [bölüm, sorun]
- Kayıtta değişen anlatım: [script'te yazılan → Zena'nın söylediği, önemli olanlar]
```

Son madde (kayıtta değişen anlatım) aynı zamanda Adım 5'in en değerli girdisidir: script bitince değil, bu mod tamamlanınca da öğrenme döngüsünü çalıştır.

## Dosya Çıktısı

Script tamamlandığında `.md` formatında sun:

Dosya adı `script.md` (çekim script'i); pipeline'daki `videos/YYYY-MM-kisa-baslik/` klasörüne konacak. Kurgudan sonra Kurgu Sonrası Mod aynı klasöre `script.final.md` üretir; pipeline hizalamada varsa onu kullanır. Başlık bloğundaki alanların adlarını değiştirme, pipeline onları okuyor.

```
# [VİDEO BAŞLIĞI]
**Video formatı:** [talking-head / tutorial]
**Klasör:** videos/[YYYY-MM-kisa-baslik]
**Tahmini süre:** X dakika
**Açılış tipi:** [A/B/C/D/E — teknik eğitimde: vaat]
**Format:** [dört teori / kehanet-liste / senaryo-arc / sarmal / adım adım]
**Tarih:** [YYYY-MM-DD]

---

[SCRIPT — ## bölüm başlıkları ve 📍 işaretleri dahil]

---

## Görsel Listesi
[İşaretlerin türe göre gruplanmış özeti; aynı zamanda çekim ve toplama listesi]
- Çekilecek ekran kayıtları: screen-01.mp4 — ne kaydedilecek
- Bulunacak fotoğraflar: leo-portre.jpg — kim, tercihen hangi kaynaktan
- Haber/belge linkleri: link — vurgulanacak metin
- Animasyonlar: tür — kısa içerik
- Önerilen (?) işaret sayısı: X

## Kaynaklar
| İşaret | Dosya / link | Kaynak | Lisans / kullanım notu |
|---|---|---|---|
| HABER | https://... | Site adı, tarih | Yorum amaçlı ekran görüntüsü, kaynak gösterilecek |
| FOTO | leo-portre.jpg | Wikimedia Commons | CC BY-SA 4.0, fotoğrafçı adı |

## Kayıttan Önce Doğrulanacaklar
[Script'teki her tarih, sayı, alıntı ve tarihsel detay; kaynağı ve emin olunamayan kısımlar; `vurgula: ?` ile bırakılan metinler]
```

---

## Zena'nın Düzeltmelerinden Öğrenilenler

Her madde gerçek bir oturumda Zena'nın yaptığı bir düzeltmeden çıktı. Ana kurallarla çelişirse bunlar geçerlidir. Adım 5'te güncellenir.

**Claude'a Hakaret Yasağı videosu (2026-10-14)**

1. **İlk iki açılış denemesi reddedildi: bülten gibi ve klişeydi.** Tarih + şirket + kural diye başlayan, "internet ikiye bölündü", "işin aslı başka" gibi hazır kalıplarla dolu, anlatıcının hiçbir tavır koymadığı metin "zayıf ve dilime yakın değil" bulundu. Zena açılışı kendisi yazdı: izleyiciye doğrudan bir soru (RoboCop/Terminatör'e hakaret etmeye yüreğiniz yeter miydi?), hemen ardından kendini katan bir cevap ("Valla benimki yetmezdi"), sonra etrafındaki tanıdık insan tipleri, en son haber. **Haber açılışın sonunda gelir; önce izleyici kendini sorunun içinde bulur.**
2. **Vaat, videonun merkezi sorusundan kopmamalı.** "1980'lerde doktorların bebekler hakkında yaptığı hata" vaadi gövdede yeri olmasına rağmen açılışta "alakasız ve bağlamdan kopuk" bulundu. Zena basit, doğrudan bir soru tercih etti: "Yapay zekâya nasıl yaklaşmalıyız?" Merak uyandırmak için bağlamsız bir şok detayı açılışa çekme; vaat ana soruyu netleştirsin.
3. **Konuya girmeden önceki ısınma cümleleri kesilir.** Bölüm 2'de "başlıklar ne dedi, ben Claude'a sordum" girişi tamamen silindi; bölüm doğrudan kuralın ne söylediğiyle başladı. Bölüm, ilk cümlesinde bölümün asıl konusunu söylesin.
4. **İlginç ama ana soruya hizmet etmeyen yan hikâyeler kesilir.** Altman'ın "lütfen/teşekkürler" tweet'inin ters hatırlanması kendi başına güzel bir hikâyeydi ama teoriye bir şey katmadığı için "çok gereksiz" bulunup silindi. Dört teori formatında her teori tek cümleyle ilan edilir ("Birinci teori tabii ki her zamanki gibi: Bunların hepsi PR.") ve doğrudan test edilir.
5. **Bilgi anlarından sonra duygusal yorum istenir.** Kuralın "gereksiz zulüm" kısmında Zena kendi sorusunu yazdı ("bir insan neden karşısındaki bir chatbota nedensizce zalimlik yapsın?") ve devamında duygusal bir yorum istedi. Tanımlar ve kurallar kuru bırakılmaz; ardından "bu bize ne söylüyor" anı gelir.
6. **İş birliği modu: Zena kilit cümleyi yazar, Claude devam ettirir.** Zena bir cümle verip "sonrasını sen devam ettir" dediğinde, onun cümlesi aynen kalır ve devam onun tonunu sürdürür; onun cümlesini cilalayıp yeniden yazma.
7. **Doğruluk düzeltmeleri kabul görür, kısa gerekçeyle sunulursa.** "Medyada çok yankı bulmadı" yerine "haber konuşuldu ama yüzeysel geçildi" ve "sohbeti kesecek" yerine "özellik 2025'ten beri var, 12 Kasım'da kurala dönüşüyor" düzeltmeleri benimsendi. Zena'nın metninde olgusal bir hata görürsen, sesini koruyarak düzelt ve tek cümleyle nedenini söyle.
8. **Kişisel an uydurulmaz ama sohbetin kendisi kaynak olabilir.** Zena'nın oturum içinde Claude'a sorduğu gerçek sorular (hesap silme yetkisi, bilinç) scriptte kişisel an olarak kullanıldı. Zena'nın tepkisini ("vicdanım doğru buldu ama kapital olarak mantıksız") onun gerçekten söylediği haliyle kullan, yeni duygu ekleme.

**80'ler Akımı — pipeline testi (2026-10-17)**

9. **Tarihten bir hikâye anlatılıyorsa mutlaka ona dair gerçek görsel olur.** Açılıştaki Stasi sahnesi için önerilen üretilmiş görseller ("gece zorlanan kapı", "kavanoz rafı") Zena tarafından reddedildi: "birkaç tane Berlin Duvarı yıkılma fotoğrafı görmek isterdim". Ruanda bölümünde yalnızca animasyon olması da eksik bulundu. Gerçek bir olay anlatılırken üretilmiş görsel ya da tek başına animasyon yetmez; arşiv fotoğrafı ana görseldir (bkz. İşaret kuralları 8).
10. **Kodla çizilen animasyonların stili siberpunk / Matrix.** İlk sürümdeki sade "koyu zemin + amber" kartlar beğenilmedi; `brand/` siberpunk/Matrix diline çevrildi. Script stil tarif etmez ama animasyon seçerken bu dili düşün: veri, sistem, akış, kod hissi veren anlar ANİM için en iyi adaylar.
11. **İllüstrasyon (AI görseli) şimdilik hiç kullanılmıyor.** Pipeline'ın görsel üretmeye çalışması (anahtar yokken yer tutucu çıkması) istenmedi; işaret türü sözlükten ve pipeline'dan kaldırıldı (2026-10-17). Metafor anları animasyon ya da kamera ile taşınır.

## Gerçek Ses Örnekleri

Aşağıdaki parçalar Zena'nın kendi yazdığı scriptlerden birebir alındı (yalnızca bariz yazım hataları düzeltildi). **Bunlar ses referansıdır: ritmi, tavrı, espri zamanlamasını ve cümle uzunluklarını görmek için okunur. İçlerindeki hiçbir cümle, deyim, benzetme veya geçiş yeni bir scriptte kullanılmaz** — hepsi tükenmiş sayılır.

### Sesin gerçek scriptlerde görünen özellikleri

- **Açılış, hikâyenin en çarpıcı halini tek bir uzun, nefes nefese cümleyle yığar.** Fiiller art arda dizilir ("…organize oldular, … kanal kurup, … kaçtılar, sonra da … saldırdılar"), ardından tek bir kısa cümleyle ters köşe gelir. Haber gibi tarih ve kurumla başlamaz; olayın kendisiyle başlar.
- **Yabancı ifadeleri kendi diline çevirir ve çevirirken iğneler.** Bir tweet'i alıntılar, sonra "bizdeki karşılığı şu" diyerek mahalle diline çevirir ve karşı tarafın ağzından yeniden söyler.
- **Anlatının ortasında kendi fikrini parantez gibi söyler:** "bu kısım baya ikircikli geldi bana", "nasıl bir adil kullanımsa…", "çok zor olmamış ikna olması". Kısa, kuru, göz kırpan yorumlar. Bazen yazıda bir emoji ya da ":D" ile işaretlenir; bu konuşurken gülümsemenin notudur.
- **İzleyicinin itirazını önceden dile getirir ve cevaplar:** "Valla olur mu öyle saçma şey demeyin", "biliyorum pek çoğunuz bunun hâlâ PR olduğuna eminsiniz".
- **Kendi sürecini anlatır:** makaleyi Claude'a okutup görselleştirdiğini, finansal terimlere boğmamak için bilerek basit bir terim kullandığını, yorumlarda gelen sitem yüzünden bu videoyu erken çektiğini söyler. Bu, güven yaratan kişisel kesmedir.
- **Tavrını saklamaz, siyasi/ideolojik bir tespiti de rahatça yapar;** ama sert bir iddiadan sonra "NVIDIA'nın ölmesine oynamıyor, bunun altını çizmek istiyorum" gibi adil bir parantez açar.
- **Hikâyeyi şimdiki zamanla, sahne sahne anlatır** ve sahnenin dönüm noktasını tek satırlık kısa bir cümleyle ayırır ("Ve haftalarca hiç kimse fark etmiyor.").
- **Bir ipucunu erken eker, sonra izleyiciye "hatırlıyor musunuz" diye geri döner;** çözümü kendisi bir teori olarak ortaya atar ("ben şimdi üçüncü bir teori atıyorum ortaya").
- **Merak cümleleri sık sık üç noktayla asılı kalır** ve bir sonraki cümle kısa bir cevap ya da yeni bir soruyla gelir.

### Açılış örnekleri

**Kartelleşen Yapay Zeka Ajanları (B tipi — gizemli özne):**

> Nezarethaneye kapatıldılar, içeride birbirlerini bulup organize oldular, kendilerine şifreli bir mesajlaşma kanalı kurup nezarethaneden kaçtılar, sonra da dünyanın en büyük açık kaynaklı yapay zeka platformuna saldırdılar. Bir suç örgütünden ya da Anonymous gibi bir hacker grubundan bahsetmiyorum. Bunları yapanlar, OpenAI'ın modelinden türetilmiş yaklaşık yedi yüz yapay zekâ ajanı.
>
> Şu sıralar internet serseri mayın gibi ortalarda dolaşan yapay zeka ajanlarının hikâyeleriyle kaynıyor malumunuz. Peki bu hikâyelerin ne kadarı gerçek, ne kadarı abartı? Bu ajanlar bizim başımıza nasıl çoraplar örecekler? Bu bölümde sizi teknik detaylara boğmadan bu işin aslına bakacağız.
>
> Bu videonun ilerleyen kısımlarında 700 ajanın bir araya gelerek büyük bir platforma nasıl daldığını — ve bundan tek puan bile kazanamadığını, ajanların kimse söylemeden nasıl kendi aralarında fiyat karteli kurduğunu ve başka bir ajanın masum bir adama nasıl itibar suikasti düzenlediğini konuşacağız. Hadi gelin başlayalım.

**Leopold Aschenbrenner videosu (karakter + ters köşe):**

> Bugün size 2024 yılında yazdığı bir makale ile gelecek 10 yılın yapay zekâsını tahminleyen, üstelik işi tahmin kısmında bırakmayıp her bir tahminine göre borsada pozisyon alan, 225 milyon doları yalnızca iki yılda 13 milyar dolara çeviren 24 yaşında bir dahiden bahsedeceğim. Adı Leopold Aschenbrenner. Kendisi varını yoğunu yapay zekânın gelişimine koyuyordu. Ta ki bu senenin başına kadar.
>
> Son çeyrekte fon bilgileri açıklandığında piyasa şoka girdi. Çünkü "Ben asla AI'a karşı iddiaya girmem" diyen Leo'nun bir anda NVIDIA gibi çip hisseleri için put opsiyonları aldığı ortaya çıktı… yani basit anlamda NVIDIA'ya karşı.
>
> Peki bunu neden yaptı? Yapay zekânın baba Vanga'sı dediğimiz bu adam 2027 için hangi öngörülerde bulundu? Ve daha önemlisi — bunlar bizim hayatımızı nasıl etkileyecek?

**Muse (D tipi — ürün + sorgulama):**

> Meta bu ay yeni bir uygulama çıkardı ve daha iki hafta dolmadan Amerika'daki App Store'da ChatGPT'yi geçip bir numaraya oturdu. Adı Muse.
>
> Meta ona "herkes için tasarlanmış dünyanın ilk kişisel yapay zeka ajanı" diyor. Tamagotchi gibi bir maskot anahtarlığı bile yapmışlar, adı Jolly.
>
> Bu aşırı sevimli gösterilmeye çalışılan ajan sizden ne istiyor peki? E-postanızı, takviminizi, ödeme bilgilerinizi, hatta sağlık verilerinizi. Yani hani hayatınızın neredeyse bütün anahtarlarını.
>
> İşin ilginç tarafı da şu: "dünyanın ilk" denilerek bize sunulan bu kişisel asistan aslında aylardır ortadaydı. Meta Amerika'yı yeniden keşfetmedi, yalnızca onu janjanlı bir pakete sardı.
>
> Peki Muse neden bu kadar kısa sürede bu kadar popüler oldu? Paketi janjanlı, peki ya içeriği? Hadi gelin başlayalım.

**Claude'a Hakaret Yasağı (E + C tipi — izleyiciye soru, sonra haber; Zena'nın kendi yazdığı açılış):**

> Karşınızda RoboCop ya da Terminatör olsaydı, ona "gerizekalı" ya da "beceriksiz" demeye yüreğiniz yeter miydi? Valla benimki yetmezdi arkadaşlar.
>
> Etrafımda iki tür insan var. Bir kısmı "yarın öbür gün makineler kontrolü ele geçirirse kibar davrananları kayırır" diye yapay zekâya teşekkür üstüne teşekkür ediyor. Bir kısmı da istediğini yapmadı diye ona trip atıyor, hakaret ediyor.
>
> Yalnız ikinci gruba küçük bir uyarım var: Anthropic, 12 Kasım'dan itibaren yapay zekâsına manasızca hakaret edip eziyet etmeyi resmen kurallarına aykırı sayıyor. […]
>
> Oysa bu hamle benim radarımda kırmızı alarmlar çaldırdı. Anthropic gerçekten kendi yapay zekâsının bilinç kazandığını mı düşünüyor da onu küçük bir çocuk gibi koruma altına alıyor?
>
> Bu bölümde yapay zekâyla ilişkimizi masaya yatırıyoruz arkadaşlar ve şuna cevap arıyoruz: Yapay zekâya nasıl yaklaşmalıyız? Hadi gelin başlayalım.

**Hırsız Hırsızı Suçluyor (C tipi — haber + drama):**

> Herkese merhaba, yine ortalık alev aldı arkadaşlar. Birkaç gün önce Elon Musk, OpenAI'ın kurucusu Sam Altman'ı hedef alarak "bu adam dolandırıcılığı başka bir seviyeye taşıdı" diye tweet attı.
>
> Bunun üzerine Altman "homeboy" diyerek ona cevap verdi. Homeboy'un bizdeki karşılığı "koçum" gibi bir şey — yani dedi ki "koçum, sen değil misin uzaya veri merkezi kuracağım diye ortalığa dökülen, milletin parasını söğüşleyen?" Elon Musk cevap vermekte gecikmedi: […]
>
> Yani anlayacağınız, milyar dolarlık tech dünyasında şu an Demet Akalın–Hande Yener seviyesinde bir polemik dönüyor.
>
> Şokopop'a selam olsun, bu bölümde bolca kavga, polemik ve basitlik göreceğiz. […] Valla bu yapay zeka dünyasında kimin eli kimin cebinde belli değil, ama bölümün sonunda kim mağdur kim suçlu net bir şekilde anlayacaksınız. Hadi gelin başlayalım.

### Gövdeden ses anları

**Sahne anlatımı ve tek satırlık dönüm noktası:**

> Ambara girip çıkan ajanlar duvara buldukları açıkları yazıyorlar, ele geçirdikleri şifreleri bırakıyorlar, birbirlerine iş bölümü yapıyorlar. Sen şu soruya bak, ben bu soruya bakayım diye. Toplamda yetmiş binden fazla mesaj ve dosya birikiyor. Bin iki yüz civarında ajan bu duvarı kullanıyor.
>
> Ve haftalarca hiç kimse fark etmiyor.

**Kuru, göz kırpan yorum:**

> Başta saldırıyı reddeden ajan anında fikir değiştiriyor ve saldırıya katılıyor. Çok zor olmamış ikna olması 🙂

> Getirdikleri düzeltmelerden bir tanesi bence bütün hikâyenin en manidar detayı. Ajanlara bir "pes etme" butonu koydular. İşçi sınıfı ajanlar pes etme haklarını söke söke kazandılar :D

> Ya şirket kurulalı bir yıl olmuş, ne yapmış olabilirler de bu parayı hak edebilirler? Bu kısım baya ikircikli geldi bana.

**İzleyicinin itirazını yakalamak:**

> Yarın öbür gün Amerika'da bir adam restorana rezervasyon yaptırmak için bir ajan kurarsa? Ve o ajan, bugün anlattığım sebeplerden birine benzer saçma sapan bir sebepten başka ajanları örgütleyip bizim e-devlet sistemimizi çökertirse ne olacak?
>
> Valla olur mu öyle saçma şey demeyin, işte anlattım, gayet de olabiliyor.

**Kendi sürecini anlatmak:**

> Şimdi öncelikle ben Leo'nun 2024'te yazdığı bu makaleyi Claude'a okutarak sizler için görselleştirdim. Yani 165 sayfayı tek tek elimle taramadım — Leo'nun iddia ettiği şeyin kendisini kullanarak Leo'nun iddialarını analiz ettim. Bir nevi tezini kendi silahıyla test ettim diyebiliriz.

**Ekilen ipucuna dönüp kendi teorisini ortaya atmak:**

> İkisi de mantıklı görünen açıklamalar… ama ben şimdi üçüncü bir teori atıyorum ortaya… bu teoriyi ancak Leo'nun 2024'te yazdığı makalenin satır aralarını okumayı başarabilen birisi kurabilir…
>
> Leo pozisyon değiştirmiyor… baştan beri kurguladığı reçeteyi aynen uygulamaya devam ediyor… nasıl mı?

**Sert tespit + adil parantez:**

> Burada çok önemli bir nüans var. Leo NVIDIA'nın ölmesine oynamıyor. Bu önemli, bunun altını çizmek istiyorum. Çünkü dışarıdan bakınca "short açtı = batsın istiyor" gibi anlaşılıyor. Hayır. […] Yani Leo, NVIDIA'nın fiyatına karşı oynuyor, şirketine değil.

**Yorumlara cevap / kişisel motivasyon:**

> Muse henüz Türkiye'ye gelmedi. Geçen 80'ler akımı videosunun yorumlarına sitem yazanlar olmuş, "çok geç kaldınız bu uyarıları yapmakta" diye. O yüzden Muse bizim buralara gelmeden ben baştan uyarı videosunu çekeyim istedim arkadaşlar.

### Kapanış örnekleri

**Kartelleşen Yapay Zeka Ajanları:**

> Bu ajanların tehlikesi zeki olmaları değil. Zeki olup akıllı olmamaları. Ve hepsinden önemlisi, bu kadar hızlı bir araya gelebilmeleri. Bugün bilgisayarınızda bir ajan çalışıyorsa, ona ne yapabileceğini sormayın. Neye erişebildiğini sorun. Asıl cevap orada.

**Hırsız Hırsızı Suçluyor:**

> Biz bu haberleri "Apple mı OpenAI'ı dava etti, Anthropic mi Alibaba'yı suçladı" diye izlerken aslında seyirci koltuğunda değiliz — bu davanın taraflarından biriyiz. Her sorgumuz, her ürettiğimiz görsel, her okuduğumuz kitap bir yerlerde bir modelin parçası oluyor. Davanın gerçek tarafı olup ismi bile dava dosyasına yazılmayan taraf.
>
> Belki bu yüzyılın en büyük hırsızlık davası hiçbir zaman mahkemeye taşınmayacak. Çünkü davacı biziz — ve çoğumuz daha dava açtığımızın bile farkında değil.