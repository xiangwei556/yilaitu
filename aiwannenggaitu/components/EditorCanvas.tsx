
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { ToolType, SegAlgorithm, Point, TransformState } from '../types';
import { rgbToLab, deltaE, LabColor } from '../colorUtils';

interface EditorCanvasProps {
  imageUrl: string;
  tool: ToolType;
  segAlgo: SegAlgorithm;
  brushSize: number;
  zoom: number; 
  setTool: (tool: ToolType) => void;
  setBrushSize: (size: number) => void;
  onZoomChange?: (zoom: number) => void;
}

const EditorCanvas = forwardRef<{ 
  getMaskDataUrl: () => string | null; 
  clearMask: () => void;
  undo: () => void;
  resetTransform: () => void;
  fitToScreen: () => void;
  canUndo: boolean;
}, EditorCanvasProps>((props, ref) => {
  const { imageUrl, tool, segAlgo, brushSize, setBrushSize, zoom, onZoomChange, setTool } = props;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isInteractionActive, setIsInteractionActive] = useState(false);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<TransformState>({ scale: 1, x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState<Point | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const MAX_HISTORY = 20;

  // 1. 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

      if (e.key === '[') {
        setBrushSize(Math.max(5, brushSize - 5));
      } else if (e.key === ']') {
        setBrushSize(Math.min(150, brushSize + 5));
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undoAction();
      } else if (e.key === ' ' && tool !== 'pan') {
        e.preventDefault();
        setTool('pan');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && tool === 'pan') {
        setTool('smart-select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [brushSize, tool, setBrushSize, setTool]);

  // 2. 初始化画布
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const containerW = containerRef.current?.clientWidth || 800;
      const containerH = containerRef.current?.clientHeight || 600;
      const ratio = Math.min((containerW - 80) / img.width, (containerH - 80) / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;

      setImgSize({ width: w, height: h });
      [mainCanvasRef, maskCanvasRef, previewCanvasRef].forEach(canvas => {
        if (canvas.current) {
          canvas.current.width = w;
          canvas.current.height = h;
        }
      });

      const mainCtx = mainCanvasRef.current?.getContext('2d');
      mainCtx?.drawImage(img, 0, 0, w, h);
      
      const maskCtx = maskCanvasRef.current?.getContext('2d');
      if (maskCtx) {
        maskCtx.clearRect(0, 0, w, h);
        setHistory([maskCtx.getImageData(0, 0, w, h)]);
      }
    };
  }, [imageUrl]);

  useEffect(() => {
    setTransform(prev => ({ ...prev, scale: zoom / 100 }));
  }, [zoom]);

  const saveToHistory = useCallback(() => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const newData = ctx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    setHistory(prev => [...prev, newData].slice(-MAX_HISTORY));
  }, []);

  const undoAction = useCallback(() => {
    if (history.length <= 1 || !maskCanvasRef.current) return;
    const newHistory = [...history];
    newHistory.pop();
    const lastState = newHistory[newHistory.length - 1];
    maskCanvasRef.current.getContext('2d')?.putImageData(lastState, 0, 0);
    setHistory(newHistory);
  }, [history]);

  useImperativeHandle(ref, () => ({
    getMaskDataUrl: () => {
      if (!maskCanvasRef.current) return null;
      const canvas = document.createElement('canvas');
      canvas.width = maskCanvasRef.current.width;
      canvas.height = maskCanvasRef.current.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      // 生成 API 规范遮罩：白背景上的黑选区（或反之），Gemini 通常需要黑底白遮罩
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 平滑遮罩渲染：应用模糊来软化边缘
      ctx.filter = 'blur(1px)';
      ctx.drawImage(maskCanvasRef.current, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const alpha = imageData.data[i+3];
        const val = alpha > 128 ? 255 : 0; // 二值化，但保留 blur 后的过渡
        imageData.data[i] = val;
        imageData.data[i+1] = val;
        imageData.data[i+2] = val;
        imageData.data[i+3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/png');
    },
    clearMask: () => {
      if (maskCanvasRef.current) {
        maskCanvasRef.current.getContext('2d')?.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        saveToHistory();
      }
    },
    undo: undoAction,
    resetTransform: () => setTransform({ scale: 1, x: 0, y: 0 }),
    fitToScreen: () => setTransform({ scale: 1, x: 0, y: 0 }),
    canUndo: history.length > 1
  }), [history, undoAction, saveToHistory]);

  const screenToCanvas = (clientX: number, clientY: number): Point => {
    if (!maskCanvasRef.current) return { x: 0, y: 0 };
    const rect = maskCanvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / transform.scale,
      y: (clientY - rect.top) / transform.scale
    };
  };

  // 3. 核心算法：基于 CIELAB 的边缘感知泛洪填充
  const runSmartSelect = (startPoint: Point, isPreview = false) => {
    if (!mainCanvasRef.current || !maskCanvasRef.current || !previewCanvasRef.current) return;
    const mainCtx = mainCanvasRef.current.getContext('2d', { willReadFrequently: true });
    const targetCtx = isPreview ? previewCanvasRef.current.getContext('2d') : maskCanvasRef.current.getContext('2d');
    if (!mainCtx || !targetCtx) return;

    const w = mainCanvasRef.current.width;
    const h = mainCanvasRef.current.height;
    const x = Math.floor(startPoint.x);
    const y = Math.floor(startPoint.y);
    if (x < 0 || x >= w || y < 0 || y >= h) return;

    const imgData = mainCtx.getImageData(0, 0, w, h);
    const pixels = imgData.data;
    
    // 获取起始点的 Lab 颜色
    const startIdx = (y * w + x) * 4;
    const startLab = rgbToLab(pixels[startIdx], pixels[startIdx+1], pixels[startIdx+2]);

    // 动态阈值策略
    const baseTolerance = segAlgo === 'edge-aware' ? 12 : segAlgo === 'global' ? 25 : 18;

    const targetData = isPreview ? targetCtx.createImageData(w, h) : targetCtx.getImageData(0, 0, w, h);
    const tPix = targetData.data;

    if (segAlgo === 'global') {
      for (let i = 0; i < pixels.length; i += 4) {
        const curLab = rgbToLab(pixels[i], pixels[i+1], pixels[i+2]);
        if (deltaE(startLab, curLab) < baseTolerance) {
          tPix[i] = 55; tPix[i+1] = 19; tPix[i+2] = 236; tPix[i+3] = isPreview ? 80 : 180;
        }
      }
    } else {
      const visited = new Uint8Array(w * h);
      const stack: [number, number][] = [[x, y]];
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        const idx = cy * w + cx;
        if (visited[idx]) continue;
        visited[idx] = 1;
        
        const pIdx = idx * 4;
        const curLab = rgbToLab(pixels[pIdx], pixels[pIdx+1], pixels[pIdx+2]);
        
        if (deltaE(startLab, curLab) < baseTolerance) {
          // Fix: Corrected typo pPix to pIdx to ensure correct pixel manipulation
          tPix[pIdx] = 55; tPix[pIdx+1] = 19; tPix[pIdx+2] = 236; tPix[pIdx+3] = isPreview ? 80 : 180;
          if (cx > 0) stack.push([cx - 1, cy]);
          if (cx < w - 1) stack.push([cx + 1, cy]);
          if (cy > 0) stack.push([cx, cy - 1]);
          if (cy < h - 1) stack.push([cx, cy + 1]);
        }
      }
    }

    if (isPreview) targetCtx.clearRect(0, 0, w, h);
    targetCtx.putImageData(targetData, 0, 0);
    if (!isPreview) saveToHistory();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pt = screenToCanvas(e.clientX, e.clientY);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    setIsInteractionActive(true);

    if (tool === 'pan') return;
    if (tool === 'smart-select') {
      runSmartSelect(pt);
    } else {
      draw(pt, true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pt = screenToCanvas(e.clientX, e.clientY);
    
    // 悬停预选逻辑
    if (tool === 'smart-select' && !isInteractionActive) {
      runSmartSelect(pt, true);
    } else {
      previewCanvasRef.current?.getContext('2d')?.clearRect(0, 0, imgSize.width, imgSize.height);
    }

    if (!isInteractionActive) return;

    if (tool === 'pan' && lastMousePos) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === 'brush' || tool === 'eraser') {
      draw(pt);
    }
  };

  const draw = (pt: Point, isStart = false) => {
    const ctx = maskCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = brushSize; 
    ctx.strokeStyle = 'rgba(55, 19, 236, 0.6)';

    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
    } else {
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative flex items-center justify-center w-full h-full overflow-hidden ${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-none'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => { handleMouseUp(); setIsInteractionActive(false); }}
      onMouseLeave={() => { setIsInteractionActive(false); previewCanvasRef.current?.getContext('2d')?.clearRect(0,0,imgSize.width, imgSize.height); }}
    >
      <div 
        className="relative transition-transform duration-75 ease-out select-none" 
        style={{ 
          width: imgSize.width, 
          height: imgSize.height,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        <canvas ref={mainCanvasRef} className="absolute inset-0 rounded-lg pointer-events-none" />
        <canvas ref={previewCanvasRef} className="absolute inset-0 rounded-lg opacity-40 pointer-events-none" />
        <canvas ref={maskCanvasRef} className="absolute inset-0 rounded-lg" />
      </div>

      {/* 增强版光标 UI */}
      <div 
        className="fixed border-2 border-white rounded-full pointer-events-none z-50 flex items-center justify-center transition-transform duration-100"
        style={{
          width: `${(tool === 'brush' || tool === 'eraser' ? brushSize : 28) * transform.scale}px`,
          height: `${(tool === 'brush' || tool === 'eraser' ? brushSize : 28) * transform.scale}px`,
          transform: 'translate(-50%, -50%)',
          left: 'var(--mx, 0)',
          top: 'var(--my, 0)',
          backgroundColor: tool === 'smart-select' ? 'rgba(55, 19, 236, 0.15)' : 'transparent',
          boxShadow: '0 0 15px rgba(0,0,0,0.4)',
        }}
        ref={(el) => {
          if (!el) return;
          const h = (e: MouseEvent) => {
            el.style.setProperty('--mx', `${e.clientX}px`);
            el.style.setProperty('--my', `${e.clientY}px`);
          };
          window.addEventListener('mousemove', h);
        }}
      >
        {tool === 'smart-select' && <span className="material-symbols-outlined text-white text-[14px]">magic_button</span>}
        {tool === 'pan' && <span className="material-symbols-outlined text-white text-[14px]">pan_tool</span>}
      </div>
      
      {/* 笔刷提示 HUD */}
      <div className="absolute top-20 right-20 pointer-events-none opacity-0 animate-hud flex flex-col items-center" id="brush-hud">
         <div className="text-white text-4xl font-black">{brushSize}</div>
         <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Brush Size</div>
      </div>
    </div>
  );
});

const handleMouseUp = () => {};

EditorCanvas.displayName = 'EditorCanvas';
export default EditorCanvas;
