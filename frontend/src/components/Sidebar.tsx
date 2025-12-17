import React from 'react';
import clsx from 'clsx';

const menuItems = [
  { icon: 'home', label: '首页', id: 'home' },
  { icon: 'auto_awesome', label: '模特图生成', id: 'model-gen', active: true },
  { icon: 'texture', label: '白底图生成', id: 'white-bg' },
  { icon: 'swap_horiz', label: '模特换装', id: 'outfit-change' },
  { icon: 'face_retouching_natural', label: '模特换脸', id: 'face-swap' },
  { icon: 'accessibility_new', label: '姿势裂变', id: 'pose-split' },
  { icon: 'color_lens', label: '服装换色', id: 'color-change' },
  { icon: 'photo_size_select_large', label: '扩图', id: 'expand' },
  { icon: 'hd', label: '变清晰', id: 'clarify' },
  { icon: 'auto_fix_high', label: '万能改图', id: 'magic-edit' },
  { icon: 'history', label: '生图记录', id: 'history' },
];

export const Sidebar: React.FC = () => {
  return (
    <div className="w-[200px] h-[calc(100vh-4rem)] bg-white border-r border-gray-100 flex flex-col fixed left-0 top-16 z-40">
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => (
            <li key={item.id}>
              <a
                href="#"
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  item.active 
                    ? "text-brand bg-brand-light/10 relative" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {item.active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand rounded-r-full" />
                )}
                <span className="material-icons-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
