import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialColor?: string;
  onColorSelect: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  isOpen,
  onClose,
  initialColor = '#3713ec',
  onColorSelect
}) => {
  const [currentColor, setCurrentColor] = useState<string>(initialColor);
  const [hue, setHue] = useState<number>(268);
  const [saturation, setSaturation] = useState<number>(100);
  const [lightness, setLightness] = useState<number>(50);
  const [opacity, setOpacity] = useState<number>(100);
  const [pickerPosition, setPickerPosition] = useState({ x: 50, y: 33 });
  const [isDraggingPicker, setIsDraggingPicker] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  const [isDraggingOpacity, setIsDraggingOpacity] = useState(false);
  const [selectedPresetColor, setSelectedPresetColor] = useState<string>(initialColor);

  const colorPickerRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const opacitySliderRef = useRef<HTMLDivElement>(null);

  const presetColors = [
    { id: 'light-gray', name: '浅灰色', color: '#e5e7eb' },
    { id: 'sky-blue', name: '天蓝色', color: '#dbeafe' },
    { id: 'light-pink', name: '淡粉色', color: '#fce7f3' },
    { id: 'beige', name: '米黄色', color: '#fef9c3' },
    { id: 'light-green', name: '浅绿色', color: '#dcfce7' },
    { id: 'light-purple', name: '淡紫色', color: '#f3e8ff' },
    { id: 'light-orange', name: '浅橙色', color: '#ffedd5' },
    { id: 'light-cyan', name: '浅青色', color: '#cffafe' },
    { id: 'light-red', name: '浅红色', color: '#fee2e2' },
    { id: 'light-indigo', name: '浅靛色', color: '#e0e7ff' },
    { id: 'light-teal', name: '浅蓝绿色', color: '#ccfbf1' },
    { id: 'light-yellow', name: '浅黄色', color: '#fef08a' },
  ];

  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  const updateColorFromPicker = (x: number, y: number) => {
    const s = Math.round((x / 100) * 100);
    const l = Math.round((1 - y / 100) * 100);
    setSaturation(s);
    setLightness(l);
    setPickerPosition({ x, y });
    const hex = hslToHex(hue, s, l);
    setCurrentColor(hex);
  };

  const updateColorFromHue = (h: number) => {
    setHue(h);
    const hex = hslToHex(h, saturation, lightness);
    setCurrentColor(hex);
  };

  const updateColorFromOpacity = (o: number) => {
    setOpacity(o);
  };

  const handlePickerMouseDown = (e: React.MouseEvent) => {
    setIsDraggingPicker(true);
    const rect = colorPickerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      updateColorFromPicker(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
    }
  };

  const handleHueMouseDown = (e: React.MouseEvent) => {
    setIsDraggingHue(true);
    const rect = hueSliderRef.current?.getBoundingClientRect();
    if (rect) {
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const h = Math.round((x / 100) * 360);
      updateColorFromHue(Math.max(0, Math.min(360, h)));
    }
  };

  const handleOpacityMouseDown = (e: React.MouseEvent) => {
    setIsDraggingOpacity(true);
    const rect = opacitySliderRef.current?.getBoundingClientRect();
    if (rect) {
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const o = Math.round(x);
      updateColorFromOpacity(Math.max(0, Math.min(100, o)));
    }
  };

  const handlePresetColorClick = (color: string) => {
    setSelectedPresetColor(color);
    const hsl = hexToHsl(color);
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
    setCurrentColor(color);
    setOpacity(100);
    setPickerPosition({ x: hsl.s, y: 100 - hsl.l });
  };

  const handleConfirm = () => {
    const r = parseInt(currentColor.slice(1, 3), 16);
    const g = parseInt(currentColor.slice(3, 5), 16);
    const b = parseInt(currentColor.slice(5, 7), 16);
    const rgba = `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
    onColorSelect(rgba);
    onClose();
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPicker && colorPickerRef.current) {
        const rect = colorPickerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        updateColorFromPicker(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
      }
      if (isDraggingHue && hueSliderRef.current) {
        const rect = hueSliderRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const h = Math.round((x / 100) * 360);
        updateColorFromHue(Math.max(0, Math.min(360, h)));
      }
      if (isDraggingOpacity && opacitySliderRef.current) {
        const rect = opacitySliderRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const o = Math.round(x);
        updateColorFromOpacity(Math.max(0, Math.min(100, o)));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPicker(false);
      setIsDraggingHue(false);
      setIsDraggingOpacity(false);
    };

    if (isDraggingPicker || isDraggingHue || isDraggingOpacity) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPicker, isDraggingHue, isDraggingOpacity, hue, saturation, lightness]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative z-10 flex h-screen w-full flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
        <div className="w-full max-w-md bg-white rounded-t-[1.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white sticky top-0 z-20">
            <button onClick={onClose} className="text-gray-500 text-base font-medium active:text-gray-800 transition-colors">取消</button>
            <h2 className="text-gray-900 text-lg font-bold tracking-tight">选择颜色</h2>
            <button className="text-indigo-600 text-base font-bold active:text-indigo-700 transition-colors opacity-0 pointer-events-none">保存</button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar pb-4 bg-white">
            <div className="p-6 pb-2">
              <div 
                ref={colorPickerRef}
                onMouseDown={handlePickerMouseDown}
                className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden cursor-crosshair shadow-sm ring-1 ring-black/5 group"
                style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}
              >
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }}></div>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000, transparent)' }}></div>
                <div 
                  className="absolute size-6 rounded-full border-2 border-white shadow-md bg-transparent ring-1 ring-black/10 pointer-events-none transform transition-transform group-active:scale-110"
                  style={{ 
                    left: `${pickerPosition.x}%`, 
                    top: `${pickerPosition.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                ></div>
              </div>
            </div>
            <div className="px-6 py-2 space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-wider">色相</label>
                  <span className="text-gray-900 text-xs font-mono">{hue}°</span>
                </div>
                <div 
                  ref={hueSliderRef}
                  onMouseDown={handleHueMouseDown}
                  className="relative h-4 w-full rounded-full shadow-sm cursor-pointer ring-1 ring-black/5"
                  style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
                >
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 size-7 bg-white border border-gray-200 rounded-full shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                    style={{ left: `${(hue / 360) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-wider">不透明度</label>
                  <span className="text-gray-900 text-xs font-mono">{opacity}%</span>
                </div>
                <div 
                  ref={opacitySliderRef}
                  onMouseDown={handleOpacityMouseDown}
                  className="relative h-4 w-full rounded-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZWVlZWVlIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlZWVlZWUiLz48cmVjdCB4PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZmZmZmZmIi8+PHJlY3QgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg==')] bg-repeat shadow-inner ring-1 ring-black/5"
                >
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{ background: `linear-gradient(to right, transparent, ${currentColor})` }}
                  ></div>
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 size-7 bg-white border border-gray-200 rounded-full shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                    style={{ left: `${opacity}%`, transform: 'translate(-50%, -50%)' }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 grid grid-cols-[1fr_auto] gap-4 items-end">
              <label className="flex flex-col gap-2">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">HEX 代码</span>
                <div className="relative flex items-center group">
                  <span className="absolute left-4 text-gray-500 material-symbols-outlined text-[20px] group-focus-within:text-indigo-600 transition-colors">tag</span>
                  <input 
                    className="w-full h-12 bg-gray-50 border-none text-gray-900 rounded-xl pl-11 pr-4 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all uppercase placeholder-gray-400/50 font-bold" 
                    type="text" 
                    value={currentColor.replace('#', '').toUpperCase()} 
                    onChange={(e) => {
                      const hex = e.target.value.replace('#', '');
                      if (/^[0-9A-Fa-f]{0,6}$/.test(hex)) {
                        const newColor = '#' + hex.padStart(6, '0');
                        setCurrentColor(newColor);
                        const hsl = hexToHsl(newColor);
                        setHue(hsl.h);
                        setSaturation(hsl.s);
                        setLightness(hsl.l);
                        setPickerPosition({ x: hsl.s, y: 100 - hsl.l });
                      }
                    }}
                  />
                </div>
              </label>
              <div className="flex flex-col gap-2 items-center">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">预览</span>
                <div className="size-12 rounded-xl shadow-sm border border-gray-100 overflow-hidden relative ring-1 ring-black/5" style={{ backgroundColor: currentColor }}>
                  {opacity < 100 && (
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZWVlZWVlIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlZWVlZWUiLz48cmVjdCB4PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZmZmZmZmIi8+PHJlY3QgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg==')] bg-repeat"></div>
                  )}
                  <div 
                    className="absolute inset-0"
                    style={{ 
                      backgroundColor: currentColor,
                      opacity: opacity / 100
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="pl-6 py-2">
              <h3 className="text-gray-900 text-sm font-bold mb-3">预设颜色</h3>
              <div className="flex gap-1 overflow-x-auto no-scrollbar pb-4 pr-6 relative z-10" style={{ paddingLeft: '8px', borderTopWidth: '0px', paddingTop: '6px' }}>
                <button 
                  onClick={() => handlePresetColorClick('#3713ec')}
                  aria-label="Select Primary Blue" 
                  className={`shrink-0 size-10 rounded-full bg-[#3713ec] shadow-sm relative group transition-all ${
                    selectedPresetColor === '#3713ec' ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white' : 'ring-1 ring-black/5 hover:ring-2 hover:ring-indigo-600/50 hover:ring-offset-1'
                  }`}
                >
                  {selectedPresetColor === '#3713ec' && (
                    <span className="material-symbols-outlined text-white text-[18px] absolute inset-0 m-auto flex items-center justify-center">check</span>
                  )}
                </button>
                <button 
                  onClick={() => handlePresetColorClick('#FF3B30')}
                  aria-label="Select Red" 
                  className={`shrink-0 size-10 rounded-full bg-[#FF3B30] shadow-sm relative group transition-all ${
                    selectedPresetColor === '#FF3B30' ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white' : 'ring-1 ring-black/5 hover:ring-2 hover:ring-indigo-600/50 hover:ring-offset-1'
                  }`}
                >
                  {selectedPresetColor === '#FF3B30' && (
                    <span className="material-symbols-outlined text-white text-[18px] absolute inset-0 m-auto flex items-center justify-center">check</span>
                  )}
                </button>
                <button 
                  onClick={() => handlePresetColorClick('#FF9500')}
                  aria-label="Select Orange" 
                  className={`shrink-0 size-10 rounded-full bg-[#FF9500] shadow-sm relative group transition-all ${
                    selectedPresetColor === '#FF9500' ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white' : 'ring-1 ring-black/5 hover:ring-2 hover:ring-indigo-600/50 hover:ring-offset-1'
                  }`}
                >
                  {selectedPresetColor === '#FF9500' && (
                    <span className="material-symbols-outlined text-white text-[18px] absolute inset-0 m-auto flex items-center justify-center">check</span>
                  )}
                </button>
                <button 
                  onClick={() => handlePresetColorClick('#34C759')}
                  aria-label="Select Green" 
                  className={`shrink-0 size-10 rounded-full bg-[#34C759] shadow-sm relative group transition-all ${
                    selectedPresetColor === '#34C759' ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white' : 'ring-1 ring-black/5 hover:ring-2 hover:ring-indigo-600/50 hover:ring-offset-1'
                  }`}
                >
                  {selectedPresetColor === '#34C759' && (
                    <span className="material-symbols-outlined text-white text-[18px] absolute inset-0 m-auto flex items-center justify-center">check</span>
                  )}
                </button>
                <button 
                  onClick={() => handlePresetColorClick('#007AFF')}
                  aria-label="Select Blue" 
                  className={`shrink-0 size-10 rounded-full bg-[#007AFF] shadow-sm relative group transition-all ${
                    selectedPresetColor === '#007AFF' ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white' : 'ring-1 ring-black/5 hover:ring-2 hover:ring-indigo-600/50 hover:ring-offset-1'
                  }`}
                >
                  {selectedPresetColor === '#007AFF' && (
                    <span className="material-symbols-outlined text-white text-[18px] absolute inset-0 m-auto flex items-center justify-center">check</span>
                  )}
                </button>
                <button 
                  onClick={() => handlePresetColorClick('#5856D6')}
                  aria-label="Select Indigo" 
                  className={`shrink-0 size-10 rounded-full bg-[#5856D6] shadow-sm relative group transition-all ${
                    selectedPresetColor === '#5856D6' ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white' : 'ring-1 ring-black/5 hover:ring-2 hover:ring-indigo-600/50 hover:ring-offset-1'
                  }`}
                >
                  {selectedPresetColor === '#5856D6' && (
                    <span className="material-symbols-outlined text-white text-[18px] absolute inset-0 m-auto flex items-center justify-center">check</span>
                  )}
                </button>
                <button 
                  onClick={() => handlePresetColorClick('#FFFFFF')}
                  aria-label="Select White" 
                  className={`shrink-0 size-10 rounded-full bg-[#FFFFFF] border border-gray-200 shadow-sm relative group transition-all ${
                    selectedPresetColor === '#FFFFFF' ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white' : 'hover:ring-2 hover:ring-indigo-600/50 hover:ring-offset-1'
                  }`}
                >
                  {selectedPresetColor === '#FFFFFF' && (
                    <span className="material-symbols-outlined text-gray-600 text-[18px] absolute inset-0 m-auto flex items-center justify-center">check</span>
                  )}
                </button>
                <button 
                  onClick={() => handlePresetColorClick('#000000')}
                  aria-label="Select Black" 
                  className={`shrink-0 size-10 rounded-full bg-[#000000] shadow-sm relative group transition-all ${
                    selectedPresetColor === '#000000' ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white' : 'ring-1 ring-black/5 hover:ring-2 hover:ring-indigo-600/50 hover:ring-offset-1'
                  }`}
                >
                  {selectedPresetColor === '#000000' && (
                    <span className="material-symbols-outlined text-white text-[18px] absolute inset-0 m-auto flex items-center justify-center">check</span>
                  )}
                </button>
                <button 
                  onClick={() => handlePresetColorClick('#FF2D55')}
                  aria-label="Select Pink" 
                  className={`shrink-0 size-10 rounded-full bg-[#FF2D55] shadow-sm relative group transition-all ${
                    selectedPresetColor === '#FF2D55' ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white' : 'ring-1 ring-black/5 hover:ring-2 hover:ring-indigo-600/50 hover:ring-offset-1'
                  }`}
                >
                  {selectedPresetColor === '#FF2D55' && (
                    <span className="material-symbols-outlined text-white text-[18px] absolute inset-0 m-auto flex items-center justify-center">check</span>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="p-6 pt-4 bg-white border-t border-gray-50 pb-8 sm:pb-6">
            <button 
              onClick={handleConfirm}
              className="w-full bg-[#3713ec] hover:bg-[#2c0fb8] text-white text-base font-medium py-3.5 rounded-full shadow-lg shadow-indigo-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">palette</span>
              确认选择
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
