/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });

function App() {
  const [images, setImages] = useState<File[]>([]);
  const [audio, setAudio] = useState<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas animation: draw tree layout
  const drawTree = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tree background
    const bgImg = new Image();
    bgImg.src = '/images/ctree.jpg'; // make sure path is correct in React public folder
    bgImg.onload = () => {
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      // Draw uploaded images on top
      const rows = images.length;
      let index = 0;
      for (let r = 0; r < rows; r++) {
        const numInRow = r + 1;
        const y = 50 + r * 100;
        const rowWidth = numInRow * 100;
        const startX = (canvas.width - rowWidth) / 2;
        for (let c = 0; c < numInRow && index < images.length; c++) {
          const x = startX + c * 100;
          const img = new Image();
          img.src = URL.createObjectURL(images[index]);
          img.onload = () => ctx.drawImage(img, x, y, 80, 80);
          index++;
        }
      }
    };
  };

  useEffect(() => {
    drawTree();
  }, [drawTree, images]);

  const generateVideo = async () => {
    if (!ffmpeg.isLoaded()) await ffmpeg.load();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const frames: Blob[] = [];

    // Capture canvas frames (simple static frame for now)
    const frameBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), "image/png");
    });
    frames.push(frameBlob);

    // Write frames to ffmpeg FS
    for (let i = 0; i < frames.length; i++) {
      const data = await fetchFile(frames[i]); // await the fetchFile result
      ffmpeg.FS("writeFile", `img${i}.png`, data);
    }

    if (audio) {
      const audioData = await fetchFile(audio);
      ffmpeg.FS("writeFile", "audio.mp3", audioData);
    }

    // Run ffmpeg to create video
    await ffmpeg.run(
      "-loop", "1",         
      "-i", "img0.png",
      "-i", "audio.mp3",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-preset", "veryfast",
      "-tune", "stillimage",
      "-shortest",
      "output.mp4"
    );

    // Get video data
    const data = ffmpeg.FS("readFile", "output.mp4");
    const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "christmas_tree.mp4";
    a.click();
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>🎄 Christmas Tree Video Generator</h1>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setImages(Array.from(e.target.files || []))}
      />
      <br /><br />
      <input type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files?.[0] || null)} />
      <br /><br />
      <canvas ref={canvasRef} width={600} height={600} style={{ border: "1px solid #555" }} />
      <br /><br />
      <button onClick={generateVideo}>Generate Video</button>
    </div>
  );
}

export default App;
