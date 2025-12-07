import OrnamentUploader from "./OrnamentUploader";
import SoundSelector from "./SoundSelector";
import type { Sound } from "../types/defaults";
import "../styles/VideoControls.css";

interface Props {
  images: File[];
  setImages: (files: File[]) => void;
  selectedSound: Sound;
  onSelectSound: (sound: Sound) => void;
  onCustomAudioChange?: (file: File | null) => void;
  generateVideo: () => void;
  loadingFFmpeg: boolean;
  progress: number;
}

function VideoControls({
  images,
  setImages,
  selectedSound,
  onSelectSound,
  onCustomAudioChange,
  generateVideo,
  loadingFFmpeg,
  progress,
}: Props) {
  return (
    <div className="video-controls">
      <div className="controls-grid">
        <div className="controls-item">
          <SoundSelector 
            selectedSound={selectedSound}
            onSelectSound={onSelectSound}
            onCustomAudioChange={onCustomAudioChange}
          />
        </div>
        
        <div className="controls-item">
          <OrnamentUploader 
            images={images}
            setImages={setImages}
          />
        </div>
      </div>

      <div className="generate-section">
        <button 
          className="generate-btn"
          onClick={generateVideo} 
          disabled={loadingFFmpeg}
        >
          {loadingFFmpeg ? "🎬 Processing..." : "🎥 Generate MP4"}
        </button>
      </div>

      {loadingFFmpeg && (
        <div className="ffmpeg-progress-container">
          <div className="ffmpeg-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

export default VideoControls;
