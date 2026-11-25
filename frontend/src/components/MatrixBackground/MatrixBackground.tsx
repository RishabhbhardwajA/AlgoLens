import { useEffect, useRef } from "react";

export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = "01{}[]();+-*/=<>!|%".split("");
    const fontSize = 13;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = [];

    for (let x = 0; x < columns; x++) {
      drops[x] = Math.floor(Math.random() * -(canvas.height / fontSize));
    }

    const draw = () => {
      if (document.hidden) return;
      ctx.fillStyle = "rgba(250, 248, 255, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = fontSize + 'px "JetBrains Mono", monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const y = drops[i] * fontSize;

        if (drops[i] > 0) {
          ctx.fillStyle = "rgba(99, 102, 241, 0.5)";
          ctx.fillText(text, i * fontSize, y);

          if (drops[i] > 1) {
            ctx.fillStyle = "rgba(56, 189, 248, 0.18)";
            ctx.fillText(
              chars[Math.floor(Math.random() * chars.length)],
              i * fontSize,
              y - fontSize
            );
          }
        }

        if (y > canvas.height && Math.random() > 0.97) drops[i] = 0;
        drops[i]++;
      }
    };

    const interval = window.setInterval(draw, 45);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const newColumns = Math.max(0, Math.floor(canvas.width / fontSize));
      if (drops.length > newColumns) {
        drops.length = newColumns;
      }
      while (drops.length < newColumns) {
        drops.push(Math.floor(Math.random() * -(canvas.height / fontSize)));
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ opacity: 0.36 }}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
