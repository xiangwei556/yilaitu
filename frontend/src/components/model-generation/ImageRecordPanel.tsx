import React from 'react';

export const ImageRecordPanel: React.FC = () => {
  return (
    <div className="w-32 flex-shrink-0 bg-white shadow-sm border-r border-gray-100 flex flex-col z-20">
      <div className="px-3 py-4 border-b border-transparent text-center">
        <h3 className="font-medium text-gray-900 text-xs text-left">生图记录</h3>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        <div className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors group">
          <span className="material-icons-outlined text-gray-400 group-hover:text-brand mb-1">add</span>
          <span className="text-[10px] text-gray-500 group-hover:text-brand font-medium text-center leading-tight">继续<br/>创建</span>
        </div>
        <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 relative cursor-not-allowed">
          <img 
            alt="Generating" 
            className="w-full h-full object-cover blur-[1px]" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBBWee5XJU3NfGHSrlQMvTy_wQiHz3hiKYRU__m0_2YdDto-Udsmhg7OreW1ggLP36NHjnOeiqxUC3lIg1-6FfgCh5U9nydgK_m9GlUD-ozH8RbcDaHXorPkmeO1qINfiBA5wkMunBEKVSPxcttUKQU7N_5LP1-9xc17AoSXumxl5mewBD6SnpNuXgffBoZ9uz7C5sQgly2KvHBJZ9tsFMVIuxRCr94ymZYcTL6VAcSaBKnNCCuRyI6kAfYv_KYNnrynmVAXaa3aSf" 
          />
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center">
            <div className="flex flex-col items-center space-y-1">
              <div className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-white text-[10px] font-bold tracking-wide mt-1">生成中</span>
            </div>
          </div>
        </div>
        <div className="w-full aspect-square rounded-lg overflow-hidden cursor-pointer ring-2 ring-brand ring-offset-2 ring-offset-white shadow-sm relative group">
          <img 
            alt="History Item" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXQ4WKCL9u82oUmzL03r-1D81Xm2NZ5abWXlIWo5YtE0xzHVck4a_fd59tzaCjbI9SFap8RRhY69vT94FJr0gJH7xSABRzObrtVYl7lboi0omei-64qLusxqf8Swz4uhwt2INSrw7LXbUZ2xI3kgg-6g6sXbYWGIfHgyjQlU3CWgV0C67Ni9PKEOD2Doubm8gW0exfwaMcNdrfosTcMAom0YEPTtLLB20t4fd3_VICUkTpukDRaepbZAxWJI2JJiypY9oBmTmaqR2u" 
          />
        </div>
        <div className="w-full aspect-square rounded-lg overflow-hidden cursor-pointer relative group border border-transparent hover:border-brand/50 transition-all">
          <img 
            alt="History Item" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiTuau-KSX7rZn3GkNMp9JGj5DPTjKjXrroKrvSevZ2X9jt3vgrsZWA9kRWcfkXfn3UCrBVm8aI6dCH013_nbMMqnue5zczWBaZMnzdA1V86XsBBEYJqQVsY90qYCKlRYp0gyrYgSqx6gW9oBw9hM5NUTbniQwAsYb-IbDO4U_iQZohteHWRroTi4WmK5sxzl03-rUimslcBdfceboTNIdM0CBtvh9pbZZBQEOSoXTcNKsipPVAI042u1kY4rbJx3P-gcVGRXA_6q4" 
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
        </div>
        <div className="w-full aspect-square rounded-lg overflow-hidden cursor-pointer relative group border border-transparent hover:border-brand/50 transition-all">
          <img 
            alt="History Item" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmFx42Z3dUvpkrX5GFR0ndn4qcJ24cYSJO4yFa0LblWvA-Fcdi7IXSArSaqS4T6lpQugEjGYowMs-eRlouG3OuWXCJzVmEsiZeSyl6ae5XNDMRnhP-pS22t7mybWzugk1rrPcLOJxP89Tqi3X1eTa65y7T0j-XnwEEcOxYR-Kv3w9v7Y8wZZVTotoZEj0NyNkoXtDKAEjbYdwjxTmz-W0SDEEOwlU52oaCc-1gs6-AnteAGrRpK9YMJY0xINPGgGGHQCSA8H0hM-AV" 
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
        </div>
      </div>
      <div className="p-2 border-t border-gray-200">
        <button className="w-full flex items-center justify-center space-x-0.5 text-[10px] text-gray-500 hover:text-brand transition-colors py-1">
          <span>全部记录</span>
          <span className="material-icons-outlined text-xs">chevron_right</span>
        </button>
      </div>
    </div>
  );
};
