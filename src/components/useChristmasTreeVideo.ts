 
import { useState, useRef, useEffect } from "react";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

const ffmpeg = createFFmpeg({ log: true });

export function useChristmasTreeVideo() {
  const [images, setImages] = useState<File[]>([]);
  const [positions, setPositions] = useState<{ x: number; y: number }[]>([]);
  const [audio, setAudio] = useState<File | null>(null);
  const [loadingFFmpeg, setLoadingFFmpeg] = useState(false);
  const [progress, setProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize positions when images change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPositions((prev) => {
      // If we have the same number of positions as images, keep existing positions
      if (prev.length === images.length) return prev;
      
      // If we have fewer positions than images, add positions for new images
      if (prev.length < images.length) {
        const newPositions = [...prev];
        const startIndex = prev.length;
        for (let i = startIndex; i < images.length; i++) {
          newPositions.push({
            x: 50 + (i % 5) * 110,
            y: 50 + Math.floor(i / 5) * 110,
          });
        }
        return newPositions;
      }
      
      // If we have more positions than images, keep only the positions for remaining images
      return prev.slice(0, images.length);
    });
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

    ffmpeg.setLogger((log: { type: string; message: string }) => {
      const { type, message } = log;
      if (type === "fferr" || type === "ffout") {
        const timeMatch = message.match(/time=(\d+:\d+:\d+\.\d+)/);
        if (timeMatch) {
          const [h, m, s] = timeMatch[1].split(":").map(Number);
          const currentSeconds = h * 3600 + m * 60 + s;
          setProgress(Math.min((currentSeconds / duration) * 100, 100));
        }
      }
    });

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

    setProgress(100);
    setTimeout(() => setProgress(0), 800);

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
    positions,
    setPositions,
    audio,
    setAudio,
    generateVideo,
    loadingFFmpeg,
    canvasRef,
    progress,
  };
}
