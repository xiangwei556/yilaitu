
import React from 'react';

const Sidebar: React.FC = () => {
  const navItems = [
    { icon: 'home', label: '首页' },
    { icon: 'auto_awesome', label: '模特图生成' },
    { icon: 'texture', label: '白底图生成' },
    { icon: 'swap_horiz', label: '模特换装' },
    { icon: 'face_retouching_natural', label: '模特换脸' },
    { icon: 'auto_fix_high', label: '万能改图', active: true },
    { icon: 'history', label: '生图记录' },
  ];

  return (
    <aside className="w-60 bg-white dark:bg-gray-900 p-4 flex flex-col justify-between flex-shrink-0 border-r border-gray-100 dark:border-gray-800 z-20 overflow-y-auto custom-scrollbar">
      <nav className="flex flex-col space-y-2">
        {navItems.map((item) => (
          <a
            key={item.label}
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              item.active 
                ? 'bg-primary/10 text-primary font-semibold' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            href="#"
          >
            <span className="material-icons-outlined mr-3">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
