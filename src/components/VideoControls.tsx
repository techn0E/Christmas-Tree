interface Props {
  setImages: (files: File[]) => void;
  setAudio: (file: File | null) => void;
  generateVideo: () => void;
  loadingFFmpeg: boolean;
}

function VideoControls({
  setImages,
  setAudio,
  generateVideo,
  loadingFFmpeg,
}: Props) {
  return (
    <div style={{ marginTop: 20 }}>
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

      <button onClick={generateVideo} disabled={loadingFFmpeg}>
        {loadingFFmpeg ? "Processing..." : "Generate MP4"}
      </button>
    </div>
  );
}

export default VideoControls;
