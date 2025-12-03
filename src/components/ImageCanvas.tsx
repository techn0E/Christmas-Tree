interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function ImageCanvas({ canvasRef }: Props) {
  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={600}
      style={{ border: "1px solid #555", marginTop: 20 }}
    />
  );
}

export default ImageCanvas;
