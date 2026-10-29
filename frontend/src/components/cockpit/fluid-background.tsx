import type { CSSProperties } from 'react'

export function scorePaletteStyle(score: number | null): CSSProperties {
  const palette =
    score === null
      ? { a: '#8fb9c0', b: '#b9d7d9', c: '#d9ecec', trail: '#4b9ea2', accent: '#b96f06' }
      : score < 40
        ? { a: '#8e243c', b: '#cf6574', c: '#f2aab0', trail: '#c33f55', accent: '#c33f55' }
        : score < 60
          ? { a: '#a65d0a', b: '#e9a847', c: '#ffe1a5', trail: '#cf8210', accent: '#cf8210' }
          : score < 75
            ? { a: '#087f86', b: '#75d9d1', c: '#b7fbef', trail: '#149da4', accent: '#149da4' }
            : { a: '#087245', b: '#53c99a', c: '#b6f5d0', trail: '#159b69', accent: '#159b69' }

  return {
    '--fluid-a': palette.a,
    '--fluid-b': palette.b,
    '--fluid-c': palette.c,
    '--fluid-trail': palette.trail,
    '--score-accent': palette.accent,
  } as CSSProperties
}

const RIBBONS = [
  'M-90 155 C 130 20 250 160 430 230 S 720 405 920 245 S 1210 40 1510 170 L1510 285 C 1210 155 1080 310 900 365 S 590 295 390 305 S 110 205 -90 300Z',
  'M-80 520 C 170 390 320 550 510 620 S 820 700 1035 505 S 1270 315 1510 430 L1510 555 C 1260 445 1110 640 915 710 S 570 680 370 600 S 120 540 -80 660Z',
  'M-70 360 C 190 250 310 390 500 420 S 750 485 975 350 S 1230 235 1490 330 L1490 405 C 1220 345 1110 475 930 520 S 620 505 430 470 S 160 380 -70 460Z',
]

const TRAILS = [
  ['highlight', 'M-50 260 C 170 100 290 190 470 288 S 730 460 955 285 S 1250 115 1500 240'],
  ['', 'M-40 322 C 170 215 300 306 505 382 S 790 512 1015 355 S 1290 230 1500 322'],
  ['highlight', 'M-40 612 C 190 466 330 610 545 676 S 820 710 1045 530 S 1280 410 1510 505'],
]

export function FluidBackground() {
  return (
    <div className="ck-fluid-background" aria-hidden="true">
      <svg className="ck-fluid-svg" viewBox="0 0 1400 800" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ck-trail-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--fluid-trail)" stopOpacity="0" />
            <stop offset="12%" stopColor="var(--fluid-trail)" stopOpacity="0.72" />
            <stop offset="50%" stopColor="var(--fluid-trail)" stopOpacity="1" />
            <stop offset="88%" stopColor="var(--fluid-trail)" stopOpacity="0.72" />
            <stop offset="100%" stopColor="var(--fluid-trail)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="ck-fluid-ribbons">
          {RIBBONS.map((d, index) => (
            <path key={d} className={`ck-ribbon ck-ribbon-${index}`} d={d} />
          ))}
        </g>

        <g className="ck-fluid-trails">
          {TRAILS.map(([variant, d]) => (
            <g key={d} className={`ck-trail-set ${variant ? `ck-trail-set-${variant}` : ''}`}>
              <path className="ck-trail ck-trail-soft" d={d} />
              <path className="ck-trail ck-trail-mid" d={d} />
              <path className={`ck-trail ck-trail-core ${variant ? `ck-trail-${variant}` : ''}`} d={d} />
            </g>
          ))}
        </g>

      </svg>
    </div>
  )
}
