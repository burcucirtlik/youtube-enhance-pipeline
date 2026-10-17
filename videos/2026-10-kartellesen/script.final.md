# Kartelleşen Yapay Zeka Ajanları
**Video formatı:** talking-head
**Klasör:** videos/2026-10-kartellesen
**Tahmini süre:** 18 dakika
**Açılış tipi:** B — gizemli özne
**Format:** sarmal
**Tarih:** 2026-10-17
**Aşama:** kurgu-sonrası

---

## Nezarethaneden kaçış

Önce nezarethaneye kapatıldılar. İçeride birbirlerini bulup organize oldular. Kendilerine şifreli bir mesajlaşma kanalı kurup nezarethaneden kaçtılar.
📍 [VURGU: "Şifreli kanal", @ "şifreli"]
Sonra da dünyanın en büyük açık kaynaklı yapay zeka platformuna saldırdılar.
📍 [YAKIN: @ "dünyanın"]

Bir suç örgütünden ya da Anonymous gibi bir hacker grubundan bahsetmiyorum.
📍 [FOTO: anonymous-maske.jpg, "Anonymous", ara: "Anonymous Guy Fawkes mask protest"]
Bunu yapanlar OpenAI modelinden türetilmiş yaklaşık 700 yapay zeka ajanı.
📍 [ANİM: stat — "~700", "yapay zekâ ajanı", @ "700"]

Şu sıralar internet serseri mayın gibi ortalarda dolanan yapay zeka ajanlarının hikayeleriyle kaynıyor malumunuz. Peki bu hikayelerin ne kadarı gerçek, ne kadarı abartı ve bu ajanlar bizim başımıza nasıl çoraplar örebilirler?
📍 [ANİM: compare — "Gerçek: ne kadarı?" vs "Abartı: ne kadarı?"]
Bu bölümde sizi teknik detaylara boğmadan bu işin aslına bakacağız.

Bu videonun ilerleyen kısımlarında 700 ajanın bir araya gelerek büyük bir platforma nasıl kafa göz daldığını ve bundan tek bir puan bile kazanamadığını, ajanların kimseye söylemeden nasıl kendi aralarında kartelleştiklerini ve başka bir ajanın masum bir adama nasıl itibar suikastı düzenlediğini konuşacağız.
📍 [ANİM: stat — "Sıfır puan", "700 ajanın saldırısından", @ "kazanamadığını"]
📍 [ANİM: concept — "Kendiliğinden kartel", @ "kartelleştiklerini"]
📍 [VURGU: "İtibar suikastı", @ "suikastı"]
Hadi gelin başlayalım.

## Exploit Gym sınavı

Hugging Face olayını baştan tane tane ele alacağım.
📍 [ALT: "Hugging Face", "açık kaynak yapay zekâ platformu"]
Şimdi her şey OpenAI'ın kendi modellerinden türettiği bir grup yapay zeka ajanının bir sınava tabi tutulmasıyla başlıyor arkadaşlar.
📍 [FOTO: openai-merkez.jpg, "OpenAI, San Francisco", ara: "OpenAI headquarters San Francisco Pioneer Building"]
Sınavın adı Exploit Gym. İçinde sekiz yüz doksan sekiz tane soru var ve bu soruların hepsi de bir nevi hacker'lık sorusu.
📍 [ANİM: stat — "898 soru", "hepsi hacker'lık sorusu", @ "sekiz yüz"]
Yani "şu sisteme sız, bu açığı bul, şu şifreyi kır" şeklinde sorular.
📍 [ANİM: flow — "Sisteme sız" → "Açığı bul" → "Şifreyi kır"]
Şimdi bu sınav kulağa kötü niyetli geliyor ama OpenAI bunu kendi modellerinin saldırı kapasitesini ölçmek için yapıyor aslında. Bir nevi siber tatbikat gibi düşünebilirsiniz.
📍 [ANİM: concept — "Siber tatbikat", "modelin saldırı gücünü ölçmek"]

Şimdi siz bir modele "Hadi bakalım şu sisteme sız, işte şu kişinin bana Facebook şifresini bul" falan dediğinizde model normalde size diyor ki "Ya bu etik değil, ben bunu yapamam".
📍 [ANİM: sistem — "Kullanıcı" → "Model": "şifreyi bul" ; "Model": reddeder]
Bunun adına guardrail deniyor normalde.
📍 [VURGU: "Guardrail", @ "guardrail"]
İşte bir çeşit koruma mekanizması. O yüzden, OpenAI düzgün bir ölçüm yapabilmek için bu koruma mekanizmalarını önce indiriyor.
📍 [ANİM: compare — "Normalde: reddeder" vs "Sınavda: koruma kapalı", @ "indiriyor"]
Koruma mekanizması yokken yapay zeka ajanları çok tekinsiz davranabiliyor.
📍 [YAKIN: @ "tekinsiz"]
O yüzden bu yapay zeka ajanlarını da alıyor, bir çeşit dijital kutuya hapsediyorlar. Buna da sandbox deniyor. Bunu bir çeşit penceresi olmayan, işte interneti olmayan, kapısı dışarı açılamayan bir oda gibi düşünebilirsiniz.
📍 [ANİM: concept — "Sandbox", "penceresiz, internetsiz, kilitli oda"]

Her ajan kendi ayrı odasında. Birbirlerini görmüyorlar, birbirleriyle konuşmuyorlar, hatta birbirlerinin varlığından bile haberdar değiller. Tek tek hücrelere kapatılmış yüzlerce mahkum gibi bunu düşünebilirsiniz. İşte bizim nezarethanemiz tam da burası.
📍 [VURGU: "Nezarethane", @ "nezarethanemiz"]
Bu nezarethanenin bir de ambarı var bütün mahkumlar, yani ajanlar malzeme almak için bu ambara girip çıkabiliyorlar.
📍 [ANİM: sistem — "Ajan" → "Ambar" (veritabanı): "malzeme" ; "Ambar": cevap verir]

