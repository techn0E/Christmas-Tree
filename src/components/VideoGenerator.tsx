import { useState } from "react";
import ImageCanvas from "./ImageCanvas";
import VideoControls from "./VideoControls";
import BackgroundSelector from "./BackgroundSelector";
import TreeSelector from "./TreeSelector";
import CanvasSizeSelector from "./CanvasSizeSelector";
import { CANVAS_SIZES, type CanvasSize } from "../constants/canvasSizes";
import { useChristmasTreeVideo } from "./useChristmasTreeVideo";
import type { Background, TreeStyle, Sound } from "../types/defaults";
import { DEFAULT_BACKGROUNDS, DEFAULT_TREES, DEFAULT_SOUNDS } from "../types/defaults";
import "../styles/VideoGenerator.css";

export default function VideoGenerator() {
  const { images, setImages, positions, setPositions, setAudio, generateVideo, loadingFFmpeg, canvasRef, progress } =
    useChristmasTreeVideo();

  const [selectedBackground, setSelectedBackground] = useState<Background>(DEFAULT_BACKGROUNDS[0]);
  const [selectedTree, setSelectedTree] = useState<TreeStyle>(DEFAULT_TREES[0]);
  const [selectedCanvasSize, setSelectedCanvasSize] = useState<CanvasSize>(CANVAS_SIZES[0]);
  const [selectedSound, setSelectedSound] = useState<Sound>(DEFAULT_SOUNDS[0]);

  return (
    <div className="video-generator-container">
      <header className="video-generator-header">
        <h1>🎄 Christmas Tree Video Generator</h1>
        <p>Customize your tree with backgrounds, styles, and images, then export as MP4</p>
      </header>

      <div className="video-generator-content">
        {/* Left Sidebar - Selectors */}
        <div className="video-generator-selectors">
          <CanvasSizeSelector 
            selectedSize={selectedCanvasSize} 
            onSelectSize={setSelectedCanvasSize} 
          />
          <BackgroundSelector 
            selectedBackground={selectedBackground} 
            onSelectBackground={setSelectedBackground} 
          />
          <TreeSelector 
            selectedTree={selectedTree} 
            onSelectTree={setSelectedTree} 
          />
        </div>

        {/* Center - Canvas & Controls */}
        <div className="video-generator-main">
          <div className="canvas-wrapper">
            <ImageCanvas 
              canvasRef={canvasRef} 
              images={images} 
              positions={positions} 
              setPositions={setPositions}
              backgroundSrc={selectedBackground.src}
              treeSrc={selectedTree.src}
              width={selectedCanvasSize.width}
              height={selectedCanvasSize.height}
            />
          </div>
          <VideoControls 
            images={images} 
            setImages={setImages}
            selectedSound={selectedSound}
            onSelectSound={setSelectedSound}
            onCustomAudioChange={setAudio}
            generateVideo={generateVideo} 
            loadingFFmpeg={loadingFFmpeg} 
            progress={progress}
          />
        </div>
      </div>
    </div>
  );
}
