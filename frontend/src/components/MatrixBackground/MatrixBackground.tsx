import { useEffect, useRef, useState } from 'react';

export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) { setError('Canvas ref is null'); return; }

      const ctx = canvas.getContext('2d');
      if (!ctx) { setError('2D context unavailable'); return; }

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const chars = '01{}[]();+-*/=<>!|%'.split('');
      const fontSize = 13;
      const columns = Math.floor(canvas.width / fontSize);
      const drops: number[] = [];

      for (let x = 0; x < columns; x++) {
        drops[x] = Math.floor(Math.random() * -(canvas.height / fontSize));
      }

      const draw = () => {
        try {
          // Light fade overlay — warm white
          ctx.fillStyle = 'rgba(250, 248, 255, 0.06)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.font = fontSize + 'px "JetBrains Mono", monospace';

          for (let i = 0; i < drops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            const y = drops[i] * fontSize;

            if (drops[i] > 0) {
              // Soft indigo head
              ctx.fillStyle = 'rgba(99, 102, 241, 0.5)';
              ctx.fillText(text, i * fontSize, y);

              // Dimmer sky-blue trail
              if (drops[i] > 1) {
                ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
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
        } catch (e) {
          setError('Draw error: ' + String(e));
        }
      };

      const interval = setInterval(draw, 45);

      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const newColumns = Math.floor(canvas.width / fontSize);
        while (drops.length < newColumns) {
          drops.push(Math.floor(Math.random() * -(canvas.height / fontSize)));
        }
      };

      window.addEventListener('resize', handleResize);
      return () => { clearInterval(interval); window.removeEventListener('resize', handleResize); };
    } catch (err) {
      setError('Fatal: ' + String(err));
    }
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ opacity: 0.4 }}
        className="fixed inset-0 pointer-events-none z-0"
      />
    </>
  );
}
