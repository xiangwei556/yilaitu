
import React from 'react';
import { InpaintHistory } from '../types';

interface HistoryBarProps {
  history: InpaintHistory[];
  onSelect: (item: InpaintHistory) => void;
}

const HistoryBar: React.FC<HistoryBarProps> = ({ history, onSelect }) => {
  return (
    <aside className="w-16 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-shrink-0 z-10">
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 text-center">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest [writing-mode:vertical-lr] mx-auto block py-2">HISTORY</span>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center p-2 space-y-3">
        {history.length > 0 ? history.map((item, idx) => (
          <div 
            key={item.timestamp}
            onClick={() => onSelect(item)}
            className={`w-10 h-10 rounded-lg overflow-hidden border cursor-pointer relative group transition-all ${idx === 0 ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-300'}`}
          >
            <img alt="History" className="w-full h-full object-cover" src={item.imageUrl} />
            <div className="absolute inset-0 bg-primary/20 hidden group-hover:flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[16px]">visibility</span>
            </div>
          </div>
        )) : (
          <div className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center opacity-30">
            <span className="material-symbols-outlined text-sm">image</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default HistoryBar;
