# Editör İstatistikleri (otomatik)

_Pipeline üretir, elle düzenleme: masaüstü uygulamasında her editör kaydında ve `npm run stats` ile yenilenir. Son güncelleme: 2026-10-17._

Zena'nın video editöründe senin işaretlerine ne yaptığı. Görsel işaret yazarken (özellikle `?` ile önerirken) buna bak: çok silinen türü daha az ve daha seçici öner; hep kaydırılan türde işareti cümlenin doğru yerine koy. Buradaki sayılar "Zena'nın Düzeltmelerinden Öğrenilenler"in yerine geçmez, ona veri sağlar.

Kaynak: 2 proje (2026-10-80-ler-akimi, 2026-10-yapay-zekaya-hakaret-2), 107 görsel.

## İşaret türüne göre

Kaydırıldı: 10 sn'ye kadar oynatıldı (zamanlama düzeltmesi). Taşındı: daha uzağa (başka cümleye) götürüldü.

| İşaret | Sayı | Tutuldu | Kaydırıldı | Taşındı | Süresi değişti | Silindi | Kaydırma (ortanca) |
|---|---|---|---|---|---|---|---|
| FOTO | 35 | %60 | %0 | %37 | %0 | %3 | – |
| ANİM flow | 14 | %64 | %0 | %29 | %0 | %7 | – |
| ANİM compare | 13 | %38 | %8 | %46 | %0 | %8 | −1,0 sn |
| HABER | 11 | %45 | %27 | %27 | %0 | %0 | −7,7 sn |
| EKRAN | 6 | %83 | %0 | %17 | %0 | %0 | – |
| ANİM concept | 6 | %33 | %17 | %50 | %0 | %0 | −9,8 sn |
| ANİM stat | 6 | %67 | %0 | %33 | %0 | %0 | – |
| ANİM timeline | 6 | %50 | %17 | %33 | %0 | %0 | −9,6 sn |
| ANİM table | 5 | %80 | %20 | %0 | %0 | %0 | −7,1 sn |
| ANİM quote | 5 | %40 | %0 | %60 | %0 | %0 | – |

## Kesin ve önerilen (?) işaretler

| | Sayı | Tutuldu | Silindi |
|---|---|---|---|
| önerilen (?) | 76 | %97 | %3 |
| kesin | 31 | %97 | %3 |

## Çıkarımlar

- `HABER` önerileri (?): kaydırılanlar ortanca −7,7 sn geri (cümleden daha erken girmeli).
- `EKRAN` önerileri (?): olduğu gibi tutulma oranı %83 (6 işaret). İşe yarıyor.
- `FOTO` önerileri (?): olduğu gibi tutulma oranı %80 (5 işaret). İşe yarıyor.
- `ANİM table` önerileri (?): olduğu gibi tutulma oranı %80 (5 işaret). İşe yarıyor.

## Projeler

| Proje | Görsel | Silindi | Kaydırıldı | Taşındı |
|---|---|---|---|---|
| 2026-10-80-ler-akimi | 55 | 2 | 1 | 0 |
| 2026-10-yapay-zekaya-hakaret-2 | 52 | 1 | 6 | 37 |
