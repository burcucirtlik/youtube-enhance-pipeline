#!/usr/bin/env bash
# Ses efektleri: ffmpeg ile sıfırdan sentezlenir (lisans sorunu yok), brand/sfx/ altına yazılır.
# Görsel girişlerinde kısık çalınır (brand.sound). Değiştirmek için buradaki tarifleri düzenle ve yeniden çalıştır.
set -euo pipefail
cd "$(dirname "$0")/../brand/sfx"
gen() { ffmpeg -v error -y -f lavfi -i "$2" -af "$3,loudnorm=I=-20:TP=-6:LRA=7" -ar 44100 -ac 1 "$1.wav"; echo "✓ $1.wav"; }
# Tam ekran görsel girişi: yumuşak hava sesi
gen whoosh "anoisesrc=d=0.5:c=pink:a=0.7" "highpass=f=300,lowpass=f=5000,afade=t=in:d=0.2:curve=qsin,afade=t=out:st=0.22:d=0.28:curve=qsin"
# Rakam, liste maddesi: kısa tık
gen tick "sine=f=1800:d=0.05" "afade=t=out:st=0.005:d=0.045"
# Vurgu, yakınlaşma: yükselen pop
gen pop "aevalsrc='sin(2*PI*(420+2600*t)*t)*exp(-22*t)':d=0.16" "afade=t=out:st=0.1:d=0.06"
# Tehlike tonu: dijital bozulma
gen glitch "anoisesrc=d=0.24:c=white:a=0.6" "acrusher=bits=4:mode=log:samples=24,highpass=f=500,afade=t=out:st=0.12:d=0.12"
# Alt bant, kaynak, bölüm kartı: yumuşak bip
gen blip "aevalsrc='0.7*sin(2*PI*1320*t)*exp(-28*t)+0.3*sin(2*PI*1980*t)*exp(-34*t)':d=0.14" "afade=t=out:st=0.1:d=0.04"
