import React, { useState, useRef } from 'react';
import { Check } from 'lucide-react';

interface SlideActionBarProps {
  label: string;
  doneLabel?: string;
  onTrigger: () => void | Promise<void>;
  disabled?: boolean;
  maxWidthClass?: string;
}

/**
 * Exact `.slide` button from itihaskar-studio-ui.html:
 * - Touch/click ANYWHERE on the bar -> the arrow knob immediately jumps under your finger/cursor (`x0`),
 *   and you slide it the rest of the way to the right to trigger!
 * - Also supports keyboard Enter/Space/ArrowRight on the knob.
 */
export const SlideActionBar: React.FC<SlideActionBarProps> = ({
  label,
  doneLabel = 'Opening…',
  onTrigger,
  disabled = false,
  maxWidthClass = 'w-full',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const startRef = useRef(0);
  const lastXRef = useRef(0);
  const travelRef = useRef(0);
  const maxTravelRef = useRef(220);
  const currentXRef = useRef(0);

  const setKnobX = (val: number) => {
    currentXRef.current = val;
    setDragX(val);
  };

  const completeSlide = async () => {
    if (disabled || isDone) return;
    const width = containerRef.current?.clientWidth || 280;
    const max = Math.max(1, width - 54);
    maxTravelRef.current = max;
    setKnobX(max);
    setIsDone(true);
    try {
      await onTrigger();
    } finally {
      setTimeout(() => {
        setIsDone(false);
        setKnobX(0);
      }, 700);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isDone) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const max = Math.max(1, el.clientWidth - 54);
    maxTravelRef.current = max;

    // Jump the knob directly under the finger/cursor wherever the user clicked on the bar!
    const x0 = Math.max(0, Math.min(max, e.clientX - rect.left - 27));
    startRef.current = e.clientX - x0;
    lastXRef.current = e.clientX;
    travelRef.current = 0;
    setIsDragging(true);
    setKnobX(x0);

    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic pointer capture errors
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled || isDone) return;
    travelRef.current += Math.abs(e.clientX - lastXRef.current);
    lastXRef.current = e.clientX;
    const nextX = Math.max(
      0,
      Math.min(maxTravelRef.current, e.clientX - startRef.current)
    );
    setKnobX(nextX);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    // Complete when dragged to the right end (or if user clicked right at the end of the track)
    if (
      currentXRef.current >= maxTravelRef.current * 0.85 &&
      (travelRef.current > 8 || currentXRef.current >= maxTravelRef.current * 0.92)
    ) {
      completeSlide();
    } else {
      setKnobX(0);
    }
  };

  const labelOpacity = isDone
    ? 0
    : Math.max(0, 1 - dragX / (maxTravelRef.current * 0.8 || 1));

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative h-[52px] sm:h-[54px] rounded-full overflow-hidden select-none touch-none ${maxWidthClass} ${
        disabled
          ? 'opacity-45 cursor-not-allowed'
          : isDragging
            ? 'cursor-grabbing'
            : 'cursor-grab'
      }`}
      style={{
        background: 'linear-gradient(96deg, #ff3d00, #ff8a1f)',
        boxShadow: '0 14px 40px rgba(255, 61, 0, 0.38)',
      }}
    >
      {/* Slide Label */}
      <span
        style={{ opacity: labelOpacity }}
        className="absolute inset-y-0 left-[52px] right-4 flex items-center justify-center text-[14px] sm:text-[15px] font-semibold text-[#180600] whitespace-nowrap pointer-events-none"
      >
        {label}
      </span>

      {/* Done Label */}
      <span
        aria-live="polite"
        style={{ opacity: isDone ? 1 : 0 }}
        className="absolute inset-y-0 left-[52px] right-4 flex items-center justify-center text-[14px] sm:text-[15px] font-semibold text-[#180600] whitespace-nowrap pointer-events-none transition-opacity duration-150"
      >
        {doneLabel}
      </span>

      {/* Draggable Knob that jumps under finger */}
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        onKeyDown={(e) => {
          if (['Enter', ' ', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            completeSlide();
          }
        }}
        className={`absolute left-[6px] top-[6px] sm:left-[7px] sm:top-[7px] w-[40px] h-[40px] rounded-full bg-[#180600] text-[#ff8a1f] grid place-items-center focus:outline-none ${
          isDragging
            ? 'transition-none cursor-grabbing'
            : 'transition-transform duration-300 cubic-bezier(0.16,1,0.3,1) cursor-grab'
        }`}
        style={{
          transform: `translateX(${dragX}px)`,
        }}
      >
        {isDone ? (
          <Check className="w-[18px] h-[18px] text-[#7ee787]" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="w-[18px] h-[18px] itk-knob-arrow"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </button>
    </div>
  );
};
