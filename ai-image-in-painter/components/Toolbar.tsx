
import React, { useRef, useState, useEffect } from 'react';
import { EditorMode } from '../types';

interface ToolbarProps {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  setMode,
  brushSize,
  setBrushSize,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const min = 5;
  const max = 100;

  const handleDrag = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const distFromBottom = rect.bottom - clientY;
    const percentage = Math.max(0, Math.min(1, distFromBottom / rect.height));
    const newValue = Math.round(min + (max - min) * percentage);
    setBrushSize(newValue);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleDrag(e.clientY);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const onMouseDownTrack = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleDrag(e.clientY);
  };

  const handlePosition = ((brushSize - min) / (max - min)) * 100;

  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center bg-white dark:bg-gray-900 rounded-full shadow-soft border border-gray-100 dark:border-gray-800 py-6 px-2.5 z-30 gap-6">
      <div className="flex flex-col items-center gap-2">
        <button 
          onClick={() => setMode(EditorMode.PENCIL)}
          className={`tooltip mb-1 p-2 rounded-full transition-all ${mode === EditorMode.PENCIL ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <span className="material-symbols-outlined text-[20px]">brush</span>
          <span className="tooltip-text">手动涂抹</span>
        </button>
        
        <button 
          onClick={() => setBrushSize(Math.min(max, brushSize + 5))}
          className="tooltip w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span className="tooltip-text">放大笔刷</span>
        </button>

        <div className="h-32 w-8 flex items-center justify-center relative">
          <div 
            ref={trackRef}
            onMouseDown={onMouseDownTrack}
            className="w-32 h-6 -rotate-90 absolute flex items-center group cursor-pointer"
          >
            <div className="absolute w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
            <div className="absolute h-1 bg-primary rounded-full" style={{ width: `${handlePosition}%` }}></div>
            <div 
              className="absolute h-4 w-4 bg-white border border-gray-200 rounded-full shadow-sm cursor-pointer hover:scale-110 transition-transform" 
              style={{ left: `${handlePosition}%`, transform: 'translateX(-50%)' }}
            ></div>
            <input 
              className="absolute w-full h-full opacity-0 cursor-pointer" 
              max={max} min={min} type="range" 
              value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
            />
          </div>
        </div>

        <button 
          onClick={() => setBrushSize(Math.max(min, brushSize - 5))}
          className="tooltip w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">remove</span>
          <span className="tooltip-text">缩小笔刷</span>
        </button>
      </div>

      <div className="w-8 h-px bg-gray-200 dark:bg-gray-700"></div>

      <div className="flex flex-col items-center gap-2">
        <button 
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-full transition-colors tooltip ${canUndo ? 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100' : 'text-gray-200 cursor-not-allowed'}`}
        >
          <span className="material-symbols-outlined text-[20px]">undo</span>
          <span className="tooltip-text">后退</span>
        </button>
        <button 
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-full transition-colors tooltip ${canRedo ? 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100' : 'text-gray-200 cursor-not-allowed'}`}
        >
          <span className="material-symbols-outlined text-[20px]">redo</span>
          <span className="tooltip-text">前进</span>
        </button>
        <button 
          onClick={() => setMode(EditorMode.ERASER)}
          className={`p-2 rounded-full transition-colors tooltip ${mode === EditorMode.ERASER ? 'text-white bg-primary shadow-md' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100'}`}
        >
          <span className="material-symbols-outlined text-[20px]">ink_eraser</span>
          <span className="tooltip-text">擦除选区</span>
        </button>
        <button 
          onClick={onClear}
          className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 rounded-full transition-colors relative tooltip"
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
          <span className="tooltip-text">清空选区</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
