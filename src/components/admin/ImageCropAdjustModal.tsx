import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Move,
} from 'lucide-react';

interface ImageCropAdjustModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageIndex: number;
  isThumbnail: boolean;
  onClose: () => void;
  onApply: (adjustedDataUrl: string) => void;
}

export const ImageCropAdjustModal: React.FC<ImageCropAdjustModalProps> = ({
  isOpen,
  imageUrl,
  imageIndex,
  isThumbnail,
  onClose,
  onApply,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270 degrees
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const VIEWPORT_SIZE = 300; // 300x300px square frame

  // Reset when modal opens with a new image
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setIsDragging(false);
    }
  }, [isOpen, imageUrl]);

  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgNaturalSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
  };

  // Calculate base scale to ensure image covers the 1:1 viewport, accounting for rotation
  const getBaseScale = useCallback(() => {
    if (!imgNaturalSize.width || !imgNaturalSize.height) return 1;
    const isSwapped = rotation % 180 !== 0;
    const effWidth = isSwapped ? imgNaturalSize.height : imgNaturalSize.width;
    const effHeight = isSwapped ? imgNaturalSize.width : imgNaturalSize.height;
    return Math.max(
      VIEWPORT_SIZE / effWidth,
      VIEWPORT_SIZE / effHeight
    );
  }, [imgNaturalSize, rotation]);

  // Max drag bounds
  const getPanBounds = useCallback(() => {
    const baseScale = getBaseScale();
    const currentScale = baseScale * zoom;
    const isSwapped = rotation % 180 !== 0;
    const effWidth = isSwapped ? imgNaturalSize.height : imgNaturalSize.width;
    const effHeight = isSwapped ? imgNaturalSize.width : imgNaturalSize.height;

    const renderedWidth = effWidth * currentScale;
    const renderedHeight = effHeight * currentScale;

    const maxPanX = Math.max(0, (renderedWidth - VIEWPORT_SIZE) / 2);
    const maxPanY = Math.max(0, (renderedHeight - VIEWPORT_SIZE) / 2);

    return { maxPanX, maxPanY };
  }, [getBaseScale, zoom, imgNaturalSize, rotation]);

  // Rotation handlers
  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
    setPan({ x: 0, y: 0 }); // Reset pan on rotation for clean framing
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
    setPan({ x: 0, y: 0 }); // Reset pan on rotation for clean framing
  };

  // Mouse / Touch handlers for dragging the photo
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setStartPan({ ...pan });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;

    const { maxPanX, maxPanY } = getPanBounds();

    const newX = Math.min(maxPanX, Math.max(-maxPanX, startPan.x + deltaX));
    const newY = Math.min(maxPanY, Math.max(-maxPanY, startPan.y + deltaY));

    setPan({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handlePointerDown(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      handlePointerMove(e.clientX, e.clientY);
    }
  };

  const onMouseUp = () => {
    handlePointerUp();
  };

  // Touch events for mobile
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handlePointerDown(touch.clientX, touch.clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      handlePointerMove(touch.clientX, touch.clientY);
    }
  };

  const onTouchEnd = () => {
    handlePointerUp();
  };

  // Wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(3, Math.max(1, prev + zoomDelta)));
  };

  // Quick positioning presets
  const handlePreset = (preset: 'center' | 'top' | 'bottom' | 'left' | 'right') => {
    const { maxPanX, maxPanY } = getPanBounds();
    switch (preset) {
      case 'center':
        setPan({ x: 0, y: 0 });
        break;
      case 'top':
        setPan({ x: 0, y: maxPanY });
        break;
      case 'bottom':
        setPan({ x: 0, y: -maxPanY });
        break;
      case 'left':
        setPan({ x: maxPanX, y: 0 });
        break;
      case 'right':
        setPan({ x: -maxPanX, y: 0 });
        break;
    }
  };

  // Apply & Crop to 1000x1000 canvas with exact Pan, Zoom, and Rotation
  const handleApplyCrop = () => {
    if (!imgRef.current) return;

    const canvas = document.createElement('canvas');
    const OUTPUT_SIZE = 1000; // 1000x1000 High resolution output
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background for clean aesthetic
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;
    const baseScale = getBaseScale();

    ctx.save();
    // Center canvas + pan offset in canvas coordinates
    ctx.translate(OUTPUT_SIZE / 2 + pan.x * ratio, OUTPUT_SIZE / 2 + pan.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const drawW = imgNaturalSize.width * baseScale * ratio;
    const drawH = imgNaturalSize.height * baseScale * ratio;

    ctx.drawImage(
      imgRef.current,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH
    );
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    onApply(croppedDataUrl);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-neutral-200 overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <Move className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                Sesuaikan Posisi & Rotasi Foto {isThumbnail ? '(Thumbnail Utama)' : `(Foto #${imageIndex + 1})`}
              </h3>
              <p className="text-[11px] text-neutral-500">
                Geser (drag), zoom, atau putar (rotate) foto ke posisi yang pas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Framing Canvas / Viewport */}
        <div className="p-4 sm:p-6 flex flex-col items-center bg-neutral-100/50">
          <div className="text-center mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[11px] font-semibold text-neutral-600 shadow-2xs border border-neutral-200/80">
              <Move className="w-3.5 h-3.5 text-neutral-400" />
              <span>Klik & geser (drag) foto untuk framing thumbnail</span>
            </span>
          </div>

          {/* Square Viewport */}
          <div
            ref={containerRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onWheel={onWheel}
            style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
            className={`relative rounded-2xl overflow-hidden bg-neutral-900 select-none shadow-md border-2 border-neutral-800 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* The Image being transformed with pan, rotation, and zoom */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Reposition crop"
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
              draggable={false}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                maxWidth: 'none',
                maxHeight: 'none',
                width: imgNaturalSize.width && imgNaturalSize.height
                  ? `${imgNaturalSize.width * getBaseScale()}px`
                  : 'auto',
                height: imgNaturalSize.width && imgNaturalSize.height
                  ? `${imgNaturalSize.height * getBaseScale()}px`
                  : 'auto',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                pointerEvents: 'none',
              }}
            />

            {/* Rule of thirds grid lines overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/30">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div />
            </div>

            {/* Corner boundary guides */}
            <div className="absolute inset-2 border border-white/40 rounded-xl pointer-events-none" />
          </div>

          {/* Controls: Rotate, Zoom & Quick Positions */}
          <div className="w-full max-w-[320px] mt-4 space-y-2.5">
            {/* Rotate & Reset Bar */}
            <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-neutral-200/90 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-neutral-600 mr-1">Putar:</span>
                <button
                  type="button"
                  onClick={handleRotateLeft}
                  className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-700 text-xs font-semibold flex items-center gap-1 transition-all"
                  title="Putar 90° ke kiri"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>-90°</span>
                </button>
                <button
                  type="button"
                  onClick={handleRotateRight}
                  className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-700 text-xs font-semibold flex items-center gap-1 transition-all"
                  title="Putar 90° ke kanan"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>+90°</span>
                </button>
                {rotation !== 0 && (
                  <span className="text-[10px] font-mono font-bold text-neutral-400 ml-1">
                    {rotation}°
                  </span>
                )}
              </div>

              {/* Reset All Button */}
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                  setRotation(0);
                }}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                title="Reset Posisi, Zoom & Rotasi"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom Slider */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-neutral-200/90 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.15))}
                className="p-1 rounded-md text-neutral-500 hover:text-neutral-900"
                title="Perkecil zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-neutral-900 cursor-pointer h-1.5 bg-neutral-200 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.15))}
                className="p-1 rounded-md text-neutral-500 hover:text-neutral-900"
                title="Perbesar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-neutral-600 min-w-[36px] text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Position Presets */}
            <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-neutral-600">
              <span className="text-neutral-400">Pusatkan:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePreset('center')}
                  className="px-2 py-1 rounded-md bg-white border border-neutral-200 hover:bg-neutral-50 shadow-2xs"
                >
                  Tengah
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('top')}
                  className="px-2 py-1 rounded-md bg-white border border-neutral-200 hover:bg-neutral-50 shadow-2xs"
                >
                  Atas
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('bottom')}
                  className="px-2 py-1 rounded-md bg-white border border-neutral-200 hover:bg-neutral-50 shadow-2xs"
                >
                  Bawah
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('left')}
                  className="px-2 py-1 rounded-md bg-white border border-neutral-200 hover:bg-neutral-50 shadow-2xs"
                >
                  Kiri
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('right')}
                  className="px-2 py-1 rounded-md bg-white border border-neutral-200 hover:bg-neutral-50 shadow-2xs"
                >
                  Kanan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 flex items-center justify-between gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-98"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Terapkan Posisi Ini</span>
          </button>
        </div>
      </div>
    </div>
  );
};