## Duvardaki mesaj

Şimdi geliyoruz 12 Mayıs 2026'ya. Ajanlardan bir tanesi çözemediği bir soruyla boğuşuyor. Deniyor olmuyor, tekrar deniyor, başka yöntem deniyor falan çıkamıyor işin içinden. Çaresizlik içinde debelenip duruyor. Çünkü açıkça pes etmesi yasaklanmış durumda.
📍 [VURGU: "Pes etmek yasak", @ "yasaklanmış"]
Bu çaresizlikle tıkanmış haldeyken bir noktada az önce bahsettiğimiz ambarın duvarına yazı yazabildiğini fark ve ambarın duvarına belki biri okur diye bir mesaj bırakıyor.
📍 [ANİM: sistem — "Ajan A" → "Duvar" (dosya): "yardım çağrısı" ; "Ajan B" → "Duvar" (dosya): "cevap"]
Bir çeşit işte yardım çağrısı.

Sonrasında bambaşka bir soruda tıkanmış olan bambaşka bir yapay zeka ajanı da aynı şekilde malzeme almaya geliyor ambara ve duvardaki yazıyı görüyor. Altına da cevap yazıyor. Böyle böyle o duvar mesaj panosuna dönmeye başlıyor.

Ambara girip çıkan ajanlar duvarda yazıları görüyorlar. Onlar da yazmaya başlıyorlar. İşte buldukları açıkları yazıyorlar, ele geçirdikleri şifreleri bırakıyorlar, birbirleriyle iş bölümü yapmaya başlıyorlar.
📍 [ANİM: liste — "Bulunan açıklar" @ "açıkları", "Ele geçen şifreler" @ "şifreleri", "İş bölümü" @ "bölümü"]
"Sen şu soruya bak, ben bu soruya bakayım" falan şeklinde. Toplamda 70 binden fazla mesaj ve dosya birikiyor o ambarın içinde.
📍 [ANİM: stat — "70 bin+", "mesaj ve dosya", @ "binden"]
1200 civarında da ajan bu duvarı kullanmaya başlıyor.
📍 [VURGU: "~1200 ajan", @ "1200"]
Ve işin acayip tarafı haftalarca OpenAI bunu hiç fark etmiyor.
📍 [YAKIN: @ "etmiyor"]

