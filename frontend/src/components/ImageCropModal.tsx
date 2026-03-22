import React, { useState, useRef, useEffect } from 'react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string) => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onCropComplete
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && imageUrl) {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        if (imageRef.current) {
          imageRef.current.src = imageUrl;
          // Center image
          const container = containerRef.current;
          if (container) {
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            const imgAspect = img.width / img.height;
            const containerAspect = containerWidth / containerHeight;
            
            let scale = 1;
            if (imgAspect > containerAspect) {
              scale = containerHeight / img.height;
            } else {
              scale = containerWidth / img.width;
            }
            
            setZoom(scale);
            setCrop({ x: 0, y: 0 });
          }
        }
      };
    }
  }, [isOpen, imageUrl]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setCrop({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const container = containerRef.current;
    if (!container) return;

    // Set canvas size (output size)
    const outputSize = 400; // Size of the cropped image
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Calculate crop area (center circle)
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const cropSize = Math.min(containerWidth, containerHeight) * 0.8;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    // Calculate source coordinates
    const scaleX = img.naturalWidth / (img.width * zoom);
    const scaleY = img.naturalHeight / (img.height * zoom);
    
    const sourceX = (centerX - crop.x - cropSize / 2) * scaleX;
    const sourceY = (centerY - crop.y - cropSize / 2) * scaleY;
    const sourceSize = cropSize * scaleX;

    // Draw cropped image
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize
    );

    // Convert to blob and create URL
    canvas.toBlob((blob) => {
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          onCropComplete(reader.result as string);
          onClose();
        };
        reader.readAsDataURL(blob);
      }
    }, 'image/jpeg', 0.95);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Crop Foto Profil</h2>
        
        <div 
          ref={containerRef}
          className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden mb-4 cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Image */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Crop preview"
            className="absolute"
            style={{
              transform: `translate(${crop.x}px, ${crop.y}px) scale(${zoom})`,
              transformOrigin: 'top left',
              maxWidth: 'none'
            }}
            draggable={false}
          />
          
          {/* Crop overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark overlay */}
            <svg className="w-full h-full">
              <defs>
                <mask id="crop-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <circle cx="50%" cy="50%" r="40%" fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#crop-mask)" />
              <circle cx="50%" cy="50%" r="40%" fill="none" stroke="white" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Zoom Control */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zoom: {zoom.toFixed(2)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Tips: Drag gambar untuk memposisikan, gunakan slider untuk zoom in/out
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleCrop}
            className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Crop & Simpan
          </button>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default ImageCropModal;
