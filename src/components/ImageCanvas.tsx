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
}

const IMAGE_SIZE = 150;
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1350;

export default function ImageCanvas({
  canvasRef,
  images,
  positions,
  setPositions,
  backgroundSrc,
  treeSrc,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
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

  // Helper function to draw image with cover (no stretching)
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
      sourceWidth = img.height * containerAspect;
      sourceX = (img.width - sourceWidth) / 2;
    } else {
      sourceHeight = img.width / containerAspect;
      sourceY = (img.height - sourceHeight) / 2;
    }

    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, x, y, w, h);
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
        ctx.drawImage(img, pos.x, pos.y, IMAGE_SIZE, IMAGE_SIZE);
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
            IMAGE_SIZE + 4,
            IMAGE_SIZE + 4
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
      // This is crucial if the canvas is scaled on the page.
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

        // Hit detection area is exactly the image drawn area
        if (
          pos.x >= imgPos.x &&
          pos.x <= imgPos.x + IMAGE_SIZE &&
          pos.y >= imgPos.y &&
          pos.y <= imgPos.y + IMAGE_SIZE
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
  }, [loadedImages, canvasRef, setPositions]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ border: "1px solid #555" }}
    />
  );
}