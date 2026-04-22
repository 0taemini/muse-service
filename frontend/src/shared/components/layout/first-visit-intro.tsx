import { CSSProperties, SVGProps, useEffect, useState } from 'react';
import { cn } from '@shared/lib/cn';

const INTRO_STORAGE_KEY = 'muse:first-visit-intro-seen';
const DEFAULT_VISIBLE_MS = 2600;
const REDUCED_MOTION_VISIBLE_MS = 1200;
const EXIT_MS = 400;

type IntroPhase = 'checking' | 'visible' | 'exit' | 'done';
type InstrumentType = 'drum' | 'guitar' | 'keyboard' | 'mic';
type InstrumentPlacement = {
  type: InstrumentType;
  top: string;
  left?: string;
  right?: string;
  width: string;
  delay: string;
  duration: string;
  rotate: string;
};

const museLetters = ['M', 'U', 'S', 'E'];
const backgroundInstruments: InstrumentPlacement[] = [
  { type: 'drum', top: '10%', left: '6%', width: '10rem', delay: '-0.8s', duration: '5.8s', rotate: '-12deg' },
  { type: 'guitar', top: '16%', right: '8%', width: '11rem', delay: '-2.6s', duration: '6.6s', rotate: '10deg' },
  { type: 'keyboard', top: '66%', left: '8%', width: '12rem', delay: '-1.4s', duration: '7.2s', rotate: '-8deg' },
  { type: 'mic', top: '70%', right: '10%', width: '9rem', delay: '-3.1s', duration: '5.4s', rotate: '12deg' },
];
const sparkleDots = [
  { top: '22%', left: '26%', delay: '-0.8s' },
  { top: '30%', right: '24%', delay: '-2.7s' },
  { top: '62%', left: '22%', delay: '-1.9s' },
  { top: '70%', right: '28%', delay: '-3.5s' },
  { top: '44%', left: '18%', delay: '-4.2s' },
  { top: '40%', right: '16%', delay: '-1.2s' },
  { top: '56%', left: '74%', delay: '-2.2s' },
];

function IntroInstrument({ type, ...props }: SVGProps<SVGSVGElement> & { type: InstrumentType }) {
  switch (type) {
    case 'drum':
      return (
        <svg viewBox="0 0 160 160" fill="none" {...props}>
          <ellipse cx="80" cy="76" rx="40" ry="16" stroke="currentColor" strokeWidth="7" />
          <path d="M40 76v28c0 11 18 21 40 21s40-10 40-21V76" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M56 112v24M104 112v24" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
          <path d="M66 48 50 26M94 48l16-22" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          <path d="M54 89h52" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.75" />
        </svg>
      );
    case 'guitar':
      return (
        <svg viewBox="0 0 180 180" fill="none" {...props}>
          <path d="M111 42 146 17l14 14-34 35" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M106 47c-8 10-6 24 4 34L86 105c-14-6-30-3-40 7-14 14-14 37 0 51 14 14 37 14 51 0 10-10 13-26 7-40l24-24c10 10 24 12 34 4"
            stroke="currentColor"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="57" cy="133" r="12" stroke="currentColor" strokeWidth="7" />
          <path d="M129 30 149 50" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity="0.72" />
          <path d="M122 38 142 58" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity="0.72" />
          <path d="M101 56 121 76" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity="0.6" />
        </svg>
      );
    case 'keyboard':
      return (
        <svg viewBox="0 0 200 140" fill="none" {...props}>
          <rect x="20" y="34" width="160" height="66" rx="24" stroke="currentColor" strokeWidth="8" />
          <path d="M38 50h124" stroke="currentColor" strokeWidth="5" opacity="0.7" />
          <path d="M44 50v28M61 50v28M78 50v28M95 50v28M112 50v28M129 50v28M146 50v28" stroke="currentColor" strokeWidth="5" />
          <path d="M52 78v13M86 78v13M120 78v13M154 78v13" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" />
          <path d="M48 104v15M152 104v15" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        </svg>
      );
    case 'mic':
      return (
        <svg viewBox="0 0 160 180" fill="none" {...props}>
          <rect x="48" y="18" width="46" height="68" rx="23" stroke="currentColor" strokeWidth="8" />
          <path d="M40 67c0 23 18 41 41 41s41-18 41-41" stroke="currentColor" strokeWidth="7.5" strokeLinecap="round" />
          <path d="M71 108v27" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
          <path d="M54 140h37" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
          <path d="M94 86 132 136" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
          <circle cx="136" cy="141" r="8" stroke="currentColor" strokeWidth="6" />
        </svg>
      );
  }
}

function readIntroSeen() {
  try {
    return window.localStorage.getItem(INTRO_STORAGE_KEY) === getTodayStorageValue();
  } catch {
    return false;
  }
}

function getTodayStorageValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function writeIntroSeen() {
  try {
    window.localStorage.setItem(INTRO_STORAGE_KEY, getTodayStorageValue());
  } catch {
    // Ignore storage errors and let the app continue normally.
  }
}

export function FirstVisitIntro() {
  const [phase, setPhase] = useState<IntroPhase>('checking');

  useEffect(() => {
    if (readIntroSeen()) {
      setPhase('done');
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visibleMs = prefersReducedMotion ? REDUCED_MOTION_VISIBLE_MS : DEFAULT_VISIBLE_MS;

    setPhase('visible');

    const exitTimer = window.setTimeout(() => {
      setPhase('exit');
    }, visibleMs);

    const doneTimer = window.setTimeout(() => {
      writeIntroSeen();
      setPhase('done');
    }, visibleMs + EXIT_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  useEffect(() => {
    if (phase === 'done' || phase === 'checking') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [phase]);

  if (phase === 'checking' || phase === 'done') {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[120] overflow-hidden bg-[#12071f] transition duration-[400ms] ease-out',
        phase === 'exit' ? 'opacity-0 blur-[2px]' : 'opacity-100 blur-0',
      )}
      aria-label="MUSE intro"
    >
      <div className="intro-screen absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {backgroundInstruments.map((instrument, index) => (
          <span
            key={`instrument-${instrument.type}-${index}`}
            className="intro-anime-instrument"
            style={
              {
                top: instrument.top,
                left: instrument.left,
                right: instrument.right,
                width: instrument.width,
                animationDelay: instrument.delay,
                animationDuration: instrument.duration,
                '--intro-anime-rotate': instrument.rotate,
              } as CSSProperties
            }
          >
            <span className="intro-anime-note intro-anime-note-a" />
            <span className="intro-anime-note intro-anime-note-b" />
            <IntroInstrument
              type={instrument.type}
              className="relative z-[2] h-auto w-full text-white/90 drop-shadow-[0_0_18px_rgba(248,238,255,0.38)]"
            />
          </span>
        ))}
        {sparkleDots.map((dot, index) => (
          <span
            key={`sparkle-${index}`}
            className="intro-cute-sparkle"
            style={
              {
                top: dot.top,
                left: dot.left,
                right: dot.right,
                animationDelay: dot.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-6">
        <div
          className={cn(
            'intro-word-stage flex items-center justify-center gap-3 transition duration-[400ms] ease-out sm:gap-5 md:gap-7',
            phase === 'exit' ? 'scale-[0.97] opacity-0' : 'scale-100 opacity-100',
          )}
        >
          {museLetters.map((letter, index) => (
            <span
              key={letter}
              className="intro-cinema-letter font-['Fredoka'] text-[3.5rem] font-semibold leading-none tracking-[-0.04em] text-white sm:text-[5.4rem] md:text-[7.4rem]"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
