import { useState, useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '@/store/game.store';

const LERP_FACTOR = 0.08;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function CrashCurve() {
  const { multiplier, roundStatus } = useGameStore();
  const [points, setPoints] = useState<{ m: number; id: number }[]>([]);

  const smoothVMin = useRef(100);
  const smoothVMax = useRef(250);
  const [smoothWindow, setSmoothWindow] = useState({ vMin: 100, vMax: 250 });

  const width   = 800;
  const height  = 450;
  const padding = { bottom: 20, right: 110, top: 60 };

  const getXSVG = (index: number, totalPoints: number) => {
    if (totalPoints <= 0) return 0;
    return Math.pow(index / totalPoints, 1.5) * (width - padding.right);
  };

  const getYSVG = (m: number, vMin: number, vMax: number) => {
    const ratio = (m - vMin) / (vMax - vMin);
    return (height - padding.bottom) - ratio * (height - padding.bottom - padding.top);
  };

  const getTargetWindow = (mult: number) => {
    const currentX  = mult / 100;
    const rawStep   = currentX * 0.5;
    const niceSteps = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
    const majorStep = niceSteps.find(s => s >= rawStep) ?? 100;

    const centerX    = currentX + majorStep * 0.3;
    const windowHalf = majorStep * 1.5;

    return {
      vMax: (centerX + windowHalf) * 100,
      vMin: Math.max(100, (centerX - windowHalf) * 100),
      majorStep,
    };
  };

  useEffect(() => {
    if (roundStatus === 'BETTING' || roundStatus === null) {
      setPoints([{ m: 100, id: 0 }]);
      smoothVMin.current = 100;
      smoothVMax.current = 250;
      setSmoothWindow({ vMin: 100, vMax: 250 });
      return;
    }
    if (roundStatus === 'RUNNING') {
      setPoints(prev => [...prev, { m: multiplier, id: prev.length }].slice(-200));
    }
  }, [multiplier, roundStatus]);

  useEffect(() => {
    if (roundStatus !== 'RUNNING') return;

    let rafId: number;

    const animate = () => {
      const { vMin: targetMin, vMax: targetMax } = getTargetWindow(multiplier);

      smoothVMin.current = lerp(smoothVMin.current, targetMin, LERP_FACTOR);
      smoothVMax.current = lerp(smoothVMax.current, targetMax, LERP_FACTOR);

      setSmoothWindow({
        vMin: smoothVMin.current,
        vMax: smoothVMax.current,
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [roundStatus, multiplier]);

  const { pathData, areaData, gridLines } = useMemo(() => {
    const { vMin, vMax } = smoothWindow;
    const { majorStep }  = getTargetWindow(multiplier);

    const minorStep  = majorStep / 5;
    const vMinX      = vMin / 100;
    const vMaxX      = vMax / 100;
    const firstMinor = Math.ceil(vMinX / minorStep) * minorStep;
    const lines: { y: number; label: string | null; isMajor: boolean }[] = [];

    for (let mx = firstMinor; mx <= vMaxX + minorStep; mx += minorStep) {
      if (mx < 1.0) continue;
      const yPos    = getYSVG(mx * 100, vMin, vMax);
      if (yPos < -20 || yPos > height + 20) continue;
      const isMajor = Math.abs(mx % majorStep) < majorStep * 0.01 ||
                      Math.abs(mx % majorStep - majorStep) < majorStep * 0.01;
      lines.push({
        y:       yPos,
        label:   isMajor ? mx.toFixed(mx < 10 ? 2 : 0) + 'x' : null,
        isMajor,
      });
    }

    if (points.length < 2) {
      const x0 = getXSVG(0, 1);
      const y0 = getYSVG(points[0]?.m ?? 100, vMin, vMax);
      return {
        pathData:  `M ${x0},${y0}`,
        areaData:  `M ${x0},${y0} L ${x0},${height} L 0,${height} Z`,
        gridLines: lines,
      };
    }

    const svgPts = points.map((p, i) => ({
      x: getXSVG(i, points.length - 1),
      y: getYSVG(p.m, vMin, vMax),
    }));

    let path = `M ${svgPts[0].x},${svgPts[0].y}`;
    for (let i = 1; i < svgPts.length; i++) {
      const prev = svgPts[i - 1];
      const curr = svgPts[i];
      const cpX  = (prev.x + curr.x) / 2;
      path += ` C ${cpX},${prev.y} ${cpX},${curr.y} ${curr.x},${curr.y}`;
    }

    const last = svgPts[svgPts.length - 1];
    return {
      pathData:  path,
      areaData:  `${path} L ${last.x},${height} L 0,${height} Z`,
      gridLines: lines,
    };
  }, [points, smoothWindow]);

  const isCrashed = roundStatus === 'CRASHED';
  const lineColor = isCrashed ? '#ef4444' : '#22c55e';
  const { vMin: viewMinY, vMax: viewMaxY } = smoothWindow;

  return (
    <div className="w-full bg-zinc-950 p-2 rounded-[3rem] border-4 border-zinc-900 relative overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0"    />
          </linearGradient>
          <filter id="neon">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1="0" y1={line.y}
              x2={width - padding.right} y2={line.y}
              stroke={line.isMajor ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)'}
              strokeWidth={line.isMajor ? 1.5 : 1}
            />
            {line.label && (
              <text
                x={width - padding.right + 12}
                y={line.y + 5}
                fill="#64748b"
                fontSize="22"
                fontWeight="700"
                fontStyle="italic"
              >
                {line.label}
              </text>
            )}
          </g>
        ))}

        <path d={areaData} fill="url(#curveFill)" />
        <path
          d={pathData}
          fill="none"
          stroke={lineColor}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#neon)"
        />

        {points.length > 0 && (() => {
          const last = points[points.length - 1];
          const px   = getXSVG(points.length - 1, points.length - 1);
          const py   = getYSVG(last.m, viewMinY, viewMaxY);
          return (
            <g transform={`translate(${px}, ${py})`}>
              <circle r="14" fill={lineColor} opacity="0.2" className="animate-ping" />
              <circle r="6"  fill="white" />
            </g>
          );
        })()}
      </svg>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
        <h1 className={`text-[120px] font-black italic tracking-tighter opacity-10 transition-colors duration-150 ${isCrashed ? 'text-red-500' : 'text-white'}`}>
          {(multiplier / 100).toFixed(2)}x
        </h1>
      </div>
    </div>
  );
}
