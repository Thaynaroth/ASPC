import { useId } from 'react';
import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  const filterId = useId();

  return (
    <div
      className={cn(
        '-rotate-3 relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#fdf3dd] shadow-sm ring-1 ring-amber-950/10',
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="size-8" fill="none" aria-hidden="true">
        <defs>
          <filter id={filterId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.025"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" />
          </filter>
        </defs>
        <g
          filter={`url(#${filterId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* faint draft strokes */}
          <g stroke="#a8a29e" strokeWidth="1" opacity="0.55">
            <path d="M12.6 4.4 C 11 9.8, 7.8 15.2, 5.2 19.6" />
            <path d="M11.4 4.2 C 13.4 9.6, 16.4 15.4, 19 19.4" />
            <path d="M8.6 14.4 C 11.8 13.7, 14.8 14, 17.2 14.6" />
          </g>
          {/* main ink strokes */}
          <g stroke="#44403c" strokeWidth="2.2">
            <path d="M12.2 3.8 C 10.6 9.4, 7.6 15, 4.8 19.8" />
            <path d="M11.8 3.9 C 13.6 9.6, 16.6 15.6, 19.2 19.6" />
            <path d="M7.8 13.8 C 11.6 13, 15 13.2, 18.2 14" />
          </g>
        </g>
      </svg>
    </div>
  );
}
