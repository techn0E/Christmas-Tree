/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useRef } from "react";

interface ImageCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  images: File[];
  positions: { x: number; y: number }[];
  setPositions: React.Dispatch<React.SetStateAction<{ x: number; y: number }[]>>;
  backgroundSrc?: string;
  treeSrc?: string;
  width?: number;
  height?: number;
  // PROPS for image item size and fit
  itemWidth?: number;
  itemHeight?: number;
  itemFit?: 'cover' | 'contain'; // NEW PROP
}

const DEFAULT_ITEM_WIDTH = 200;
const DEFAULT_ASPECT_RATIO = 3 / 4;
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1350;

// Helper to calculate the final image size
const getItemSize = (
  itemWidth: number = DEFAULT_ITEM_WIDTH,
  itemHeight?: number
) => {
  const w = itemWidth;
  const h = itemHeight ?? itemWidth / DEFAULT_ASPECT_RATIO;
  return { w, h };
};

export default function ImageCanvas({
  canvasRef,
  images,
  positions,
  setPositions,
  backgroundSrc,
  treeSrc,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  // Destructure new props
  itemWidth,
  itemHeight,
  itemFit = 'contain', // Default to 'cover'
}: ImageCanvasProps) {
  const [loadedImages, setLoadedImages] = useState<HTMLImageElement[]>([]);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [treeLoaded, setTreeLoaded] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const dragIndexRef = useRef<number | null>(null);
  const bgImage = useRef<HTMLImageElement | null>(null);
  const treeImage = useRef<HTMLImageElement | null>(null);
  const currentPositions = useRef<{ x: number; y: number }[]>([]);

  // Calculate the current item size based on props
  const { w: currentItemWidth, h: currentItemHeight } = getItemSize(itemWidth, itemHeight);


  // Set canvas size
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, [width, height, canvasRef]);

  // Load background
  useEffect(() => {
    setBgLoaded(false);
    const bg = new Image();
    bg.src = backgroundSrc || "/images/ctree.jpg";
    bg.onload = () => setBgLoaded(true);
    bgImage.current = bg;
  }, [backgroundSrc]);

  // Load tree overlay
  useEffect(() => {
    if (!treeSrc) {
      setTreeLoaded(true);
      return;
    }
    setTreeLoaded(false);
    const tree = new Image();
    tree.src = treeSrc;
    tree.onload = () => setTreeLoaded(true);
    treeImage.current = tree;
  }, [treeSrc]);

  // Preload images
  useEffect(() => {
    const promises = images.map(
      (file) =>
        new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          img.onload = () => resolve(img);
        })
    );

    Promise.all(promises).then((imgs) => setLoadedImages(imgs));
  }, [images]);

  // Keep track of current positions for smooth dragging
  useEffect(() => {
    currentPositions.current = positions;
  }, [positions]);

  // Helper function to draw image with cover (no stretching, crops if needed)
  const drawImageCover = (
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    ctx: CanvasRenderingContext2D
  ) => {
    const imgAspect = img.width / img.height;
    const containerAspect = w / h;
    let sourceWidth = img.width;
    let sourceHeight = img.height;
    let sourceX = 0;
    let sourceY = 0;

    if (imgAspect > containerAspect) {
      // Image is wider than container, crop horizontally
      sourceWidth = img.height * containerAspect;
      sourceX = (img.width - sourceWidth) / 2;
    } else {
      // Image is taller than container, crop vertically
      sourceHeight = img.width / containerAspect;
      sourceY = (img.height - sourceHeight) / 2;
    }

    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, x, y, w, h);
  };
  
  // NEW Helper function to draw image with contain (shows entire image, adds empty space if needed)
  const drawImageContain = (
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    ctx: CanvasRenderingContext2D
  ) => {
    const imgAspect = img.width / img.height;
    const containerAspect = w / h;
    let targetX = x;
    let targetY = y;
    let targetW = w;
    let targetH = h;

    if (imgAspect > containerAspect) {
      // Image is wider than container, fit by width
      targetH = w / imgAspect;
      targetY = y + (h - targetH) / 2; // Center vertically
    } else {
      // Image is taller than container, fit by height
      targetW = h * imgAspect;
      targetX = x + (w - targetW) / 2; // Center horizontally
    }

    ctx.drawImage(img, 0, 0, img.width, img.height, targetX, targetY, targetW, targetH);
  };

  // Calculate padding for tree
  const getTreePadding = () => {
    return { top: 80, bottom: 80, left: 40, right: 40 };
  };

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !bgLoaded || !treeLoaded) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background with cover
    if (bgImage.current) {
      drawImageCover(bgImage.current, 0, 0, canvas.width, canvas.height, ctx);
    }

    // Draw tree overlay with padding
    if (treeImage.current) {
      const padding = getTreePadding();
      const treeWidth = canvas.width - padding.left - padding.right;
      const treeHeight = canvas.height - padding.top - padding.bottom;
      drawImageCover(
        treeImage.current,
        padding.left,
        padding.top,
        treeWidth,
        treeHeight,
        ctx
      );
    }

    // Draw user images (ornaments/toys) on top
    loadedImages.forEach((img, i) => {
      const pos = positions[i];
      if (pos) {
        if (i === hoveredIndex || i === dragIndex) {
          ctx.globalAlpha = 0.85;
        }

        // --- NEW DRAWING LOGIC: Use cover or contain based on itemFit prop ---
        if (itemFit === 'cover') {
            drawImageCover(img, pos.x, pos.y, currentItemWidth, currentItemHeight, ctx);
        } else { // 'contain'
            drawImageContain(img, pos.x, pos.y, currentItemWidth, currentItemHeight, ctx);
        }
        
        ctx.globalAlpha = 1.0;

        if (i === hoveredIndex || i === dragIndex) {
          ctx.shadowColor = i === dragIndex ? "#FFD700" : "#FFA500";
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.strokeStyle = i === dragIndex ? "#FFD700" : "#FFA500";
          ctx.lineWidth = 5;
          ctx.strokeRect(
            pos.x - 2,
            pos.y - 2,
            currentItemWidth + 4, // Use dynamic size
            currentItemHeight + 4 // Use dynamic size
          );
          ctx.shadowColor = "transparent";
        }
      }
    });
  }, [
    loadedImages,
    positions,
    bgLoaded,
    treeLoaded,
    canvasRef,
    width,
    height,
    hoveredIndex,
    dragIndex,
    currentItemWidth,
    currentItemHeight,
    itemFit, // Dependency added
  ]);

  // Drag logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getMousePos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;

      if ("touches" in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ("clientX" in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return { x: 0, y: 0 };
      }

      // Convert mouse position from screen coordinates to canvas drawing coordinates
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const getHoveredImage = (pos: { x: number; y: number }) => {
      // Iterate backward to check top-most (last drawn) images first
      for (let i = loadedImages.length - 1; i >= 0; i--) {
        const imgPos = currentPositions.current[i];
        if (!imgPos) continue;

        // Hit detection area now uses the dynamic item size
        if (
          pos.x >= imgPos.x &&
          pos.x <= imgPos.x + currentItemWidth &&
          pos.y >= imgPos.y &&
          pos.y <= imgPos.y + currentItemHeight
        ) {
          return i;
        }
      }
      return null;
    };

    const handleDown = (e: MouseEvent | TouchEvent) => {
      const pos = getMousePos(e);
      const index = getHoveredImage(pos);
      if (index !== null) {
        dragIndexRef.current = index;
        setDragIndex(index);

        const imgPos = currentPositions.current[index];
        // Correctly calculate offset: distance from mouse click (pos) to image's top-left corner (imgPos)
        offset.current = { x: pos.x - imgPos.x, y: pos.y - imgPos.y };

        // Prevent default on touch to stop scrolling/panning
        if ('touches' in e) e.preventDefault();
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const pos = getMousePos(e);

      // Check ref for current dragging status
      if (dragIndexRef.current === null) {
        const hoveredIdx = getHoveredImage(pos);
        setHoveredIndex(hoveredIdx);
        canvas.style.cursor = hoveredIdx !== null ? "grab" : "default";
        return;
      }

      // We are dragging
      canvas.style.cursor = "grabbing";

      // Only prevent default on touch when dragging to keep the drag smooth
      if ('touches' in e) e.preventDefault();

      const newPos = [...currentPositions.current];
      const dragIdx = dragIndexRef.current;

      // Calculate new image position: Mouse Position - Offset
      newPos[dragIdx] = {
        x: pos.x - offset.current.x,
        y: pos.y - offset.current.y,
      };

      // Update ref and state
      currentPositions.current = newPos;
      setPositions(newPos);
    };

    const handleUp = () => {
      dragIndexRef.current = null;
      setDragIndex(null);
      setHoveredIndex(null);
      canvas.style.cursor = "default";
    };

    const handleLeave = () => {
      if (dragIndexRef.current === null) {
        setHoveredIndex(null);
        canvas.style.cursor = "default";
      }
    };

    canvas.addEventListener("mousedown", handleDown);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseup", handleUp);
    canvas.addEventListener("mouseleave", handleLeave);
    canvas.addEventListener("touchstart", handleDown, { passive: false }); // Needs to be non-passive for preventDefault to work
    canvas.addEventListener("touchmove", handleMove, { passive: false });
    canvas.addEventListener("touchend", handleUp);

    // Document-level listeners for drag outside canvas
    const handleDocumentMove = (e: MouseEvent) => {
      if (dragIndexRef.current !== null) {
        handleMove(e);
      }
    };

    const handleDocumentUp = () => {
      if (dragIndexRef.current !== null) {
        handleUp();
      }
    };

    document.addEventListener("mousemove", handleDocumentMove);
    document.addEventListener("mouseup", handleDocumentUp);

    return () => {
      canvas.removeEventListener("mousedown", handleDown);
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseup", handleUp);
      canvas.removeEventListener("mouseleave", handleLeave);
      canvas.removeEventListener("touchstart", handleDown);
      canvas.removeEventListener("touchmove", handleMove);
      canvas.removeEventListener("touchend", handleUp);
      document.removeEventListener("mousemove", handleDocumentMove);
      document.removeEventListener("mouseup", handleDocumentUp);
    };
  }, [loadedImages, canvasRef, setPositions, currentItemWidth, currentItemHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ border: "1px solid #555" }}
    />
  );
}