/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from "react";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

const ffmpeg = createFFmpeg({ log: true });

function App() {
  const [images, setImages] = useState<File[]>([]);
  const [audio, setAudio] = useState<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadingFFmpeg, setLoadingFFmpeg] = useState(false);

  // Draw Christmas tree with uploaded images
  const drawTree = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bgImg = new Image();
    bgImg.src = "/images/ctree.jpg";
    await new Promise<void>((res) => { bgImg.onload = () => res(); });

    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    const totalImages = images.length;
    let index = 0;

    for (let row = 0; index < totalImages; row++) {
      const numInRow = row + 1;
      const y = 50 + row * 100;
      const rowWidth = numInRow * 100;
      const startX = (canvas.width - rowWidth) / 2;

      const rowPromises = [];

      for (let col = 0; col < numInRow && index < totalImages; col++) {
        const x = startX + col * 100;
        const imgFile = images[index];
        const img = new Image();
        img.src = URL.createObjectURL(imgFile);

        const p = new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, x, y, 80, 80);
            resolve();
          };
        });

        rowPromises.push(p);
        index++;
      }

      // Wait for this row to finish drawing
      await Promise.all(rowPromises);
    }
  };


  useEffect(() => {
    drawTree();
  }, [images]);

  const captureFrame = async (canvas: HTMLCanvasElement) => {
    return new Promise<Blob>((resolve) => {
      // Use toBlob to get current canvas content
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, "image/png");
    });
  };

  const generateVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return alert("Canvas not found");
    if (!audio) return alert("Please upload an audio file");

    const audioUrl = URL.createObjectURL(audio);

    setLoadingFFmpeg(true);
    if (!ffmpeg.isLoaded()) await ffmpeg.load();

    const fps = 30;
    const durationSec = 5; // adjust to audio duration
    const frameCount = Math.ceil(durationSec * fps);

    // Wait until all images are loaded
    await Promise.all(images.map((img) => new Promise<void>((res) => {
      const temp = new Image();
      temp.src = URL.createObjectURL(img);
      temp.onload = () => res();
    })));

    // Write frames
    for (let i = 0; i < frameCount; i++) {
      await drawTree(); // wait until everything is drawn
      const frameBlob = await captureFrame(canvas);
      ffmpeg.FS(
        "writeFile",
        `frame_${i.toString().padStart(4, "0")}.png`,
        await fetchFile(frameBlob)
      );
    }

    ffmpeg.FS("writeFile", "audio.mp3", await fetchFile(audio));

    await ffmpeg.run(
      "-framerate", fps.toString(),
      "-i", "frame_%04d.png",
      "-i", "audio.mp3",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-shortest",
      "output.mp4"
    );

    const data = ffmpeg.FS("readFile", "output.mp4");
    const mp4Blob = new Blob([data.buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(mp4Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "christmas_tree.mp4";
    a.click();

    URL.revokeObjectURL(url);
    URL.revokeObjectURL(audioUrl);
    setLoadingFFmpeg(false);
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

      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setAudio(e.target.files?.[0] || null)}
      />
      <br /><br />

      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        style={{ border: "1px solid #555" }}
      />
      <br /><br />

      <button onClick={generateVideo} disabled={loadingFFmpeg}>
        {loadingFFmpeg ? "Processing MP4..." : "Generate MP4 Video"}
      </button>
    </div>
  );
}

export default App;
