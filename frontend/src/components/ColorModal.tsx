import React from 'react';
import { X } from 'lucide-react';

export interface ColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetColors: Array<{ id: string; name: string; color: string }>;
  selectedColorId?: string;
  onColorSelect: (colorId: string, colorHex: string) => void;
}

export const ColorModal: React.FC<ColorModalProps> = ({
  isOpen,
  onClose,
  presetColors,
  selectedColorId,
  onColorSelect
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="absolute left-[calc(100%+1px)] top-0 z-[100] flex animate-in fade-in slide-in-from-left-2 duration-200 items-start h-full"
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.color-modal-content') === null && target.closest('.color-modal-grid-item') === null) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl w-[300px] h-full max-h-[calc(100vh-56px)] flex flex-col shadow-2xl relative z-10 border border-gray-100 overflow-hidden hover-scroll">
        <div className="flex items-center justify-between p-4 border-b border-gray-50">
          <h3 className="font-bold text-base text-gray-800">更多颜色</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin-dark color-modal-content">
          <div className="grid grid-cols-3 gap-2">
            {presetColors.map((color) => (
              <div
                key={color.id}
                id={`color-item-${color.id}`}
                className="color-modal-grid-item aspect-square rounded-lg cursor-pointer transition-all hover:scale-105 relative"
                style={{ 
                  backgroundColor: color.color,
                  border: selectedColorId === color.id ? '2px solid #3713ec' : '1px solid rgba(0,0,0,0.1)'
                }}
                onClick={() => onColorSelect(color.id, color.color)}
              >
                <div className="absolute bottom-1 left-1 right-1">
                  <div className="bg-black/30 backdrop-blur-sm rounded px-1 py-0.5">
                    <p className="text-white text-[10px] font-medium text-center truncate">{color.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
