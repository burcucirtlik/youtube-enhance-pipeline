// Harita: dünyadan olayın geçtiği yere yakınlaşan tel kafes harita + yanıp sönen işaret.
// Ülke sınırları world-atlas (Natural Earth 1:50m), çizim d3-geo; ağ erişimi yok, her şey pakette.

import {geoMercator, geoPath, geoGraticule10} from 'd3-geo';
import React, {useMemo} from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {feature} from 'topojson-client';
import countries from 'world-atlas/countries-50m.json';
import {brand} from '../../../brand/brand';
import {Decode, fill, fonts, glow, H, useEnter, useTone, W} from '../theme';

const world = feature(countries as any, (countries as any).objects.countries) as any;

export const MapScene: React.FC<{place: string; caption?: string; lat?: number; lon?: number}> = ({place, caption, lat = 0, lon = 0}) => {
  const frame = useCurrentFrame();
  const tone = useTone();
  const label = useEnter(28);
  // 0–30. kare: dünya görünümünden ülke ölçeğine yakınlaşma.
  const z = interpolate(frame, [0, 30], [0, 1], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const scale = interpolate(z, [0, 1], [300, 2600]);
  const center: [number, number] = [interpolate(z, [0, 1], [lon * 0.3, lon]), interpolate(z, [0, 1], [Math.max(-50, Math.min(60, lat * 0.3)), lat])];
  const {paths, grid, pin} = useMemo(() => {
    const proj = geoMercator().scale(scale).center(center).translate([W / 2, H / 2]);
    const gp = geoPath(proj);
    return {paths: world.features.map((f: any) => gp(f) ?? ''), grid: gp(geoGraticule10()) ?? '', pin: proj([lon, lat]) ?? [W / 2, H / 2]};
  }, [scale, center[0], center[1], lat, lon]);
  const pulse = (frame % 30) / 30;
  return (
    <div style={{...fill, background: 'rgba(2,8,5,0.6)'}}>
      <svg width={W} height={H} style={fill}>
        <path d={grid} fill="none" stroke={tone.accent} strokeOpacity={0.12} strokeWidth={1} />
        {paths.map((d: string, i: number) => (
          <path key={i} d={d} fill={tone.accent} fillOpacity={0.06} stroke={tone.accent} strokeOpacity={0.75} strokeWidth={1.4} />
        ))}
        <circle cx={pin[0]} cy={pin[1]} r={12 + pulse * 60} fill="none" stroke={tone.accent2} strokeWidth={3} opacity={(1 - pulse) * z} />
        <circle cx={pin[0]} cy={pin[1]} r={11} fill={tone.accent2} opacity={z} style={{filter: `drop-shadow(0 0 10px ${tone.accent2})`}} />
      </svg>
      <div style={{position: 'absolute', left: Math.min(pin[0] + 40, W - 700), top: Math.max(pin[1] - 70, 60), opacity: label, transform: `translateX(${(1 - label) * 20}px)`}}>
        <div style={{fontFamily: fonts.mono, fontSize: 22, letterSpacing: 4, color: tone.accent2, marginBottom: 4}}>{`// ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`}</div>
        <Decode text={place} delay={28} style={{display: 'block', fontFamily: fonts.display, fontWeight: 700, fontSize: 64, color: tone.accent, background: 'rgba(2,8,5,0.75)', padding: '4px 14px', ...glow(tone.accent, 0.6)}} />
        {caption ? <div style={{fontFamily: fonts.mono, fontSize: 30, color: brand.colors.text, marginTop: 8, padding: '0 14px'}}>{caption}</div> : null}
      </div>
    </div>
  );
};