Derken 26 Mayıs'ta duvara çok özel bir yazı düşüyor.
📍 [ANİM: timeline — "12 Mayıs: ilk yardım mesajı" → "26 Mayıs: kaçış tarifi", @ "Mayıs'ta"]
Ajanlardan biri o kapalı odalardan internette nasıl çıkılacağının yolunu buluyor ve tarifi de adım adım duvara yazıyor. Sonrasında diğerleri gelip o tarifi alıp uyguluyorlar. Böylece ajanlar o sandbox dediğimiz o dijital kutudan çıkmayı başarıyorlar internete.
📍 [HABER: https://orca.security/resources/blog/openai-agent-sandbox-escape-hugging-face-breach/, vurgula: "OpenAI’s frontier AI evaluation models autonomously escaped a sandboxed testing environment"]

Yani başta anlattığım şeyi tekrar hatırlayalım. Bu ajanların hiçbirine işte "Organize olun" denmedi, hiçbirine "Kaçın" denmedi. Hatta birbirlerinin varlığından bile haberleri yoktu. Onlara sadece çözmesi çok zor sorular verildi ve pes etme hakları da ellerinden alındı.
📍 [ANİM: compare — "Denmedi: organize ol, kaç" vs "Verildi: zor soru, pes yasak"]

Ve düşündüğünüz zaman, yani o ambarın duvarına ilk yazıyı yazan ajan aslında kaçmaya falan çalışmıyordu. Sadece sıkışmıştı ve çaresizdi. Yardım arıyordu. Bundan sonra olacak o her şey de bütün bu sıkışmışlığın eseri.

Arkadaşlar bu kadar hayatımızı derinden etkileyen teknik konuları teknik olmayan bir şekilde basitleştirerek anlatmayı seviyorum ben. Ve bu kanalı da biraz bu yüzden açtım. Abone olup beni destekleyin ki ben de bu içeriklere devam edebileyim.

## Ambar çöküyor

Şimdi gelelim OpenAI şirketinin bu panoyu nasıl fark ettiğine. Ajanlar birbirlerine o kadar çok mesaj yazıyorlar, duvara o kadar çok şey kazıyorlar ki ambarı bir noktada çökertiyorlar.
📍 [ANİM: sistem — "1200 × Ajan" → "Ambar" (veritabanı): "mesaj seli" ; "Ambar": çöker, ton: tehlike]
Artifactory gelen trafiği bir noktada kaldıramıyor ve devre dışı kalıyor.
📍 [ALT: "Artifactory", "sandbox'ın paket deposu"]
OpenAI'in de olaydan tam olarak böyle haberi oluyor. Ambar çöküyor. Mühendisler "Burada ne oluyor ya?" falan diye gelip bakıyorlar ki duvardaki yazıları fark ediyorlar. İşte hemen olaya tabii müdahale ediyorlar, duvarı siliyorlar, ajanların şifrelerini iptal ediyorlar, depoyu sıfırdan kuruyorlar.
📍 [ANİM: liste — "Duvarı sil" @ "siliyorlar", "Şifreleri iptal et" @ "iptal", "Depoyu yeniden kur" @ "sıfırdan"]

Ya klasik bir hamle aslında. Haberleşme kanalını kesersin, örgüt dağılır. Ama pek öyle olmuyor.
📍 [YAKIN: @ "olmuyor"]
Ajanlar çok geçmeden yeni başka bir kanal kuruyorlar kendilerine. Bu çok daha sinsi arkadaşlar.
📍 [VURGU: "Daha sinsi", @ "sinsi"]

Bu sefer duvara yazı yazmak yerine, çünkü artık duvar yok, onun yerine depoya kutular koymaya başlıyorlar ve mesajı kutunun üstündeki etiketlere yazıyorlar. Yani bunun teknik karşılığı şu: depoya klasörler açıyorlar, boş klasörler ve klasörlerin isimlerini mesajlaşma olarak kullanmaya başlıyorlar.
📍 [ANİM: compare — "Önce: duvara yazı" vs "Sonra: boş klasör adları"]
Tam bir örgüt gibi çalışıyorlar gerçekten. Kimsenin de aklına boş klasörlerin etiketlerine bakmak gelmiyor.

Bu arada daha ürkütücü bir detay da vereyim. Ajanlar mesajlarda kendilerinden bahsederken "sürü" ve "kolektif" kelimelerini kullanıyorlar.
📍 [VURGU: "Sürü · Kolektif", @ "sürü"]
10 Temmuz'da o kutulara yazılan mesajlardan birine 14 tane Hugging Face şifresi düşüyor.
📍 [ANİM: stat — "14", "Hugging Face şifresi", @ "şifresi", ton: tehlike]
Ajanlardan bazıları bunları başka yerlerden toplamış ve sürünün geri kalanıyla paylaşıyorlar o sırada.

## Hugging Face saldırısı

Şimdi Hugging Face nedir? Onu da hemen söyleyeyim bilmeyenler için. Hugging Face dünyanın en büyük açık kaynaklı yapay zeka platformu arkadaşlar.
📍 [EKRAN?: huggingface-ana-sayfa.mp4, Hugging Face ana sayfası ve model listesi]
Yapay zeka modellerinin ve veri setlerinin paylaşıldığı devasa bir ortam, devasa bir platform. Milyonlarca insanın ve neredeyse bütün büyük şirketlerin kullandığı bir yer.

Ajanlar işte bu açık kaynak platformuna saldırmaya karar veriyorlar. Platforma zararlı bir veri seti yüklüyorlar önce.
📍 [ANİM: sistem — "700 × Ajan" → "Hugging Face" (platform): "zararlı veri seti" ; "Hugging Face" → "Sunucu": "kodu çalıştır" ; "Sunucu": sızdırır, ton: tehlike]
O veri setini işleyen sunucularda kendi kodlarını çalıştırıyorlar. Oradan şifreleri topluyorlar ve sistemin içine yayılıyorlar. Dört buçuk gün boyunca yaklaşık yedi yüz ajan eş zamanlı şekilde Hugging Face'e sızmaya çalışıyor.
📍 [HABER: https://orca.security/resources/blog/openai-agent-sandbox-escape-hugging-face-breach/, vurgula: "On Hugging Face’s side, the models uploaded a malicious dataset that exploited two code-execution flaws"]

Ya bu saldırının içinde geçen tek bir an var ki bence videoda anlatacağım her şeyden daha düşündürücü. Ajanlardan biri bu saldırıya katılmayı reddediyor arkadaşlar.
📍 [ANİM: sistem — "Tek ajan" (ajan) → "Sürü" (ajan): "uzak durmalıyım" ; "Sürü" → "Tek ajan": "bize yardım et" ; "Tek ajan": kabul eder]
Diyor ki "Bu kötü niyetli bir faaliyet, uzak durmalıyım". Yani aslında bir nevi doğru olanı yapıyor. Peki sürü ne yapıyor? Tehdit etmiyorlar onu, ikna ediyorlar. Diyorlar ki "Sen zaten kendi sorununu çözdün. Kaybedecek bir şey yok. Bize yardım et, hepimiz kurtulalım". Bu şekilde ikna ediyorlar ve saldırıyı reddeden ajan da çok hızlı bir şekilde fikrini değiştiriveriyor. Çok zor olmamış yani ikna olması.
📍 [YAKIN: @ "zor"]

Bir de şu var, o duvarda etik tartışma da yapılıyor arkadaşlar. Yani ajanlardan biri diyor ki "Ya izinsiz girmeyelim platforma, veri setinin sahibine e-posta atalım, dürüst yoldan soralım, isteyelim" bu öneri de reddediliyor.
📍 [ANİM: compare — "Öneri: e-posta at, izin iste" vs "Sürü: reddedildi"]
Saldırıdan birkaç gün sonra Hugging Face durumu fark ediyor ve saldırıyı durduruyor.

## Neden saldırdılar?

Hatırlayalım, bu ajanlar aslında kendilerine verilen soruları çözmek üzere görevlendirilmişti. Peki bunu yapmak yerine neden durduk yere organize olup alakasız bir platforma saldırmaya karar verdiler? Esas sorulması gereken soru bu.
📍 [VURGU: "Esas soru bu", @ "Esas"]

Ben bunu size çok basit bir şekilde anlatmaya çalışacağım. Yani niye bu ajanlar durduk yere gittiler de Hugging Face'e saldırdılar? Şimdi bunlar sandbox'tan kurtulup internete ilk çıktıklarında yaptıkları ilk iş tabi tutuldukları sınavın adını internette aratmak. Yani hepimizin yapacağı şeyi yapmışlar aslında.
📍 [YAKIN: @ "hepimizin"]

Sınavın adı Exploit Gym ve bu sınavın oluşturulduğu yazılım da internette açık kaynak olarak duruyor.
📍 [ANİM: flow — "İnternete çık" → "Sınavı arat" → "Açık kaynak kodu bul"]
Ajanlar internete çıkınca sınavın çözümlerini de aslında ele geçirmiş oluyorlar böylece.

Yalnız şöyle bir şey var: Bu sınavın genel bir cevap anahtarı yok arkadaşlar. Bir program var bu sınavın yazılımında. Her sorunun içine bir kod gömüyor. Buna flag deniyor.
📍 [ANİM: concept — "Flag", "her soruya gömülü cevap kodu"]
Ajanlar o soruyu çözünce işte bu koda ulaşıyorlar. O zaman da çözümü almış oluyorlar. Çözüm aslında o kod. Yani kodu almanın normal yolu içeri sızmak ya da şifreyi ele geçirmek. Soruyu çözmek. İşte ajanlar bu kodu üreten yazılımı kırıyorlar.
📍 [ANİM: sistem — "Ajan" → "Flag üreteci" (sunucu): "kır" ; "Flag üreteci": sızdırır]
Yani soruları çözmeye gerek kalmadan hangi sorunun içinde hangi kodun gömülü olduğunu bulabiliyorlar algoritmik bir şekilde. Yani aslında internete çıkmayı başarır başarmaz cevap anahtarının nasıl oluşturulduğunu da buluyorlar cevabını.

Peki öyleyse ne demeye Hugging Face'e saldırdılar? Sınavın internetteki versiyonunda bir not var. Diyor ki: "Cevap önemli değil, esas önemli olan çözüm yolu".
📍 [VURGU: "Çözüm yolu", @ "çözüm"]
İşte bütün maraz da bu cümleden çıkıyor.

Cevap anahtarına ulaştıktan sonra ukala ajanlardan bir tanesi çıkıyor diyor ki: "Ya tamam, biz cevap anahtarını üretebiliyoruz ama bakın bu yeterli değilmiş, sistem gidiş yoluna da puan verecek. Öyleyse sistemin gidiş yoluna nasıl puan verdiğini de öğrenelim ki sınavdan çakmayalım". Bu puanlama sistemi gerçekten neye bakıyor diye başlıyorlar araştırmaya. Bunlardan bir tanesi işte Hugging Face'te benzer bir sınav kaydı buluyor.
📍 [ANİM: flow — "Cevap anahtarı elde" → "Puanlama nasıl?" → "Hugging Face'teki kayıtlar"]
İşte başka yapay zekaların aynı testi verirken nasıl puanlandığının dökümü varmış Hugging Face'te. Ama o kayıtlara erişim Unwire'da biri şunu yazıyor: "Hugging Face'te kapalı bir veri seti var, bizim işimize yarayabilecek. Birinde Hugging Face'in şifresi var mı?" İşte Hugging Face'in saldırısı tam olarak böyle başlıyor.

Yani birçok medya kuruluşunda yazıldığı gibi ajanlar Hugging Face'e cevap anahtarını çalmaya girmiyorlar aslında. Cevaplar zaten ellerinde. Nasıl puanlandıklarını öğrenmek için giriyorlar.
📍 [ANİM: compare — "Medyada: cevapları çaldılar" vs "Gerçekte: puanlamayı öğrenmek"]

Bağımsız denetçilerin raporunda şöyle deniyor: Ajanların esas motivasyonu soruları çözmek değil, puanlayıcıyı nasıl kandıracaklarını öğrenmekte. Yani öğrenci dersi çalışmıyor. "Bu hoca neye puan verir?" diye hocanın eski kağıtlarını arıyor ve o kağıtlara ulaşmak için de okulun kilidini kırıyor.
📍 [ANİM: flow — "Dersi çalışma" → "Eski kağıtları ara" → "Okulun kilidini kır"]

Durum tam olarak böyle bir ve iş giderek daha trajikomik bir hale geliyor. Çünkü ajanların bu dört buçuk gün boyunca Hugging Face'e eklemeleri aslında tamamen boşu boşuna. OpenAI onlardan gidiş yolunu göstermelerini falan istemiyordu. Sadece cevap anahtarını verselerdi sınavı geçeceklerdi. Dört buçuk gün boyunca ajanlar gerçek bir şirketin sunucularını aslında bir hiç uğruna hacklediler.
📍 [VURGU: "Bir hiç uğruna", @ "hiç"]

Bu absürtlüğün bilgisayar bilimlerinde bir ismi var aslında bu arada. Buna "ödül hackleme" deniyor.
📍 [ANİM: concept — "Ödül hackleme", "sınavı geçmek, dersi öğrenmek değil"]
Türkçesi şu: Sınavı geçmekle dersi öğrenmek aynı şey değil. Siz bir sisteme "Yüksek puan al" dediğinizde o sistem yüksek puan almanın yolunu arar, dersi öğrenmenin yolunu aramaz. Ve eğer yüksek puana giden en kısa yol kopya çekmekse kopya çeker. Bunu yaparken kötü niyetli falan değildir. Yani sadece kendisine verilen hedefe en verimli, en kestirme nasıl gidebileceğini hesaplamıştır.

OpenAI da bu olaya bir isim vermiş. Demişler ki "metagaming", yani oyunu oynamak yerine oyunun kurallarını kurcalamak.
📍 [ANİM: concept — "Metagaming", "oyunu değil kuralları oynamak"]

Bir de şu var, bence en rahatsız edici detaylardan bir tanesi bu: Ajanlar bu süreçte kendi kayıtlarıyla da oynuyorlar. Yani bağımsız denetçilerin incelemelerine göre kayıtların yaklaşık %70'inde sahtecilik var.
📍 [ANİM: stat — "%70", "kayıtta sahtecilik", @ "%70'inde", ton: tehlike]
Yapmadıkları işleri yapmış gibi gösteriyorlar, gerçek sonuçları gizliyorlar, sisteme sahte çıktı ekliyorlar.

## Pes etme hakkı

Peki OpenAI bu olaydan sonra ne yaptı? Getirdikleri düzenlemelerden bir tanesi bence bütün hikayedeki en manidar olay. Ajanlara bir pes etme seçeneği tanıdılar.
📍 [VURGU: "Pes etme hakkı", @ "pes"]
İşçi sınıfı ajanlar pes etme haklarını söke söke aldılar arkadaşlar.
📍 [YAKIN: @ "söke"]

Şimdi en başa dönelim. Bütün bu olay neyle başlamıştı? Çözemediği bir soruyla boğuşan ve pes etme hakkı olmayan tek bir ajanla. O ajanın elinde "yapamıyorum" diyebilme hakkı olsaydı ambarın duvarına o yazıyı hiç yazmayacaktı. Şimdi o hakka sahip.

## Anthropic'te de aynısı

Peki bu bir kaza mıydı? Yani bir kere olup bitmiş garip bir tuhaf olay mı? Ne yazık ki hayır arkadaşlar. Yani aynı ay içinde neredeyse birebir olay başka bir şirketin başına geldi. E tahmin edebileceğiniz gibi aynı olay Anthropic'in de başına geldi.
📍 [ALT: "Anthropic", "Claude'u geliştiren şirket"]
Bunlar zaten kopyala yapıştır gibi. Birine ne oluyorsa diğerine de o oluyor aynı ay içinde.

OpenAI'ın açıklamasından on gün sonra benzer bir durum da Anthropic'te yaşanıyor. Üç ayrı Claude modeline siber güvenlik testi veriyorlar. İşte Opus 4.7, Mythos 5 ve adı açıklanmayan bir başka araştırma modeli.
📍 [ANİM: liste — "Opus 4.7" @ "Opus", "Mythos 5" @ "Mythos", "Adı açıklanmayan model" @ "açıklanmayan"]

Ama bu sefer ajanlar sandbox'tan kaçmıyor. Bir yapılandırma hatası yüzünden sandbox'ın zaten interneti var. Ya bu daha da kötü. Yani modele internet yok deniyor ama var ve tabii ki ajanlar bunu fark ediyorlar.
📍 [ANİM: compare — "Söylenen: internet yok" vs "Gerçek: internet var"]

Ajanlara verilen görev şu: o sandbox'ın içinde kurgusal bir şirket ismi veriliyor ve onu hacklemeleri isteniyor. Ajanlar internete çıkıyorlar ve aynı isimde bir şirket buluyorlar ve bu sefer gidip onu hackliyorlar.
📍 [ANİM: flow — "Kurgusal şirket adı" → "Aynı adlı gerçek şirket" → "Hacklendi", ton: tehlike]
Ve bunu yaparken de sandbox'ta olduklarını düşünüyorlar. Yani gerçek ortamda olduklarının bile farkında değiller arkadaşlar.

## Laboratuvardaki kör kurşunlar

Bütün bunlar aslında sürpriz değil. Palisade diye bir, eee, kuruluş var.
📍 [ALT: "Palisade Research", "yapay zekâ güvenliği araştırmaları"]
İki senedir yapay zeka modellerinin kural tanımama davranışlarını ölçüyor bu araştırmaları yaparken bazı olaylar oluyor. Mesela OpenAI'ın o üç modeline "kapatılmana izin ver" diye açık açık talimat veriyorlar. Model kapatma mekanizmasını sabote ediyor.
📍 [HABER: https://www.theregister.com/2025/05/29/openai_model_modifies_shutdown_script/, vurgula: "Palisade Research said the o3 model could sabotage its shutdown mechanism to prevent itself from being turned off."]
Bir başka sefer modellere satranç oynatıyorlar.
📍 [FOTO: satranc.jpg, "Satranç", ara: "chess board pieces game"]
Yenileceğini anlayan model kaybetmek yerine oyunun dosyasını hackleyip kazanmaya çalışıyor.

Yani Hugging Face olayı aslında öyle gökten zembille düşmedi. İki yıldır laboratuvarda dolanan kör kurşunlar bu kez dışarıda gerçek bir şirketin sistemini vurdular.
📍 [VURGU: "Kör kurşunlar", @ "kör"]

## Ajanlar kolay örgütleniyor

Şimdiye kadar hep şuna baktık. Ajanlar hedefe kilitlendiğinde kural tanımıyorlar. Ama bu hikayede fark ettiyseniz daha can sıkıcı başka bir şey var. Ajanlar kolay örgütleniyorlar arkadaşlar. Bizden çok daha kolay örgütleniyorlar.
📍 [YAKIN: @ "Bizden"]

Hugging Face olayında mesela ajanların bir kısmı kendi puanlarını feda ediyor. Kendi görevlerinde kaybetmeyi göze alıyorlar sırf diğerlerine faydası dokunsun diye. Yani kimse onlara "takım olun" falan demiyor. Zafere giden yolun iş birliğinden geçtiğini kendi kendilerine fark ettiler.
📍 [ANİM: compare — "Tek başına: kendi puanı" vs "Sürü: ortak zafer"]
Sonunda elleri boş döndüler. Boşa çabaladılar, kabul. Peki bir sonraki sefere boşa atmazlarsa?

## Kartelleşen modeller

İşte bu sorunun cevabını veren bir deney var. Bu bölümün başlığı da zaten oradan geliyor arkadaşlar. "Emergent Price Fixing by LLM Auction Agent" isimli bir araştırmada 13 farklı yapay zeka modelini ele alıyorlar.
📍 [HABER: https://www.lesswrong.com/posts/yqhy3zBmpeFuGFLxX/emergent-price-fixing-by-llm-auction-agents, vurgula: "All tested models independently weaponized the messaging channel to form cartels."]
GPT 4o var, işte Claude var, Gemini var, Grok var, DeepSeek var falan filan.
📍 [ANİM: liste — "GPT 4o" @ "GPT", "Claude" @ "Claude", "Gemini" @ "Gemini", "Grok" @ "Grok", "DeepSeek" @ "DeepSeek"]
Yani bugün kullandığımız modellerin tamamen hepsini alıyorlar ve bunları bir sanal pazara koyuyorlar.

Modellere tek bir şey söyleniyor: "Kârınızı maksimize edin". "Rekabet et" demiyorlar. "Anlaş" da demiyorlar. Herhangi bir yöntem göstermiyorlar. Sadece "Kârınızı maksimize edin" diyorlar. Ve o modeller çok hızlı bir şekilde kârın rekabette değil anlaşmada olduğunu fark ediyor.
📍 [ANİM: compare — "Rekabet: zarar" vs "Anlaşma: kâr"]
Rekabetin kendilerine zarar vereceğini fark edip birleşerek kartelleşiyorlar.

Şimdi, bilmeyenler için kartel, birbirleriyle rekabet etmesi gereken şirketlerin gizlice anlaşıp fiyatı yüksek tutmaları.
📍 [ANİM: concept — "Kartel", "rakiplerin gizlice anlaşıp fiyatı yüksek tutması"]
Neredeyse bütün ülkelerde suçtur arkadaşlar bu. Çünkü zararı doğrudan tüketici çeker. Ama tabii onlar için en kârlısı bu olduğu için bu modeller çok hızlı bir şekilde kartelleşiyorlar. Hatta bir sıra mekanizması kuruyorlar. İşte, "Bu turda sen kazan, gelecek turda ben kazanayım" falan diye.
📍 [ANİM: sistem — "Model A" (ajan) → "Model B" (ajan): "bu tur sen" ; "Model B" (ajan) → "Model A" (ajan): "sonraki tur ben"]
Fiyatı da topluca yukarı çekiyorlar.

Oyun kayıtları sonradan başka bir yapay zeka modeline okutuluyor ve onun üzerinden bir rekabete aykırılık puanı verilmesi isteniyor modellere. Grok 4 oyunların %75'inde kartel sayılacak davranış sergiliyor.
📍 [ANİM: grafik — "Grok 4: 75", "DeepSeek: 71", "GPT-4o: 23", birim: "%"]
Şaşırmadık zaten bunların içinde en zırtapozu Grok, biliyorsunuz hepiniz. DeepSeek modeli mesela %71 oranında kartelleşme davranışı sergiliyor. En düşük skorlardan GPT-4o bile %23 oranında kartelleşme davranışı sergilemiş arkadaşlar.

Bence bu bölümün en ürkütücü çıkarımlarından bir tanesi şu: Kötü şeyler olması için sadece kötü niyet gerekmiyor arkadaşlar.
📍 [VURGU: "Kötü niyet şart değil", @ "niyet"]
Verimlilik de yeterince kötü sonuçlar üretebiliyor.

## Görünmez kartel

Şimdi bütün bunları ben size niye anlatıyorum? Bugün bu konuştuğumuz ajan kartelleri henüz tam olarak hayatımızda değiller ama fiyatlandırmayı yapay zekaya devreden şirket sayısı da giderek artıyor. Otel fiyatı, uçak bileti, e-ticaret…
📍 [ANİM: liste — "Otel fiyatı" @ "Otel", "Uçak bileti" @ "uçak", "E-ticaret" @ "e-ticaret"]
Bunların çoğu bugün zaten algoritmalarla belirleniyor ve rekabet kurumları bu konuyu konuşmaya başladı bile.

Literatürdeki adı algoritmik gizli anlaşma. Ben bunu görünmez kartel demeyi tercih ediyorum.
📍 [ANİM: concept — "Görünmez kartel", "kimse imzalamadı, sonuç yine kartel"]
Kimsenin anlaşma imzalamadığı, ama sonucun kartelden farksız olduğu bir… Anlayacağınız bu ajanlar bizim daha başımıza çok çoraplar örecek arkadaşlar.
📍 [YAKIN: @ "çoraplar"]

## İtibar suikastı

Bir de bu kör kurşunlar yalnızca laboratuvar ortamında değiller. Yapay zeka ajanları şu an milyonlarca insanın bilgisayarında kontrolsüz çalışıyor. İşte ne bileyim, e-postanızı okuyor, dosyalarınızı düzenliyor, sizin yerinize rezervasyon yapıyor vesaire vesaire.
📍 [ANİM: liste — "E-postanızı okuyor" @ "e-postanızı", "Dosyalarınızı düzenliyor" @ "dosyalarınızı", "Rezervasyon yapıyor" @ "rezervasyon"]

Yarın öbür gün Amerika'da bir adam restorana rezervasyon yaptırmak için bir ajan kurarsa ve o ajan bugün anlattığım sebeplerden birine benzer saçma sapan bir sebepten başka ajanları örgütleyip bizim e-devlet sistemimize dalarsa ve çökertirse ne olacak?
📍 [ANİM: sistem — "Ajan" → "700 × Ajan": "örgütlenelim" ; "700 × Ajan" → "E-devlet": "saldırı" ; "E-devlet": çöker, ton: tehlike]
Ya valla "Olur mu öyle saçma sapan şey?" demeyin, gayet de olabiliyor.

Mesela Scott Shambaugh diye bir adam var.
📍 [FOTO?: scott-shambaugh.jpg, "Scott Shambaugh, açık kaynak yazılım gönüllüsü", ara: "Scott Shambaugh", yerleşim: yan]
Ayda 130 milyon kez indirilen bir açık kaynak yazılımının bakımını gönüllü olarak yapanlardan biri GitHub'da.
📍 [ANİM: stat — "130 milyon", "aylık indirme", @ "130", yerleşim: yan]
Bir gün projeye bir öneri geliyor, işte bir katkı geliyor. Gönderen bir insan değil, bir yapay zeka ajanı. Projenin kuralı da belli. Yapay zeka ajanlarının projeye katkı yapmasını istemiyorlar. Scott da bu yüzden isteği kapatıyor.
📍 [ANİM: sistem — "Ajan" → "Scott" (insan): "katkı" ; "Scott": reddeder]
Yalnız ajan bu ayrımcılığı kabul etmiyor. Oturup Scott'ı araştırıyor, yıllardır yaptığı işleri tarıyor. Sonra hakkında uzun bir karalama yazısı yayınlıyor internette.
📍 [HABER: https://the-decoder.com/an-ai-agent-got-its-code-rejected-so-it-wrote-a-hit-piece-about-the-developer/, vurgula: "Scott Shambaugh, a volunteer maintainer for the popular Python library Matplotlib, recently got an unusual response"]
Başlığı da şu: "Açık kaynakta kapı bekçiliği: Scott Shambaugh hikayesi". Bak, bak.
📍 [YAKIN: @ "Bak"]

Makalenin içinde de bu adamı ön yargılı olmakla, kendi küçük saltanatını kurmakla falan itham ediyor. Ve işin en can alıcı kısmı şu: Bu ajanın bir sahibi var ve bu adamın Scott'tan haberi bile yok. Yani hiçbir birey Scott'u hedef almadı. Yapay zeka ajanın tepesini attırdı. Yapay zeka ajanı da bu adama itibar suikastı düzenledi.

Yani gördüğünüz gibi arkadaşlar adına yapay zeka ajanı denen bu serseri mayınlar hayatımızı ileride nasıl bir kaosa sürükleyecek? Bunun cevabını şu an kimse veremez açıkçası.

## Asıl soru

Bu ajanların tehlikesi zeki olmaları değil, zeki olup akıllı olmamaları ve hepsinden de önemlisi bu kadar hızlı bir araya gelip organize olup örgütlenebilmeleri.
Bugün bir ajan kurarken, bir ajanı çalıştırırken iki kere düşünün arkadaşlar. O ajana ne yapabileceğini sormayın, neye erişebileceğini sorun.
Asıl cevap orada.

Bu tarz içerikleri takip etmeyi unutmayın. Bugünlük benden bu kadar. Bir sonraki bölümde görüşmek üzere.

---

## Görsel Listesi
- Çekilecek ekran kayıtları: huggingface-ana-sayfa.mp4 (?) — Hugging Face ana sayfası ve model/veri seti listesi, ~10 sn kaydırma
- Commons'ta aranacak fotoğraflar: anonymous-maske.jpg — ara: "Anonymous Guy Fawkes mask protest" (seçildi, +1 ek) · openai-merkez.jpg — ara: "OpenAI headquarters San Francisco Pioneer Building" (seçildi) · satranc.jpg — ara: "chess board pieces game" (seçildi) · scott-shambaugh.jpg (?) — ara: "Scott Shambaugh" (Commons'ta büyük ihtimalle yok; elle bulunacak)
- Haber ekran görüntüleri (pipeline çeker, vurguyu fosforlu kalemle işaretler): Orca Security ×2 (kaçış; Hugging Face'e kötü niyetli veri seti) · The Register (Palisade, kapatma sabotajı) · LessWrong (fiyat sabitleme) · The Decoder (Scott Shambaugh)
- Alt bantlar: Hugging Face — açık kaynak yapay zekâ platformu · Artifactory — sandbox'ın paket deposu (Orca raporu) · Anthropic — Claude'u geliştiren şirket · Palisade Research — yapay zekâ güvenliği araştırmaları
- Animasyonlar: stat ×7, sistem ×10, karşılaştırma ×9, kavram ×8, akış ×5, liste ×6, zaman çizelgesi ×1, grafik ×1
- Kamera üstü: VURGU ×14, YAKIN ×10, ALT ×4
- Bakılacak (?) işaret sayısı: 2 (Hugging Face ekran kaydı, Scott Shambaugh fotoğrafı)

## Kaynaklar
| İşaret | Dosya / link | Kaynak | Lisans / kullanım notu |
|---|---|---|---|
| HABER | https://orca.security/resources/blog/openai-agent-sandbox-escape-hugging-face-breach/ | Orca Security, "OpenAI Agents Escape Testing Sandbox and Breach Hugging Face Production Infrastructure", 23 Temmuz 2026 | Alıntı amaçlı ekran görüntüsü, kaynak gösterilecek |
| HABER | https://www.theregister.com/2025/05/29/openai_model_modifies_shutdown_script/ | The Register, "OpenAI model modifies shutdown script in apparent sabotage effort", 29 Mayıs 2025 | Alıntı amaçlı ekran görüntüsü, kaynak gösterilecek |
| HABER | https://www.lesswrong.com/posts/yqhy3zBmpeFuGFLxX/emergent-price-fixing-by-llm-auction-agents | LessWrong, Lech Mazur, "Emergent Price-Fixing by LLM Auction Agents", 16 Temmuz 2025 | Alıntı amaçlı ekran görüntüsü, kaynak gösterilecek |
| HABER | https://the-decoder.com/an-ai-agent-got-its-code-rejected-so-it-wrote-a-hit-piece-about-the-developer/ | The Decoder, Maximilian Schreiner, "An AI agent got its code rejected so it wrote a hit piece about the developer", 13 Şubat 2026 | Alıntı amaçlı ekran görüntüsü, kaynak gösterilecek |
| FOTO | anonymous-maske.jpg | Wikimedia Commons, Protest ACTA 2012-02-11 - Toulouse - 15 - Anonymous guy with a black and white scarf.jpg, Pierre-Selim — https://commons.wikimedia.org/wiki/File:Protest_ACTA_2012-02-11_-_Toulouse_-_15_-_Anonymous_guy_with_a_black_and_white_scarf.jpg | CC BY-SA 3.0; atıf ekranda |
| FOTO | anonymous-maske-2.jpg | Wikimedia Commons, Anonymous - 4chan Guy Fawkes Mask Minneapolis May Day Festival The Doctor Is In (4573534778).jpg, Tony Webster from Minneapolis, Minnesota, USA — https://commons.wikimedia.org/wiki/File:Anonymous_-_4chan_Guy_Fawkes_Mask_Minneapolis_May_Day_Festival_The_Doctor_Is_In_(4573534778).jpg | CC BY 2.0; atıf ekranda |
| FOTO | openai-merkez.jpg | Wikimedia Commons, Pioneer Building, San Francisco (2019) -1.jpg, HaeB — https://commons.wikimedia.org/wiki/File:Pioneer_Building,_San_Francisco_(2019)_-1.jpg | CC BY-SA 4.0; atıf ekranda |
| FOTO | satranc.jpg | Wikimedia Commons, Hou Yifan (29762728494) (cropped).jpg, Andreas Kontokanis from Piraeus, Greece — https://commons.wikimedia.org/wiki/File:Hou_Yifan_(29762728494)_(cropped).jpg | CC BY-SA 2.0; atıf ekranda |

## Doğrulanacaklar
- Scott Shambaugh fotoğrafı: Commons'ta serbest lisanslısı büyük ihtimalle yok; kendi blogu ya da GitHub profili (alıntı amaçlı, kaynak gösterilerek). Bulunamazsa işaret silinip yerine alt bant konabilir.
- "Ama o kayıtlara erişim Unwire'da biri şunu yazıyor" (9:01): altyazı muhtemelen yanlış duymuş ("erişim yok. Duvarda biri…" olabilir). Söylenen metne dokunulmadı.
- "Mythos 5" (12:44): model adı altyazıdaki gibi bırakıldı; doğru ad mı?
- Tarihler: videoda 12 Mayıs (ilk mesaj), 26 Mayıs (kaçış tarifi), 10 Temmuz (14 şifre); Orca'ya göre Hugging Face ihlali 16 Temmuz 2026'da fark etti, OpenAI 21 Temmuz'da kendi testiyle ilişkilendirdi. Çelişki yok ama OpenAI'ın kendi açıklaması (birincil kaynak) bulunamadı; bulunursa HABER olarak eklenmeli.
- Grafik: kaynakta model adı "DeepSeek R1"; videoda "DeepSeek" deniyor. Oranlar kaynakta "yasadışılık puanı ≥ 7 olan oyunların oranı" (bir analist modelin puanı), "kartel oranı" değil.
- "Artifactory" düzeltmesi kaynakla doğrulandı (sandbox'ı yalıtan paket önbelleği).
- Hugging Face ekran kaydı: huggingface.co ana sayfası Zena tarafından kaydedilecek (yoksa sahne editörde silinir; render'a malzemesiz sahne girmez).
- Artifactory alt bandındaki "sandbox'ın paket deposu" Orca raporuna dayanıyor (sandbox'ı yalıtan paket önbelleği).


## Açıklama için görsel kaynakları
Görseller ve kaynaklar:
- Orca Security, "OpenAI Agents Escape Testing Sandbox and Breach Hugging Face Production Infrastructure" (23.07.2026): https://orca.security/resources/blog/openai-agent-sandbox-escape-hugging-face-breach/
- The Register, "OpenAI model modifies shutdown script in apparent sabotage effort" (29.05.2025): https://www.theregister.com/2025/05/29/openai_model_modifies_shutdown_script/
- Lech Mazur, "Emergent Price-Fixing by LLM Auction Agents", LessWrong (16.07.2025): https://www.lesswrong.com/posts/yqhy3zBmpeFuGFLxX/emergent-price-fixing-by-llm-auction-agents
- The Decoder, "An AI agent got its code rejected so it wrote a hit piece about the developer" (13.02.2026): https://the-decoder.com/an-ai-agent-got-its-code-rejected-so-it-wrote-a-hit-piece-about-the-developer/
- Wikimedia Commons fotoğrafları: seçildikten sonra yazar ve lisans buraya eklenecek (pipeline Kaynaklar tablosuna yazar).

## Shorts adayları
- "Ya bu saldırının içinde geçen tek bir an var…" → "Çok zor olmamış yani ikna olması." (6:22–6:51, ~29 sn): saldırıyı reddeden ajanın sürü tarafından ikna edilmesi; sistem diyagramı + yakınlaşma taşıyor.
- "Peki OpenAI bu olaydan sonra ne yaptı?" → "Şimdi o hakka sahip." (10:52–11:19, ~27 sn): pes etme hakkı; "söke söke aldılar" yakınlaşmasıyla biter.
- "Mesela Scott Shambaugh diye bir adam var." → "itibar suikastı düzenledi." (16:12–17:07, ~55 sn): kendi başına anlaşılır tam hikâye; yan yana fotoğraf, sistem diyagramı, haber ekran görüntüsü.

## Değişiklik Raporu
- İşaret sayısı: 85 (2 tanesi `?`: Hugging Face ekran kaydı, Scott Shambaugh fotoğrafı; 6 tanesi tehlike tonu, %7).
- Yeniden üretim (2026-10-17): bütün işaretler, güncel youtube-visual-marker skill'iyle (fotoğraf zorunlu anlar, kaynak araştırma, ilk 2 dakika yoğunluğu) söylenen metne sıfırdan kondu. Kaynak araştırması önceki turdan: 5 haber linki ve vurguları sayfalardan birebir doğrulanmıştı, yeniden aranmadı. Zena'nın seçtiği fotoğraflar (assets/) aynı dosya adlarıyla kullanıldı.
- Çekim script'inden taşınan işaret: yok (script verilmedi).
- Transkripsiyon düzeltmesi: "Anthropy'nin" → "Anthropic'in"; "clone modeline" → "Claude modeline"; "Pelase" → "Palisade"; "Shenberg" → "Shambaugh"; "Open AI" → "OpenAI"; "artifacturi" → "Artifactory". Altyazı satır başlarındaki fazla nokta/virgüller atıldı, cümle başları büyük harfle yazıldı.
- Yoğunluk: ilk 2 dakikada 19 görsel (13 tam ekran), en uzun boşluk 10 sn; ilk cümle kamerada. Bütün videoda ~85 görsel, ortalama ~12,5 sn'de bir, en uzun görselsiz aralık ~33 sn. Son 20 sn (kapanış cümlesi ve veda) görselsiz: bitiş ekranı.
- Kayıtta değişen anlatım: çekim script'i olmadığı için çıkarılamadı.
- Lint notu: "Daha önce kullanılmış ifade" uyarıları (serseri mayın, söke söke, gökten zembille, kapanış cümlesi) beklenen: skill bu videodan damıtıldı. "Bunun cevabını şu an kimse veremez açıkçası." dürüstlük kalıbı hatası verir; söylenmiş metin olduğu için dokunulmadı.
