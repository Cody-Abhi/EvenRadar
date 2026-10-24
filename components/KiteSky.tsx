"use client";

import { useEffect, useRef, useState } from "react";

interface BackgroundKite {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  size: number;
  angle: number;
  targetAngle: number;
  colors: [string, string];
  tailNodes: { x: number; y: number }[];
  phase: number;
  opacity: number;
  repelFactor: number;
}

const BRUT_PALETTES: [string, string][] = [
  ["#ffd23f", "#ff6ec7"], // Yellow + Pink
  ["#4deeea", "#b08cff"], // Cyan + Purple
  ["#aeffb0", "#ff8c42"], // Lime + Orange
  ["#ff5a5f", "#4deeea"], // Red + Cyan
  ["#ffd23f", "#aeffb0"], // Yellow + Lime
  ["#ff6ec7", "#4deeea"], // Pink + Cyan
  ["#6ea8ff", "#ffd23f"], // Blue + Yellow
  ["#ff8c42", "#b08cff"], // Orange + Purple
];

// SVG Kite Cursor Data URI for instant browser pointer replacement
const KITE_CURSOR_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="translate(16,2)"><polygon points="0,0 9,12 0,22 -9,12" fill="%23ffd23f" stroke="%23000" stroke-width="2"/><polygon points="0,0 9,12 0,22" fill="%23ff6ec7" stroke="%23000" stroke-width="1.5"/><line x1="0" y1="0" x2="0" y2="22" stroke="%23000" stroke-width="1.8"/><path d="M -9,12 Q 0,7 9,12" fill="none" stroke="%23000" stroke-width="1.8"/><polygon points="-3,22 3,22 0,26" fill="%23000"/><circle cx="0" cy="0" r="1.5" fill="%23000"/></g></svg>`;

export default function KiteSky() {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isEnabled, setIsEnabled] = useState(true);
  const [isHoveringClickable, setIsHoveringClickable] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Mouse coordinates and velocity tracking
  const mouseRef = useRef({
    x: -1000,
    y: -1000,
    prevX: -1000,
    prevY: -1000,
    vx: 0,
    vy: 0,
    active: false,
  });

  // Dedicated Cursor Kite follower physics
  const cursorKiteRef = useRef({
    x: -1000,
    y: -1000,
    angle: 0,
    scale: 1,
    tailNodes: Array.from({ length: 9 }, () => ({ x: -1000, y: -1000 })),
  });

  const kitesRef = useRef<BackgroundKite[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Set custom cursor on body when enabled
  useEffect(() => {
    if (isEnabled) {
      document.body.style.cursor = `url('${KITE_CURSOR_SVG}') 16 2, auto`;
    } else {
      document.body.style.cursor = "auto";
    }

    return () => {
      document.body.style.cursor = "auto";
    };
  }, [isEnabled]);

  // Track mouse movements & interactive element hovers
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const prevX = mouseRef.current.x;
      const prevY = mouseRef.current.y;
      const vx = e.clientX - prevX;
      const vy = e.clientY - prevY;

      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
        prevX,
        prevY,
        vx,
        vy,
        active: true,
      };

      const target = e.target as HTMLElement | null;
      if (target) {
        const isClickable = Boolean(
          target.closest(
            'button, a, input, select, textarea, [role="button"], label, .brutal-press'
          )
        );
        setIsHoveringClickable(isClickable);
      }
    }

    function handleMouseDown() {
      setIsMouseDown(true);
    }

    function handleMouseUp() {
      setIsMouseDown(false);
    }

    function handleMouseLeave() {
      mouseRef.current.active = false;
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Animation Loop for both Background Kites and Cursor Kite
  useEffect(() => {
    if (!isEnabled) return;

    const bgCanvas = bgCanvasRef.current;
    const cursorCanvas = cursorCanvasRef.current;
    if (!bgCanvas || !cursorCanvas) return;

    const bgCtx = bgCanvas.getContext("2d");
    const cursorCtx = cursorCanvas.getContext("2d");
    if (!bgCtx || !cursorCtx) return;

    let width = (bgCanvas.width = cursorCanvas.width = window.innerWidth);
    let height = (bgCanvas.height = cursorCanvas.height = window.innerHeight);

    function handleResize() {
      if (!bgCanvas || !cursorCanvas) return;
      width = bgCanvas.width = cursorCanvas.width = window.innerWidth;
      height = bgCanvas.height = cursorCanvas.height = window.innerHeight;
      initBackgroundKites();
    }

    window.addEventListener("resize", handleResize);

    // Initialize flock of background kites
    function initBackgroundKites() {
      const kiteCount = Math.min(Math.max(Math.floor(width / 80), 16), 28);
      const newKites: BackgroundKite[] = [];

      for (let i = 0; i < kiteCount; i++) {
        const size = 28 + Math.random() * 24; // 28px to 52px
        const colors =
          BRUT_PALETTES[Math.floor(Math.random() * BRUT_PALETTES.length)];
        const x = Math.random() * width;
        const y = Math.random() * height;
        const baseSpeed = 0.5 + Math.random() * 0.8;
        const driftAngle = -Math.PI / 4 + (Math.random() - 0.5) * 0.7; // Gliding up & right

        newKites.push({
          x,
          y,
          vx: Math.cos(driftAngle) * baseSpeed,
          vy: Math.sin(driftAngle) * baseSpeed,
          baseVx: Math.cos(driftAngle) * baseSpeed,
          baseVy: Math.sin(driftAngle) * baseSpeed,
          size,
          angle: 0,
          targetAngle: 0,
          colors,
          tailNodes: Array.from({ length: 7 }, () => ({ x, y })),
          phase: Math.random() * Math.PI * 2,
          opacity: 0.65 + Math.random() * 0.3,
          repelFactor: 0,
        });
      }
      kitesRef.current = newKites;
    }

    initBackgroundKites();

    function render(now: number) {
      if (!bgCtx || !cursorCtx) return;
      const time = now * 0.001;

      bgCtx.clearRect(0, 0, width, height);
      cursorCtx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const REPEL_RADIUS = 220; // Proximity where kites detect cursor and start fleeing
      const MAX_REPEL_FORCE = 30; // Powerful evasion force

      // ============================================
      // 1. UPDATE & DRAW BACKGROUND KITES (LAYER 0)
      // ============================================
      kitesRef.current.forEach((kite) => {
        // Natural wind sway
        const windSway = Math.sin(time * 1.6 + kite.phase) * 0.9;
        const windLift = Math.cos(time * 1.3 + kite.phase) * 0.6;

        // "IF CURSOR WILL MOVE TOWARDS A KITE THEN THE KITE GOES FAR AWAY FROM IT"
        if (mouse.active && mouse.x >= 0 && mouse.y >= 0) {
          const dx = kite.x - mouse.x;
          const dy = kite.y - mouse.y;
          const dist = Math.hypot(dx, dy);

          if (dist < REPEL_RADIUS && dist > 0.001) {
            // Calculate evasive impulse (stronger as cursor gets closer)
            const proximity = (REPEL_RADIUS - dist) / REPEL_RADIUS;
            const force = Math.pow(proximity, 1.5) * MAX_REPEL_FORCE;

            // Normalized push-away direction vector
            const nx = dx / dist;
            const ny = dy / dist;

            // Propel kite away from the cursor
            kite.vx += nx * force * 1.25;
            kite.vy += ny * force * 1.25;

            // Bank kite aggressively in evasive flight direction
            kite.targetAngle = Math.atan2(kite.vy, kite.vx) - Math.PI / 2;
            kite.repelFactor = Math.min(kite.repelFactor + 0.25, 1);
          } else {
            kite.repelFactor = Math.max(kite.repelFactor - 0.04, 0);
          }
        } else {
          kite.repelFactor = Math.max(kite.repelFactor - 0.04, 0);
        }

        // Return velocity gradually to natural wind drift
        kite.vx += (kite.baseVx + windSway - kite.vx) * 0.035;
        kite.vy += (kite.baseVy + windLift - kite.vy) * 0.035;

        // Speed limit
        const speed = Math.hypot(kite.vx, kite.vy);
        const maxAllowed = 16;
        if (speed > maxAllowed) {
          kite.vx = (kite.vx / speed) * maxAllowed;
          kite.vy = (kite.vy / speed) * maxAllowed;
        }

        // Apply motion
        kite.x += kite.vx;
        kite.y += kite.vy;

        // Smooth rotation
        if (kite.repelFactor < 0.1) {
          kite.targetAngle = Math.sin(time * 2.2 + kite.phase) * 0.25;
        }
        kite.angle += (kite.targetAngle - kite.angle) * 0.12;

        // Soft screen boundary wrap
        const pad = 70;
        if (kite.x < -pad) kite.x = width + pad;
        if (kite.x > width + pad) kite.x = -pad;
        if (kite.y < -pad) kite.y = height + pad;
        if (kite.y > height + pad) kite.y = -pad;

        // Update tail node rope physics
        let prevNodeX = kite.x;
        let prevNodeY = kite.y + kite.size * 0.8;
        kite.tailNodes.forEach((node, idx) => {
          const segDist = 8 + idx * 1.6;
          const nodeDx = node.x - prevNodeX;
          const nodeDy = node.y - prevNodeY;
          const currentDist = Math.hypot(nodeDx, nodeDy);

          if (currentDist > segDist) {
            const angle = Math.atan2(nodeDy, nodeDx);
            node.x = prevNodeX + Math.cos(angle) * segDist;
            node.y = prevNodeY + Math.sin(angle) * segDist;
          }

          // Trailing wind flutter
          node.x += Math.sin(time * 7 + idx * 0.9 + kite.phase) * 1.4;
          node.y += 0.8; // subtle gravity pull

          prevNodeX = node.x;
          prevNodeY = node.y;
        });

        // ----------------------------------------
        // DRAW BACKGROUND KITE (bgCtx)
        // ----------------------------------------
        bgCtx.save();
        bgCtx.translate(kite.x, kite.y);
        bgCtx.rotate(kite.angle);
        bgCtx.globalAlpha = kite.opacity;

        const s = kite.size;
        const halfW = s * 0.55;
        const topH = s * 0.65;
        const botH = s * 0.75;

        // Left Half
        bgCtx.beginPath();
        bgCtx.moveTo(0, -topH);
        bgCtx.lineTo(-halfW, 0);
        bgCtx.lineTo(0, botH);
        bgCtx.closePath();
        bgCtx.fillStyle = kite.colors[0];
        bgCtx.fill();

        // Right Half
        bgCtx.beginPath();
        bgCtx.moveTo(0, -topH);
        bgCtx.lineTo(halfW, 0);
        bgCtx.lineTo(0, botH);
        bgCtx.closePath();
        bgCtx.fillStyle = kite.colors[1];
        bgCtx.fill();

        // Hard black Neobrutalist border
        bgCtx.beginPath();
        bgCtx.moveTo(0, -topH);
        bgCtx.lineTo(halfW, 0);
        bgCtx.lineTo(0, botH);
        bgCtx.lineTo(-halfW, 0);
        bgCtx.closePath();
        bgCtx.strokeStyle = "#000000";
        bgCtx.lineWidth = 2.2;
        bgCtx.stroke();

        // Central Spine ("Dhar")
        bgCtx.beginPath();
        bgCtx.moveTo(0, -topH);
        bgCtx.lineTo(0, botH);
        bgCtx.strokeStyle = "#000000";
        bgCtx.lineWidth = 1.8;
        bgCtx.stroke();

        // Curved Cross-Bow ("Kaan")
        bgCtx.beginPath();
        bgCtx.moveTo(-halfW, 0);
        bgCtx.quadraticCurveTo(0, -topH * 0.45, halfW, 0);
        bgCtx.strokeStyle = "#000000";
        bgCtx.lineWidth = 1.8;
        bgCtx.stroke();

        // Bottom Tail Triangle Tassel
        bgCtx.beginPath();
        bgCtx.moveTo(-s * 0.22, botH);
        bgCtx.lineTo(s * 0.22, botH);
        bgCtx.lineTo(0, botH + s * 0.3);
        bgCtx.closePath();
        bgCtx.fillStyle = kite.colors[0];
        bgCtx.fill();
        bgCtx.strokeStyle = "#000000";
        bgCtx.lineWidth = 1.5;
        bgCtx.stroke();

        bgCtx.restore();

        // Trailing Ribbon Tail with colorful bows
        if (kite.tailNodes.length > 1) {
          bgCtx.save();
          bgCtx.globalAlpha = kite.opacity * 0.85;

          bgCtx.beginPath();
          bgCtx.moveTo(kite.x, kite.y + kite.size * 0.8);
          for (let i = 0; i < kite.tailNodes.length - 1; i++) {
            const curr = kite.tailNodes[i];
            const next = kite.tailNodes[i + 1];
            const mx = (curr.x + next.x) / 2;
            const my = (curr.y + next.y) / 2;
            bgCtx.quadraticCurveTo(curr.x, curr.y, mx, my);
          }
          bgCtx.strokeStyle = "#000000";
          bgCtx.lineWidth = 1.4;
          bgCtx.stroke();

          // Ribbon bows along the tail
          kite.tailNodes.forEach((node, i) => {
            if (i % 2 === 1) {
              bgCtx.save();
              bgCtx.translate(node.x, node.y);
              bgCtx.rotate(Math.sin(time * 5 + i) * 0.6);
              const bowSize = 3.6;
              bgCtx.fillStyle = i % 4 === 1 ? kite.colors[0] : kite.colors[1];
              bgCtx.beginPath();
              bgCtx.ellipse(-bowSize, 0, bowSize, bowSize * 0.5, 0, 0, Math.PI * 2);
              bgCtx.ellipse(bowSize, 0, bowSize, bowSize * 0.5, 0, 0, Math.PI * 2);
              bgCtx.fill();
              bgCtx.strokeStyle = "#000000";
              bgCtx.lineWidth = 0.8;
              bgCtx.stroke();
              bgCtx.restore();
            }
          });

          bgCtx.restore();
        }
      });

      // ============================================
      // 2. DRAW INTERACTIVE KITE CURSOR (cursorCtx)
      // ============================================
      if (mouse.active && mouse.x >= 0 && mouse.y >= 0 && cursorCtx) {
        const ck = cursorKiteRef.current;

        // Smooth follow
        ck.x += (mouse.x - ck.x) * 0.6;
        ck.y += (mouse.y - ck.y) * 0.6;

        // Banking angle based on mouse speed & direction
        const speed = Math.hypot(mouse.vx, mouse.vy);
        let targetCursorAngle = 0;
        if (speed > 1.2) {
          targetCursorAngle = Math.atan2(mouse.vy, mouse.vx) - Math.PI / 2;
        } else {
          targetCursorAngle = Math.sin(time * 3.5) * 0.15;
        }

        ck.angle += (targetCursorAngle - ck.angle) * 0.22;

        // Click & hover feedback
        const targetScale = isMouseDown ? 0.82 : isHoveringClickable ? 1.25 : 1.0;
        ck.scale += (targetScale - ck.scale) * 0.28;

        // Update cursor kite tail physics
        let cPrevX = ck.x;
        let cPrevY = ck.y + 18 * ck.scale;
        ck.tailNodes.forEach((node, idx) => {
          const segDist = 6 + idx * 1.3;
          const nodeDx = node.x - cPrevX;
          const nodeDy = node.y - cPrevY;
          const currentDist = Math.hypot(nodeDx, nodeDy);

          if (currentDist > segDist) {
            const angle = Math.atan2(nodeDy, nodeDx);
            node.x = cPrevX + Math.cos(angle) * segDist;
            node.y = cPrevY + Math.sin(angle) * segDist;
          }

          node.x += Math.sin(time * 12 + idx * 0.9) * 1.6;
          node.y += 1.0;

          cPrevX = node.x;
          cPrevY = node.y;
        });

        // ----------------------------------------
        // DRAW CURSOR KITE
        // ----------------------------------------
        cursorCtx.save();
        cursorCtx.translate(ck.x, ck.y);
        cursorCtx.rotate(ck.angle);
        cursorCtx.scale(ck.scale, ck.scale);

        const cs = 26; // Cursor kite size
        const cHalfW = cs * 0.58;
        const cTopH = cs * 0.72;
        const cBotH = cs * 0.82;

        // Hard Drop Shadow
        cursorCtx.save();
        cursorCtx.translate(3.5, 4.5);
        cursorCtx.beginPath();
        cursorCtx.moveTo(0, -cTopH);
        cursorCtx.lineTo(cHalfW, 0);
        cursorCtx.lineTo(0, cBotH);
        cursorCtx.lineTo(-cHalfW, 0);
        cursorCtx.closePath();
        cursorCtx.fillStyle = "rgba(0, 0, 0, 0.35)";
        cursorCtx.fill();
        cursorCtx.restore();

        // Left Wing (Yellow or Lime on hover)
        cursorCtx.beginPath();
        cursorCtx.moveTo(0, -cTopH);
        cursorCtx.lineTo(-cHalfW, 0);
        cursorCtx.lineTo(0, cBotH);
        cursorCtx.closePath();
        cursorCtx.fillStyle = isHoveringClickable ? "#aeffb0" : "#ffd23f";
        cursorCtx.fill();

        // Right Wing (Pink or Cyan on hover)
        cursorCtx.beginPath();
        cursorCtx.moveTo(0, -cTopH);
        cursorCtx.lineTo(cHalfW, 0);
        cursorCtx.lineTo(0, cBotH);
        cursorCtx.closePath();
        cursorCtx.fillStyle = isHoveringClickable ? "#4deeea" : "#ff6ec7";
        cursorCtx.fill();

        // Thick Neobrutalist border
        cursorCtx.beginPath();
        cursorCtx.moveTo(0, -cTopH);
        cursorCtx.lineTo(cHalfW, 0);
        cursorCtx.lineTo(0, cBotH);
        cursorCtx.lineTo(-cHalfW, 0);
        cursorCtx.closePath();
        cursorCtx.strokeStyle = "#000000";
        cursorCtx.lineWidth = 2.6;
        cursorCtx.stroke();

        // Central Spine
        cursorCtx.beginPath();
        cursorCtx.moveTo(0, -cTopH);
        cursorCtx.lineTo(0, cBotH);
        cursorCtx.strokeStyle = "#000000";
        cursorCtx.lineWidth = 2.0;
        cursorCtx.stroke();

        // Curved Cross-Bow Spar
        cursorCtx.beginPath();
        cursorCtx.moveTo(-cHalfW, 0);
        cursorCtx.quadraticCurveTo(0, -cTopH * 0.45, cHalfW, 0);
        cursorCtx.strokeStyle = "#000000";
        cursorCtx.lineWidth = 2.0;
        cursorCtx.stroke();

        // Needle Point Tip (marks precision mouse coordinate)
        cursorCtx.beginPath();
        cursorCtx.arc(0, -cTopH, 2.5, 0, Math.PI * 2);
        cursorCtx.fillStyle = "#000000";
        cursorCtx.fill();

        // Bottom Tail Triangle Tassel
        cursorCtx.beginPath();
        cursorCtx.moveTo(-cs * 0.25, cBotH);
        cursorCtx.lineTo(cs * 0.25, cBotH);
        cursorCtx.lineTo(0, cBotH + cs * 0.35);
        cursorCtx.closePath();
        cursorCtx.fillStyle = isHoveringClickable ? "#4deeea" : "#ffd23f";
        cursorCtx.fill();
        cursorCtx.strokeStyle = "#000000";
        cursorCtx.lineWidth = 1.8;
        cursorCtx.stroke();

        cursorCtx.restore();

        // Cursor Kite Trailing Ribbon String
        cursorCtx.save();
        cursorCtx.beginPath();
        cursorCtx.moveTo(ck.x, ck.y + 16 * ck.scale);
        for (let i = 0; i < ck.tailNodes.length - 1; i++) {
          const curr = ck.tailNodes[i];
          const next = ck.tailNodes[i + 1];
          const mx = (curr.x + next.x) / 2;
          const my = (curr.y + next.y) / 2;
          cursorCtx.quadraticCurveTo(curr.x, curr.y, mx, my);
        }
        cursorCtx.strokeStyle = "#000000";
        cursorCtx.lineWidth = 1.8;
        cursorCtx.stroke();

        // Mini Bows along cursor tail
        ck.tailNodes.forEach((node, i) => {
          if (i % 2 === 1) {
            cursorCtx.save();
            cursorCtx.translate(node.x, node.y);
            cursorCtx.rotate(Math.sin(time * 12 + i) * 0.6);
            cursorCtx.fillStyle = i % 4 === 1 ? "#ff6ec7" : "#ffd23f";
            cursorCtx.beginPath();
            cursorCtx.ellipse(-3.2, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
            cursorCtx.ellipse(3.2, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
            cursorCtx.fill();
            cursorCtx.strokeStyle = "#000000";
            cursorCtx.lineWidth = 1;
            cursorCtx.stroke();
            cursorCtx.restore();
          }
        });

        cursorCtx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isEnabled, isHoveringClickable, isMouseDown]);

  // Burst wind gust: scatters all background kites in random directions
  function triggerWindGust() {
    kitesRef.current.forEach((kite) => {
      const gustAngle = (Math.random() - 0.5) * Math.PI * 2;
      const gustForce = 22 + Math.random() * 16;
      kite.vx = Math.cos(gustAngle) * gustForce;
      kite.vy = Math.sin(gustAngle) * gustForce;
      kite.targetAngle = gustAngle;
      kite.repelFactor = 1;
    });
  }

  return (
    <>
      {/* Background Kites Canvas (Behind content at z-0) */}
      {isEnabled && (
        <canvas
          ref={bgCanvasRef}
          className="pointer-events-none fixed inset-0 z-0 h-full w-full select-none"
          aria-hidden="true"
        />
      )}

      {/* Kite Cursor Canvas (Above content at z-[9999]) */}
      {isEnabled && (
        <canvas
          ref={cursorCanvasRef}
          className="pointer-events-none fixed inset-0 z-[9999] h-full w-full select-none"
          aria-hidden="true"
        />
      )}

      {/* Discrete Neobrutalist Kite Sky Pill Control */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 border-[2px] border-black bg-white p-1.5 shadow-[3px_3px_0_0_#000]">
        <button
          type="button"
          onClick={() => setIsEnabled(!isEnabled)}
          className={`px-2 py-1 text-[11px] font-bold uppercase transition-colors ${
            isEnabled ? "bg-brut-yellow text-black" : "bg-paper text-black/60"
          }`}
          title="Toggle Kite Cursor & Flying Kites in Background"
        >
          🪁 Kites: {isEnabled ? "ON" : "OFF"}
        </button>

        {isEnabled && (
          <button
            type="button"
            onClick={triggerWindGust}
            className="border-l border-black px-2 py-1 text-[11px] font-bold uppercase hover:bg-yellow-100 active:scale-95"
            title="Create a Wind Gust that scatters all kites!"
          >
            💨 Gust!
          </button>
        )}
      </div>
    </>
  );
}
