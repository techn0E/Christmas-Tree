/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useRef, useEffect } from "react";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

const ffmpeg = createFFmpeg({ log: true });

export function useChristmasTreeVideo() {
  const [images, setImages] = useState<File[]>([]);
  const [audio, setAudio] = useState<File | null>(null);
  const [loadingFFmpeg, setLoadingFFmpeg] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // DRAW TREE (same as before)
  const drawTree = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bgImg = new Image();
    bgImg.src = "/images/ctree.jpg";
    await new Promise<void>((res) => (bgImg.onload = () => res()));

    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    let index = 0;

    for (let row = 0; index < images.length; row++) {
      const numInRow = row + 1;
      const y = 50 + row * 100;
      const rowWidth = numInRow * 100;
      const startX = (canvas.width - rowWidth) / 2;

      const rowPromises: Promise<void>[] = [];

      for (let col = 0; col < numInRow && index < images.length; col++) {
        const img = new Image();
        img.src = URL.createObjectURL(images[index]);

        const x = startX + col * 100;

        rowPromises.push(
          new Promise((resolve) => {
            img.onload = () => {
              ctx.drawImage(img, x, y, 80, 80);
              resolve();
            };
          })
        );

        index++;
      }

      await Promise.all(rowPromises);
    }
  };

  useEffect(() => {
    drawTree();
  }, [images]);
  
  const loadDefaultAudioFile = async (): Promise<File> => {
    const response = await fetch("/audio/default.mp3");
    const blob = await response.blob();
    return new File([blob], "default.mp3", { type: "audio/mpeg" });
  };

  const generateVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return alert("Canvas not found");

    let selectedAudio: File;

    if (!audio) {
      console.log("No audio uploaded — using default.mp3");
      selectedAudio = await loadDefaultAudioFile();
    } else {
      selectedAudio = audio;
    }

    const audioUrl = URL.createObjectURL(selectedAudio);

    setLoadingFFmpeg(true);
    if (!ffmpeg.isLoaded()) await ffmpeg.load();

    // convert canvas to file
    const imageBlob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png")
    );

    ffmpeg.FS("writeFile", "image.png", await fetchFile(imageBlob));
    ffmpeg.FS("writeFile", "audio.mp3", await fetchFile(selectedAudio));

    // get audio duration
    const audioEl = new Audio(audioUrl);
    await new Promise<void>((res) => {
      audioEl.onloadedmetadata = () => res();
    });

    const duration = audioEl.duration;

    // FFmpeg create video
    await ffmpeg.run(
      "-loop", "1",
      "-i", "image.png",
      "-i", "audio.mp3",
      "-c:v", "libx264",
      "-t", duration.toString(),
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-shortest",
      "output.mp4"
    );

    const data = ffmpeg.FS("readFile", "output.mp4");
    const blob = new Blob([data.buffer], { type: "video/mp4" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "christmas_tree.mp4";
    a.click();

    URL.revokeObjectURL(url);
    URL.revokeObjectURL(audioUrl);
    setLoadingFFmpeg(false);
  };

  return {
    images,
    setImages,
    audio,
    setAudio,
    generateVideo,
    loadingFFmpeg,
    canvasRef,
  };
}
