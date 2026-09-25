import { memo } from 'react';
import { OBJECT_KINDS_INFO } from '../../domain/objectKinds';

/**
 * SVG fill patterns in world units (mm). One pattern per object kind with a
 * texture, so each object is a single element with one fill.
 */
export const Patterns = memo(function Patterns() {
  const kinds = Object.values(OBJECT_KINDS_INFO).filter((k) => k.pattern);
  return (
    <defs>
      {kinds.map((k) => (
        <PatternFor key={k.kind} id={`pat-${k.kind}`} pattern={k.pattern!} fill={k.fill} stroke={k.stroke} />
      ))}
      <marker id="dim-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#2C5E6B" />
      </marker>
    </defs>
  );
});

function PatternFor({ id, pattern, fill, stroke }: { id: string; pattern: string; fill: string; stroke: string }) {
  switch (pattern) {
    case 'grass':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={400} height={400}>
          <rect width={400} height={400} fill={fill} />
          <path d="M60 120 l20 -40 M80 120 l0 -45 M100 120 l-18 -38 M260 320 l20 -40 M280 320 l0 -45 M300 320 l-18 -38" stroke={stroke} strokeWidth={10} strokeOpacity={0.45} fill="none" />
        </pattern>
      );
    case 'gravel':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={200} height={200}>
          <rect width={200} height={200} fill={fill} />
          <circle cx={40} cy={50} r={14} fill={stroke} fillOpacity={0.35} />
          <circle cx={130} cy={30} r={10} fill={stroke} fillOpacity={0.3} />
          <circle cx={100} cy={120} r={16} fill={stroke} fillOpacity={0.25} />
          <circle cx={170} cy={160} r={12} fill={stroke} fillOpacity={0.35} />
          <circle cx={30} cy={170} r={9} fill={stroke} fillOpacity={0.3} />
        </pattern>
      );
    case 'soil':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={300} height={300}>
          <rect width={300} height={300} fill={fill} />
          <circle cx={50} cy={60} r={8} fill={stroke} fillOpacity={0.35} />
          <circle cx={200} cy={40} r={6} fill={stroke} fillOpacity={0.3} />
          <circle cx={130} cy={170} r={9} fill={stroke} fillOpacity={0.3} />
          <circle cx={260} cy={230} r={7} fill={stroke} fillOpacity={0.35} />
          <circle cx={60} cy={250} r={6} fill={stroke} fillOpacity={0.3} />
        </pattern>
      );
    case 'water':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={600} height={300}>
          <rect width={600} height={300} fill={fill} />
          <path d="M0 100 q75 -40 150 0 t150 0 t150 0 t150 0 M0 250 q75 -40 150 0 t150 0 t150 0 t150 0" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={14} fill="none" />
        </pattern>
      );
    case 'glazing':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={600} height={600}>
          <rect width={600} height={600} fill={fill} fillOpacity={0.85} />
          <path d="M0 0 L600 0 M0 0 L0 600" stroke={stroke} strokeOpacity={0.4} strokeWidth={12} />
        </pattern>
      );
    case 'paving':
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={400} height={400}>
          <rect width={400} height={400} fill={fill} />
          <path d="M0 0 H400 M0 200 H400 M0 0 V200 M200 200 V400" stroke={stroke} strokeOpacity={0.45} strokeWidth={10} fill="none" />
        </pattern>
      );
    case 'hatch':
    default:
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={250} height={250} patternTransform="rotate(45)">
          <rect width={250} height={250} fill={fill} />
          <path d="M0 0 V250" stroke={stroke} strokeOpacity={0.35} strokeWidth={18} />
        </pattern>
      );
  }
}
