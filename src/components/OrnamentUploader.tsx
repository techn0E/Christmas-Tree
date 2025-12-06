import { useState } from "react";
import "../styles/OrnamentUploader.css";

interface OrnamentUploaderProps {
  images: File[];
  setImages: (files: File[]) => void;
}

const MAX_IMAGES = 20;

export default function OrnamentUploader({ images, setImages }: OrnamentUploaderProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const totalImages = images.length + newFiles.length;
    
    if (totalImages > MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} ornaments allowed. You have ${images.length}.`);
      const canAdd = MAX_IMAGES - images.length;
      setImages([...images, ...newFiles.slice(0, canAdd)]);
    } else {
      setImages([...images, ...newFiles]);
    }
    
    e.target.value = '';
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const totalImages = images.length + imageFiles.length;
    
    if (totalImages > MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} ornaments allowed. You have ${images.length}.`);
      const canAdd = MAX_IMAGES - images.length;
      setImages([...images, ...imageFiles.slice(0, canAdd)]);
    } else {
      setImages([...images, ...imageFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    if (window.confirm("Remove all ornaments?")) {
      setImages([]);
    }
  };

  return (
    <div className="ornament-uploader">
      <div className="ornament-header">
        <h3>Add Ornaments</h3>
        <p className="ornament-count">{images.length} / {MAX_IMAGES}</p>
      </div>

      <div className="ornament-content">
        <div 
          className={`upload-box ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <label className="upload-label">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="file-input"
              disabled={images.length >= MAX_IMAGES}
            />
            <div className="upload-placeholder">
              <span className="upload-icon">+</span>
              <span className="upload-text">Click or drag images</span>
            </div>
          </label>
        </div>

        {images.length > 0 && (
          <div className="gallery">
            <div className="gallery-header">
              <span className="gallery-label">Ornaments</span>
              {images.length > 0 && (
                <button className="clear-btn" onClick={clearAll} title="Clear all">
                  Clear
                </button>
              )}
            </div>
            <div className="gallery-grid">
              {images.map((img, index) => (
                <div key={index} className="gallery-item">
                  <img src={URL.createObjectURL(img)} alt={`Ornament ${index}`} />
                  <button 
                    className="remove-btn"
                    onClick={() => removeImage(index)}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
