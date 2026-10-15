"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ACCENT_COLOR_HEX } from "@/lib/colorFormat";
import { connectorMotion } from "@/lib/motion";

/** Horizontal beam junction as viewport % (matches GlobeExperience `CONNECTOR_BAR_LEFT_PCT`). */
export const JUNCTION_X = 45;

type AxisSample = { s: number; x: number; y: number; nx: number; ny: number };

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

type PathPoint = { x: number; y: number };

type ViewportSize = { width: number; height: number };

function pctToPx(pct: number, size: number) {
  return (pct / 100) * size;
}

/** Dense baseline samples along pin → junction in screen pixels. */
function sampleConnectorAxisDense(px: number, py: number, yJ: number, xJ: number): AxisSample[] {
  const ax = px;
  const ay = py;
  const bx = xJ;
  const by = yJ;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const totalLen = len;
  const out: AxisSample[] = [];
  // Pixel space: ~1 sample every 6px, with a floor for short links.
  const steps = Math.max(72, Math.ceil(len / 6));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const arc = len * t;
    const s = arc / totalLen;
    const x = ax + dx * t;
    const y = ay + dy * t;
    out.push({ s, x, y, nx, ny });
  }
  return out;
}

/** Catmull–Rom → cubic Bézier: C¹-continuous path, no polyline corners. */
function smoothPathThroughPoints(pts: PathPoint[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (n === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i + 2 < n ? pts[i + 2] : pts[i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Gaussian width in path parameter s (0–1); peak follows packetCenter. */
const PACKET_GAUSS_SIGMA = 0.044;
/** Carrier cycles per σ in r = (s − center)/σ — cosine at r=0 aligns with envelope peak (symmetric burst). */
const PACKET_CARRIER_PER_SIGMA = 1.22;
const PACKET_BURST_PEAK = 0.64;
const PACKET_BASELINE_RIPPLE_AMP = 0.036;
const PACKET_BASELINE_RIPPLE_FREQ = 2.65;

function packetBaselineRipple(s: number, phase: number): number {
  return (
    PACKET_BASELINE_RIPPLE_AMP *
    Math.sin(2 * Math.PI * PACKET_BASELINE_RIPPLE_FREQ * s + phase * 1.61 + 0.35)
  );
}

/** Smooth multipath RF: detuned rays interfere along the link; timePhase drifts for slow fading. */
const RF_BASE_CYCLES = 5.35;
const RF_TIME_DRIFT_RAD_PER_SEC = 2.15;
const RF_PEAK = 0.54;
/** Straight chord: burst strength. RF layer: smooth baseline ripple mix. */
const RF_PACKET_BURST_GAIN = 0.82;
const RF_PACKET_RIPPLE_MIX = 0.58;
/** Extra gain on multipath so the bottom layer reads over the chord. */
const RF_LAYER_MULTIPATH_GAIN = 1.22;
const RF_CHAOS_GAIN = 1.45;

/** Stroke width in CSS pixels (screen-space SVG). */
const RF_LINK_STROKE_WIDTH = 1.65;

const PACKET_TRAVEL_SEC = 1.25;

/** Deterministic 0–1 “random” for burst identity / shaping. */
function rfHash01(k: number): number {
  const x = Math.sin(k * 127.1 + k * k * 0.0001 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function rfMultipathNormalOffset(s: number, timePhase: number, spatialPhase: number): number {
  const τ = 2 * Math.PI;
  const linkWin = 0.56 + 0.44 * Math.pow(Math.sin(Math.PI * clamp01(s)), 1.06);
  const t = timePhase;
  const sp = spatialPhase;
  const wobble =
    1 +
    0.18 * Math.sin(t * 0.52 + sp * 1.4 + s * 6.2) +
    0.11 * Math.sin(t * 0.89 - s * 4.7);
  const θ = τ * RF_BASE_CYCLES * s + spatialPhase + timePhase * 0.55;
  const mix =
    Math.sin(θ) * wobble +
    0.42 * Math.sin(θ * 1.036 + t * 1.14 + sp * 0.38 + Math.sin(t * 0.31) * 0.4) +
    0.3 * Math.sin(θ * 0.971 + t * -0.97 + sp * 0.55 + 1.05) +
    0.19 * Math.sin(θ * 1.058 + t * 0.51 + sp * 0.22 + 1.82) +
    0.12 * Math.sin(θ * 1.089 + t * -0.41 + sp * 0.71);
  const norm = 1 / 2.03;
  const carrier = RF_PEAK * linkWin * mix * norm;
  const fine =
    0.024 * Math.sin(τ * 18.2 * s + t * 2.55 + sp) +
    0.014 * Math.sin(τ * 26.5 * s - t * 1.62 + sp * 1.18) +
    0.018 * Math.sin(τ * (14.7 * s + 3.9 * Math.sin(t * 0.27)) + sp);
  return carrier + fine;
}

/** Wideband clutter + beats — smooth but erratic “spectrum” feel. */
function rfChaosOffset(s: number, timePhase: number, spatialPhase: number): number {
  const τ = 2 * Math.PI;
  const t = timePhase;
  const sp = spatialPhase;
  const iq =
    1 +
    0.26 * Math.sin(t * 0.44 + sp * 1.35) +
    0.16 * Math.sin(t * 0.71 - sp * 0.92 + s * 3.1);
  let rug = 0;
  rug += 0.048 * Math.sin(τ * (27.3 * s + 4.2 * t) + t * 2.05 + sp);
  rug += 0.041 * Math.sin(τ * (41.7 * s - 3.5 * t + sp * 1.7));
  rug += 0.035 * Math.sin(τ * (19.1 * s + 7.4 * t + sp * 2.05));
  rug += 0.032 * Math.sin(τ * (53.2 * s + 1.65 * t));
  rug += 0.04 * Math.sin(τ * 11.9 * s + t * 5.6) * Math.sin(τ * 2.35 * s + t * 1.8);
  rug += 0.028 * Math.sin(τ * (33.8 * s - 2.2 * t + sp * 2.4));
  const flutter =
    0.022 * Math.sin(τ * (63 * s + 11.2 * t + sp)) +
    0.017 * Math.sin(τ * (71 * s - 8.1 * t + sp * 3.2)) +
    0.014 * Math.sin(τ * (88 * s + 6.3 * t));
  return RF_CHAOS_GAIN * iq * (rug + flutter);
}

/** Bottom layer: multipath + chaos + ripple along the whole link. */
function rfLayerNormalOffset(
  s: number,
  phase: number,
  timePhase: number,
  spatialPhase: number,
): number {
  return (
    RF_LAYER_MULTIPATH_GAIN * rfMultipathNormalOffset(s, timePhase, spatialPhase) +
    rfChaosOffset(s, timePhase, spatialPhase) +
    RF_PACKET_RIPPLE_MIX * packetBaselineRipple(s, phase)
  );
}

function buildRfLayerPathD(
  px: number,
  py: number,
  yJ: number,
  xJ: number,
  timePhase: number,
  spatialPhase: number,
  phase: number,
  ampScale: number,
): string {
  const samples = sampleConnectorAxisDense(px, py, yJ, xJ);
  const pts: PathPoint[] = [];
  for (const p of samples) {
    const off = rfLayerNormalOffset(p.s, phase, timePhase, spatialPhase) * ampScale;
    pts.push({ x: p.x + p.nx * off, y: p.y + p.ny * off });
  }
  return smoothPathThroughPoints(pts);
}

type RfBurstShape = {
  centerJitter: number;
  sigmaScale: number;
  gain: number;
  carrierMul: number;
  phaseOff: number;
  h2w: number;
  envPow: number;
};

function rfBurstShape(burstKey: number, pinPhase: number): RfBurstShape {
  const h = (n: number) => rfHash01(burstKey * 2654435761 + n * 1597334677);
  return {
    centerJitter: (h(1) - 0.5) * 0.05,
    sigmaScale: 0.82 + h(2) * 0.34,
    gain: RF_PACKET_BURST_GAIN * (0.62 + h(3) * 0.38),
    carrierMul: 0.82 + h(4) * 0.44,
    phaseOff: (h(5) - 0.5) * 5.5 + pinPhase * 0.15 + h(6) * Math.PI,
    h2w: h(7) * 0.38,
    envPow: 0.82 + h(8) * 0.38,
  };
}

/** Pulse normal offset on chord; tails decay to ~0 for straight pin→junction runs. */
function straightBurstNormalOffset(
  s: number,
  packetCenter: number,
  phase: number,
  shape: RfBurstShape,
): number {
  const c = clamp01(packetCenter + shape.centerJitter);
  const sigma = PACKET_GAUSS_SIGMA * shape.sigmaScale;
  const r = (s - c) / sigma;
  const envelope = Math.pow(Math.exp(-r * r), shape.envPow);
  const u = 2 * Math.PI * PACKET_CARRIER_PER_SIGMA * shape.carrierMul * r + phase + shape.phaseOff;
  const carrier = Math.cos(u) + shape.h2w * Math.cos(2 * u + 1.18);
  const norm = 1 / (1 + Math.abs(shape.h2w));
  return shape.gain * PACKET_BURST_PEAK * envelope * carrier * norm;
}

/** Full chord: straight segments before/after pulse, burst only where envelope is significant. */
function buildStraightChordWithBurstPathD(
  px: number,
  py: number,
  yJ: number,
  xJ: number,
  packetCenter: number,
  phase: number,
  burstKey: number,
  ampScale: number,
): string {
  const shape = rfBurstShape(burstKey, phase);
  const samples = sampleConnectorAxisDense(px, py, yJ, xJ);
  const pts: PathPoint[] = [];
  for (const p of samples) {
    const off = straightBurstNormalOffset(p.s, packetCenter, phase, shape) * ampScale;
    pts.push({ x: p.x + p.nx * off, y: p.y + p.ny * off });
  }
  return smoothPathThroughPoints(pts);
}

/** Multipath layer + modulated chord burst along pin → junction (screen-pixel coords). */
function RfLinkPaths({
  pinXPct,
  pinYPct,
  yJunctionPct,
  viewport,
  reducedMotion,
  pathsActive,
  lineColor = ACCENT_COLOR_HEX,
}: {
  pinXPct: number;
  pinYPct: number;
  yJunctionPct: number;
  viewport: ViewportSize;
  reducedMotion: boolean;
  /** When false, paths are cleared and the RF loop is paused. */
  pathsActive: boolean;
  lineColor?: string;
}) {
  const rfLayerRef = useRef<SVGPathElement | null>(null);
  const chordRef = useRef<SVGPathElement | null>(null);
  const propsRef = useRef({
    pinXPct,
    pinYPct,
    yJunctionPct,
    width: viewport.width,
    height: viewport.height,
  });
  useLayoutEffect(() => {
    propsRef.current = {
      pinXPct,
      pinYPct,
      yJunctionPct,
      width: viewport.width,
      height: viewport.height,
    };
  }, [pinXPct, pinYPct, yJunctionPct, viewport.width, viewport.height]);

  useEffect(() => {
    if (!pathsActive || viewport.width <= 0 || viewport.height <= 0) {
      rfLayerRef.current?.setAttribute("d", "");
      chordRef.current?.setAttribute("d", "");
      return;
    }

    const apply = (packetCenter: number, timePhase: number, burstKey: number) => {
      const { pinXPct: pxPct, pinYPct: pyPct, yJunctionPct: yJPct, width, height } =
        propsRef.current;
      const px = pctToPx(pxPct, width);
      const py = pctToPx(pyPct, height);
      const yJ = pctToPx(yJPct, height);
      const xJ = pctToPx(JUNCTION_X, width);
      // Keep RF amplitude similar to the old 0–100 viewBox calibration.
      const ampScale = Math.min(width, height) / 100;
      const phase = pxPct * 0.083 + pyPct * 0.057;
      const spatialPhase = pxPct * 0.092 + pyPct * 0.068;
      const rfD = buildRfLayerPathD(
        px,
        py,
        yJ,
        xJ,
        timePhase,
        spatialPhase,
        phase,
        ampScale,
      );
      const chordD = buildStraightChordWithBurstPathD(
        px,
        py,
        yJ,
        xJ,
        packetCenter,
        phase,
        burstKey,
        ampScale,
      );
      rfLayerRef.current?.setAttribute("d", rfD);
      chordRef.current?.setAttribute("d", chordD);
    };

    if (reducedMotion) {
      const { pinXPct: pxPct, pinYPct: pyPct } = propsRef.current;
      const burstKey = Math.floor(pxPct * 73 + pyPct * 91) | 0;
      apply(0.44, 1.15, burstKey);
      return;
    }

    const t0 = performance.now();
    let rafId = 0;
    const loop = (now: number) => {
      const elapsed = (now - t0) / 1000;
      const u = elapsed % PACKET_TRAVEL_SEC;
      const packetCenter = 0.065 + (u / PACKET_TRAVEL_SEC) * 0.87;
      const timePhase = elapsed * RF_TIME_DRIFT_RAD_PER_SEC;
      const { pinXPct: pxPct, pinYPct: pyPct } = propsRef.current;
      const burstKey =
        (Math.floor(elapsed / PACKET_TRAVEL_SEC) * 1009 +
          Math.floor(pxPct * 73 + pyPct * 91)) |
        0;
      apply(packetCenter, timePhase, burstKey);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [pathsActive, pinXPct, pinYPct, yJunctionPct, viewport.width, viewport.height, reducedMotion]);

  const pathRender = {
    shapeRendering: "geometricPrecision" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const commonLine = {
    fill: "none" as const,
    stroke: lineColor,
    strokeOpacity: 1,
    strokeWidth: RF_LINK_STROKE_WIDTH,
    ...pathRender,
  };

  return (
    <>
      <path ref={rfLayerRef} {...commonLine} />
      <path ref={chordRef} {...commonLine} />
    </>
  );
}

const svgClass =
  "pointer-events-none absolute inset-0 h-full w-full overflow-visible";

/** Opacity-in for signal paths; keep in sync with horizontal beam extend in GlobeExperience. */
export const CONNECTOR_CONNECT_SEC = connectorMotion.connect.duration;
const svgPresenceTransition = {
  duration: connectorMotion.connect.duration,
  ease: connectorMotion.connect.ease,
};

/** Matches horizontal beam retract in GlobeExperience when switching sections (AnimatePresence exit used last “in” transition otherwise → too slow). */
export const CONNECTOR_RETRACT_SEC = connectorMotion.retract.duration;
const svgRetractTransition = {
  duration: connectorMotion.retract.duration,
  ease: connectorMotion.retract.ease,
};

type ResumeConnectorProps = {
  /** Pin X as viewport percent (0–100). */
  pinX: number;
  /** Pin Y as viewport percent (0–100). */
  pinY: number;
  /** Junction Y as viewport percent (0–100). */
  yJunction: number;
  reducedMotion: boolean;
  /** When false, paths are hidden and the RF loop pauses (e.g. brief gap when switching pins). */
  pathsActive: boolean;
  lineColor?: string;
};

export function ResumeConnector({
  pinX,
  pinY,
  yJunction,
  reducedMotion,
  pathsActive,
  lineColor = ACCENT_COLOR_HEX,
}: ResumeConnectorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setViewport((prev) => {
        if (
          Math.abs(prev.width - rect.width) < 0.5 &&
          Math.abs(prev.height - rect.height) < 0.5
        ) {
          return prev;
        }
        return { width: rect.width, height: rect.height };
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.svg
      ref={svgRef}
      className={svgClass}
      style={{
        color: lineColor,
        filter: `drop-shadow(0 0 4px ${lineColor}88) drop-shadow(0 0 10px ${lineColor}44)`,
      }}
      width="100%"
      height="100%"
      viewBox={
        viewport.width > 0 && viewport.height > 0
          ? `0 0 ${viewport.width} ${viewport.height}`
          : undefined
      }
      preserveAspectRatio="xMidYMid meet"
      initial={{ opacity: 0 }}
      animate={{ opacity: pathsActive ? 1 : 0 }}
      exit={{ opacity: 0, transition: svgRetractTransition }}
      transition={pathsActive ? svgPresenceTransition : svgRetractTransition}
    >
      <RfLinkPaths
        pinXPct={pinX}
        pinYPct={pinY}
        yJunctionPct={yJunction}
        viewport={viewport}
        reducedMotion={reducedMotion}
        pathsActive={pathsActive}
        lineColor="currentColor"
      />
    </motion.svg>
  );
}
