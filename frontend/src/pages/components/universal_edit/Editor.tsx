import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EditorMode, Point } from './types';
import { rgbToLab, deltaE } from './colorUtils';

interface EditorProps {
  image: string | null;
  mode: EditorMode;
  brushSize: number;
  scale: number;
  panOffset: Point;
  setPanOffset: React.Dispatch<React.SetStateAction<Point>>;
  onStateChange: (canvas: HTMLCanvasElement) => void;
  undoTrigger: number;
  redoTrigger: number;
  clearTrigger: number;
}

export const Editor: React.FC<EditorProps> = ({
  image,
  mode,
  brushSize,
  scale,
  panOffset,
  setPanOffset,
  onStateChange,
  undoTrigger,
  redoTrigger,
  clearTrigger
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
  const [lastDrawPos, setLastDrawPos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

  const [showCenterPreview, setShowCenterPreview] = useState(false);
  const previewTimeoutRef = useRef<number | null>(null);

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const BRUSH_COLOR_CSS = 'rgb(139, 92, 246)';

  useEffect(() => {
    if (previewTimeoutRef.current) window.clearTimeout(previewTimeoutRef.current);
    setShowCenterPreview(true);
    previewTimeoutRef.current = window.setTimeout(() => {
      setShowCenterPreview(false);
    }, 1200);
  }, [brushSize]);

  useEffect(() => {
    if (!image || !bgCanvasRef.current || !canvasRef.current || !containerRef.current || !previewCanvasRef.current) return;
    const img = new Image();
    img.src = image;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const cw = containerRef.current!.clientWidth;
      const ch = containerRef.current!.clientHeight;
      const ratio = img.width / img.height;

      let dw = cw * 0.8, dh = (cw * 0.8) / ratio;
      if (dh > ch * 0.8) {
        dh = ch * 0.8;
        dw = dh * ratio;
      }

      setImgSize({ width: dw, height: dh });

      [bgCanvasRef.current, canvasRef.current, previewCanvasRef.current].forEach(c => {
        if (c) { c.width = dw; c.height = dh; }
      });

      const bgCtx = bgCanvasRef.current!.getContext('2d', { willReadFrequently: true });
      bgCtx?.drawImage(img, 0, 0, dw, dh);

      const initialData = canvasRef.current!.toDataURL();
      setHistory([initialData]);
      setHistoryIndex(0);
      onStateChange(canvasRef.current!);
    };
  }, [image]);

  useEffect(() => {
    if (undoTrigger > 0 && historyIndex > 0) {
      const prev = historyIndex - 1;
      setHistoryIndex(prev);
      drawHistoryItem(history[prev]);
    }
  }, [undoTrigger]);

  useEffect(() => {
    if (redoTrigger > 0 && historyIndex < history.length - 1) {
      const next = historyIndex + 1;
      setHistoryIndex(next);
      drawHistoryItem(history[next]);
    }
  }, [redoTrigger]);

  useEffect(() => {
    if (clearTrigger > 0 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      saveToHistory();
    }
  }, [clearTrigger]);

  const drawHistoryItem = (dataUrl: string) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      ctx.drawImage(img, 0, 0);
      onStateChange(canvasRef.current!);
    };
  };

  const saveToHistory = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    onStateChange(canvasRef.current);
  };

  // 智能选取核心算法：基于 CIELAB 的边缘感知泛洪填充
  const runSmartSelect = useCallback((startPoint: Point, isPreview = false) => {
    if (!bgCanvasRef.current || !canvasRef.current || !previewCanvasRef.current) return;
    const bgCtx = bgCanvasRef.current.getContext('2d', { willReadFrequently: true });
    const targetCtx = isPreview ? previewCanvasRef.current.getContext('2d') : canvasRef.current.getContext('2d');
    if (!bgCtx || !targetCtx) return;

    const w = bgCanvasRef.current.width;
    const h = bgCanvasRef.current.height;
    const x = Math.floor(startPoint.x);
    const y = Math.floor(startPoint.y);
    if (x < 0 || x >= w || y < 0 || y >= h) return;

    const imgData = bgCtx.getImageData(0, 0, w, h);
    const pixels = imgData.data;

    // 获取起始点的 Lab 颜色
    const startIdx = (y * w + x) * 4;
    const startLab = rgbToLab(pixels[startIdx], pixels[startIdx + 1], pixels[startIdx + 2]);

    // 动态阈值策略 - 边缘感知模式
    const baseTolerance = 12;

    const targetData = isPreview ? targetCtx.createImageData(w, h) : targetCtx.getImageData(0, 0, w, h);
    const tPix = targetData.data;

    // 连通区域填充算法
    const visited = new Uint8Array(w * h);
    const stack: [number, number][] = [[x, y]];
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const idx = cy * w + cx;
      if (visited[idx]) continue;
      visited[idx] = 1;

      const pIdx = idx * 4;
      const curLab = rgbToLab(pixels[pIdx], pixels[pIdx + 1], pixels[pIdx + 2]);

      if (deltaE(startLab, curLab) < baseTolerance) {
        // 使用紫色填充选区
        tPix[pIdx] = 139; tPix[pIdx + 1] = 92; tPix[pIdx + 2] = 246; tPix[pIdx + 3] = isPreview ? 80 : 180;
        if (cx > 0) stack.push([cx - 1, cy]);
        if (cx < w - 1) stack.push([cx + 1, cy]);
        if (cy > 0) stack.push([cx, cy - 1]);
        if (cy < h - 1) stack.push([cx, cy + 1]);
      }
    }

    if (isPreview) targetCtx.clearRect(0, 0, w, h);
    targetCtx.putImageData(targetData, 0, 0);
    if (!isPreview) {
      saveToHistory();
    }
  }, []);

  const getRelativePos = (e: any) => {
    if (!containerRef.current || !canvasRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rx = clientX - rect.left;
    const ry = clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const xInScaled = rx - (centerX + panOffset.x);
    const yInScaled = ry - (centerY + panOffset.y);

    return {
      x: Math.round(xInScaled / scale + canvasRef.current.width / 2),
      y: Math.round(yInScaled / scale + canvasRef.current.height / 2)
    };
  };

  const handlePointerDown = (e: any) => {
    const pos = getRelativePos(e);
    if (mode === EditorMode.DRAG) {
      setIsPanning(true);
      setLastPanPos({ x: e.touches ? e.touches[0].clientX : e.clientX, y: e.touches ? e.touches[0].clientY : e.clientY });
      return;
    }
    if (mode === EditorMode.SMART_SELECT) {
      runSmartSelect(pos);
      return;
    }
    setIsDrawing(true);
    setLastDrawPos(pos);
  };

  const handlePointerMove = (e: any) => {
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({ x: cx - rect.left, y: cy - rect.top });
    }

    // 智能选取悬停预选逻辑
    if (mode === EditorMode.SMART_SELECT && !isDrawing && !isPanning) {
      const pos = getRelativePos(e);
      runSmartSelect(pos, true);
    } else {
      previewCanvasRef.current?.getContext('2d')?.clearRect(0, 0, imgSize.width, imgSize.height);
    }

    if (isPanning) {
      const dx = (cx - lastPanPos.x);
      const dy = (cy - lastPanPos.y);
      setPanOffset(p => ({ x: p.x + dx, y: p.y + dy }));
      setLastPanPos({ x: cx, y: cy });
      return;
    }

    if (!isDrawing || !canvasRef.current) return;
    const pos = getRelativePos(e);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.lineWidth = brushSize;
      ctx.lineJoin = ctx.lineCap = 'round';
      ctx.globalCompositeOperation = mode === EditorMode.ERASER ? 'destination-out' : 'source-over';
      ctx.strokeStyle = BRUSH_COLOR_CSS;
      ctx.beginPath();
      ctx.moveTo(lastDrawPos.x, lastDrawPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setLastDrawPos(pos);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
    setIsPanning(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-transparent"
      onMouseMove={handlePointerMove}
    >
      <div
        className="relative pointer-events-none"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
          width: canvasRef.current?.width,
          height: canvasRef.current?.height,
          transition: isPanning ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        <canvas ref={bgCanvasRef} className="absolute inset-0 z-0" />
        <canvas ref={previewCanvasRef} className="absolute inset-0 z-5 opacity-40 pointer-events-none" />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10 touch-none pointer-events-auto"
          style={{
            cursor: mode === EditorMode.DRAG ? 'grab' : (mode === EditorMode.SMART_SELECT ? 'crosshair' : 'none'),
            opacity: 0.6
          }}
          onMouseEnter={() => setIsMouseOverCanvas(true)}
          onMouseLeave={() => { setIsMouseOverCanvas(false); stopDrawing(); previewCanvasRef.current?.getContext('2d')?.clearRect(0, 0, imgSize.width, imgSize.height); }}
          onMouseDown={handlePointerDown}
          onMouseUp={stopDrawing}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={stopDrawing}
        />
      </div>

      {(showCenterPreview || (isMouseOverCanvas && !isPanning && mode !== EditorMode.DRAG && mode !== EditorMode.SMART_SELECT)) && image && (
        <div
          className="pointer-events-none absolute z-50 rounded-full border-2 border-white shadow-lg bg-primary/20 ring-1 ring-black/10 transition-all duration-75"
          style={{
            left: showCenterPreview ? '50%' : mousePos.x,
            top: showCenterPreview ? '50%' : mousePos.y,
            width: brushSize * scale,
            height: brushSize * scale,
            transform: 'translate(-50%, -50%)',
            opacity: showCenterPreview ? 1 : 0.8
          }}
        />
      )}
    </div>
  );
};

export default Editor;
