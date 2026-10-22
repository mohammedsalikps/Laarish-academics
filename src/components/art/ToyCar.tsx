/**
 * Toy car drawn in SVG user units (about 64 x 40). Origin is at the rear-bottom
 * corner so it can be positioned on a track with a translate.
 */
export function ToyCar({ wheelRotation = 0, color = '#F06A4D' }: { wheelRotation?: number; color?: string }) {
  return (
    <g>
      <ellipse cx="32" cy="-1" rx="30" ry="3" fill="rgb(29 26 74 / 0.15)" />
      <path d="M4 -14 C 4 -20 8 -22 14 -22 L 20 -22 L 27 -33 C 28 -35 30 -36 32 -36 L 46 -36 C 49 -36 51 -35 52 -33 L 57 -24 C 61 -23 64 -20 64 -16 L 64 -11 C 64 -9 62 -8 60 -8 L 6 -8 C 4 -8 4 -10 4 -14 Z" fill={color} />
      <path d="M29 -24 L 33 -32 L 44 -32 L 44 -24 Z" fill="#DDF3FF" />
      <path d="M47 -24 L 47 -32 L 50 -32 L 54 -24 Z" fill="#DDF3FF" />
      <rect x="57" y="-20" width="5" height="3" rx="1.5" fill="#FFE7A0" />
      <rect x="5" y="-19" width="4" height="3" rx="1.5" fill="#FFB4A2" />
      <path d="M12 -16 h40" stroke="rgb(255 255 255 / 0.35)" strokeWidth="2" strokeLinecap="round" />
      {[16, 50].map((cx) => (
        <g key={cx} transform={`translate(${cx} -8)`}>
          <g className="wheel" style={{ transform: `rotate(${wheelRotation}deg)` }}>
            <circle r="8" fill="#2B2A3F" />
            <circle r="4" fill="#C9C6DA" />
            <path d="M0 -6.5 V 6.5 M-6.5 0 H 6.5" stroke="#55536B" strokeWidth="1.6" />
          </g>
        </g>
      ))}
    </g>
  );
}
