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


  const generateVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return alert("Canvas not found");
    if (!audio) return alert("Please upload an audio file");

    const audioUrl = URL.createObjectURL(audio);

    setLoadingFFmpeg(true);
    if (!ffmpeg.isLoaded()) await ffmpeg.load();

    // 1. Get the canvas as an image
    const imageBlob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png")
    );
    ffmpeg.FS("writeFile", "image.png", await fetchFile(imageBlob));
    ffmpeg.FS("writeFile", "audio.mp3", await fetchFile(audio));

    // 2. Get audio duration
    const audioEl = new Audio(audioUrl);
    await new Promise<void>((resolve, reject) => {
      audioEl.onloadedmetadata = () => resolve();
      audioEl.onerror = () => reject();
      audioEl.load();
    });
    const durationSec = audioEl.duration;

    // 3. Run FFmpeg: repeat the image for the audio duration
    await ffmpeg.run(
      "-loop", "1",           // loop the image
      "-i", "image.png",      // input image
      "-i", "audio.mp3",      // input audio
      "-c:v", "libx264",
      "-t", durationSec.toString(), // set video duration
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-shortest",            // stop at the end of audio
      "output.mp4"
    );

    // 4. Save MP4
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
