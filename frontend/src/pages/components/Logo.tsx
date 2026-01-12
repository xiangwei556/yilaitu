import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo.png"
        alt="衣来图"
        width={32}
        height={32}
        className="w-8 h-8 rounded-lg object-contain"
      />
      <span className="text-xl font-bold text-gray-900 tracking-wide">衣来图</span>
    </div>
  );
};
