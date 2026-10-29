import React, { useEffect, useRef } from 'react';

interface EmberBackdropProps {
  showWatermark?: boolean;
  showHorizonGlow?: boolean;
}

interface AsteroidRock {
  r: number;
  v: number;
  len: number;
  c: string;
  a: number;
  x: number;
  y: number;
}

/**
 * Falling orange asteroids (top-right -> bottom-left, DX = -0.78, DY = 0.62),
 * glowing horizon, and giant bottom "ITIHASKAR" watermark ported directly from itihaskar-studio-ui.html
 */
export const EmberBackdrop: React.FC<EmberBackdropProps> = ({
  showWatermark = true,
  showHorizonGlow = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const DX = -0.78;
    const DY = 0.62;
    const cols = ['255,138,31', '255,61,0', '255,179,107'];

    let W = 0;
    let H = 0;
    let rocks: AsteroidRock[] = [];
    let last = 0;
    let rafId = 0;

    const spawn = (init: boolean): AsteroidRock => ({
      r: 0.9 + Math.random() * 1.7,
      v: 0.06 + Math.random() * 0.11,
      len: 20 + Math.random() * 54,
      c: cols[(Math.random() * 3) | 0],
      a: 0.48 + Math.random() * 0.5,
      x: Math.random() * (W + H),
      y: init ? Math.random() * H : -30,
    });

    const size = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = W * d;
      cv.height = H * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const n = Math.max(16, Math.min(34, Math.round(W / 46)));
      while (rocks.length < n) rocks.push(spawn(true));
      rocks.length = n;
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, W, H);
      for (const k of rocks) {
        k.x += DX * k.v * dt;
        k.y += DY * k.v * dt;
        if (k.y > H + 40 || k.x < -80) {
          Object.assign(k, spawn(false));
        }
        const tx = k.x - DX * k.len;
        const ty = k.y - DY * k.len;
        const g = ctx.createLinearGradient(k.x, k.y, tx, ty);
        g.addColorStop(0, `rgba(${k.c},${k.a})`);
        g.addColorStop(1, `rgba(${k.c},0)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = k.r;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(k.x, k.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        ctx.shadowColor = 'rgba(255,138,31,0.9)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(${k.c},${Math.min(1, k.a + 0.2)})`;
        ctx.beginPath();
        ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const loop = (t: number) => {
      const dt = Math.min(50, t - last || 16);
      last = t;
      if (!document.hidden) {
        draw(dt);
      }
      rafId = window.requestAnimationFrame(loop);
    };

    size();
    window.addEventListener('resize', size);

    if (reduce) {
      draw(0);
    } else {
      rafId = window.requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('resize', size);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
    >
      {/* Pulsing bottom volcanic glow */}
      {showHorizonGlow && (
        <div className="absolute -left-[10%] -right-[10%] -bottom-[30%] h-[75%] itk-horizon-glow pointer-events-none" />
      )}

      {/* Giant ITIHASKAR watermark at the bottom left */}
      {showWatermark && <div className="itk-watermark">ITIHASKAR</div>}

      {/* Right-to-left falling orange asteroids canvas */}
      <canvas
        id="rocks"
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
};
