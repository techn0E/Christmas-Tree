import { useEffect, useRef } from "react";
import "../styles/Snowfall.css";

export default function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const snowflakes: Array<{
      x: number;
      y: number;
      radius: number;
      speed: number;
      drift: number;
    }> = [];

    // Create snowflakes
    for (let i = 0; i < 60; i++) {
      snowflakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        radius: Math.random() * 2 + 0.5,
        speed: Math.random() * 1.5 + 0.5,
        drift: Math.random() * 1 - 0.5,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";

      snowflakes.forEach((flake) => {
        flake.y += flake.speed;
        flake.x += flake.drift;

        // Wrap around edges
        if (flake.y > canvas.height) {
          flake.y = -flake.radius;
          flake.x = Math.random() * canvas.width;
        }

        if (flake.x > canvas.width) {
          flake.x = -flake.radius;
        } else if (flake.x < -flake.radius) {
          flake.x = canvas.width;
        }

        // Draw snowflake
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return <canvas ref={canvasRef} className="snowfall-canvas" />;
}
