import ImageCanvas from "./ImageCanvas";
import VideoControls from "./VideoControls";
import { useChristmasTreeVideo } from "./useChristmasTreeVideo";

function VideoGenerator() {
  const {
    setImages,
    setAudio,
    generateVideo,
    loadingFFmpeg,
    canvasRef,
  } = useChristmasTreeVideo();

  return (
    <div style={{ textAlign: "center", padding: 30 }}>
      <h1>Christmas Tree Video Generator</h1>

      <VideoControls
        setImages={setImages}
        setAudio={setAudio}
        generateVideo={generateVideo}
        loadingFFmpeg={loadingFFmpeg}
      />

      <ImageCanvas canvasRef={canvasRef} />
    </div>
  );
}

export default VideoGenerator;
