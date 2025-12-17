import React, { useState, useRef, useEffect } from 'react';
import { ImagePlus, ChevronDown, Coins, Upload, X, Star } from 'lucide-react';
import clsx from 'clsx';

// Data Mockups - Expanded to 20+ items
const generateModels = (type: 'adult' | 'child', count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: type === 'adult' ? i + 1 : i + 101,
    image: `https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=${type === 'adult' ? 'fashion model portrait' : 'child fashion model'} pose ${i + 1}&image_size=portrait_3_4`
  }));
};

const adultModels = generateModels('adult', 25);
const childModels = generateModels('child', 25);

const styleSets = {
  daily: Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    title: `日常·样例${i + 1}`,
    image: `https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=daily%20lifestyle%20fashion%20${i + 1}&image_size=square`
  })),
  magazine: Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    title: `杂志·样例${i + 1}`,
    image: `https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=magazine%20editorial%20fashion%20${i + 1}&image_size=square`
  })),
  sport: Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    title: `运动·样例${i + 1}`,
    image: `https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=sport%20active%20fashion%20${i + 1}&image_size=square`
  })),
};



export const LeftPanel: React.FC = () => {
  const [version, setVersion] = useState<'common' | 'pro'>('common');
  const [modelType, setModelType] = useState<'adult' | 'child'>('adult');
  const [selectedModel, setSelectedModel] = useState<number>(1);
  const [styleCategory, setStyleCategory] = useState('daily');
  const [selectedStyle, setSelectedStyle] = useState<number>(1);
  const [ratio, setRatio] = useState('1:1');
  const [quantity, setQuantity] = useState(1);
  
  // Upload State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [hoveredModelId, setHoveredModelId] = useState<number | null>(null);
  const [modalPreviewPos, setModalPreviewPos] = useState({ top: 0, arrowTop: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const modalGridRef = useRef<HTMLDivElement>(null);

  // Main List Hover State
  const [mainHoveredId, setMainHoveredId] = useState<number | null>(null);
  const [mainPreviewPos, setMainPreviewPos] = useState({ top: 0, arrowTop: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [styleHoveredId, setStyleHoveredId] = useState<number | null>(null);
  const stylePopoverRef = useRef<HTMLDivElement>(null);
  const styleModalGridRef = useRef<HTMLDivElement>(null);
  const [styleModalPreviewPos, setStyleModalPreviewPos] = useState({ top: 0, arrowTop: 0 });
  const [styleMainHoveredId, setStyleMainHoveredId] = useState<number | null>(null);
  const [styleMainPreviewPos, setStyleMainPreviewPos] = useState({ top: 0, arrowTop: 0 });
  
  // Dynamic Model Lists
  const [currentAdultModels, setCurrentAdultModels] = useState(adultModels.slice(0, 5));
  const [currentChildModels, setCurrentChildModels] = useState(childModels.slice(0, 5));
  const [currentDailyStyles, setCurrentDailyStyles] = useState(styleSets.daily.slice(0, 5));
  const [currentMagazineStyles, setCurrentMagazineStyles] = useState(styleSets.magazine.slice(0, 5));
  const [currentSportStyles, setCurrentSportStyles] = useState(styleSets.sport.slice(0, 5));

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowMoreModal(false);
      }
    };

    if (showMoreModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreModal]);

  useEffect(() => {
    const handleClickOutsideStyle = (event: MouseEvent) => {
      if (stylePopoverRef.current && !stylePopoverRef.current.contains(event.target as Node)) {
        setShowStyleModal(false);
      }
    };

    if (showStyleModal) {
      document.addEventListener('mousedown', handleClickOutsideStyle);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideStyle);
    };
  }, [showStyleModal]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'image/gif'].includes(file.type)) {
        alert('不支持的文件格式');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModelSelect = (id: number, isAdult: boolean) => {
    setSelectedModel(id);
    const fullList = isAdult ? adultModels : childModels;
    const model = fullList.find(m => m.id === id);
    
    if (model) {
      const currentList = isAdult ? currentAdultModels : currentChildModels;
      const setList = isAdult ? setCurrentAdultModels : setCurrentChildModels;
      
      const isVisible = currentList.slice(0, 5).find(m => m.id === id);

      if (isVisible) {
        // Restore logic: Reset list to default top 5
        setList(fullList.slice(0, 5));
      } else {
        // Replace first image logic
        const newList = [...currentList];
        newList[0] = model; // Replace index 0
        setList(newList);
      }
    }
  };

  // Main List Hover Handler
  const handleMainHover = (e: React.MouseEvent<HTMLDivElement>, id: number | null) => {
    if (showMoreModal) return; // Do nothing if modal is open

    if (id === null) {
      setMainHoveredId(null);
      return;
    }

    setMainHoveredId(id);
    if (containerRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Calculate position relative to container
      const itemTop = rect.top - containerRect.top;
      const arrowTop = itemTop + rect.height / 2;
      const previewHeight = 400;
      let top = arrowTop - previewHeight / 2;
      
      // Constraints
      const containerHeight = containerRef.current.offsetHeight;
      if (top < 0) top = 0;
      if (top + previewHeight > containerHeight) {
        top = containerHeight - previewHeight;
      }

      setMainPreviewPos({
        top,
        arrowTop: arrowTop - top // Relative to preview box
      });
    }
  };

  const displayedModels = modelType === 'adult' ? currentAdultModels : currentChildModels;
  const modalModels = modelType === 'adult' ? adultModels : childModels;
  const currentStyles =
    styleCategory === 'daily'
      ? currentDailyStyles
      : styleCategory === 'magazine'
      ? currentMagazineStyles
      : currentSportStyles;
  const setCurrentStyles =
    styleCategory === 'daily'
      ? setCurrentDailyStyles
      : styleCategory === 'magazine'
      ? setCurrentMagazineStyles
      : setCurrentSportStyles;
  const modalStyles = styleSets[styleCategory];
  
  // Modal Preview Logic
  const previewModelId = hoveredModelId || selectedModel;
  const previewModel = modalModels.find(m => m.id === previewModelId);

  // Main List Preview Logic
  const mainPreviewModel = (modelType === 'adult' ? adultModels : childModels).find(m => m.id === mainHoveredId);
  const styleMainPreviewModel = currentStyles.find(s => s.id === styleMainHoveredId);

  // 预览位置改为基于悬停项的真实几何计算

  return (
    <div 
      ref={containerRef}
      className="w-[450px] flex-shrink-0 bg-white shadow-sm flex flex-col relative ml-[1px]" 
      style={{ maxHeight: 'calc(100vh - 85px)', marginTop: '1px' }}
    >
      <div className="overflow-y-auto scrollbar-thin-transparent flex-1">
        <div className="p-6 pb-0 space-y-6">
          <h1 className="text-lg font-semibold text-gray-800 mb-6">模特图生成</h1>

          {/* Version Toggle */}
          <div className="bg-gray-100 p-1 rounded-full flex w-full">
            <button
              onClick={() => setVersion('common')}
              className={clsx(
                "flex-1 py-2 text-sm font-medium rounded-full transition-all",
                version === 'common' ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              通用版
            </button>
            <button
              onClick={() => setVersion('pro')}
              className={clsx(
                "flex-1 py-2 text-sm font-medium rounded-full transition-all",
                version === 'pro' ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              专业版
            </button>
          </div>

          {/* Upload Area */}
          <div>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden"
              accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif"
              onChange={handleFileUpload}
            />
            
            {!uploadedImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 h-32 flex flex-col items-center justify-center cursor-pointer hover:border-brand hover:bg-brand-light/5 transition-colors group"
              >
                <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center mb-2 group-hover:bg-brand/20 transition-colors">
                  <ImagePlus className="w-5 h-5 text-brand" />
                </div>
                <p className="text-gray-900 font-bold mb-1 text-base">上传服饰实拍图</p>
                <p className="text-xs text-gray-400">点击/拖拽图片至此处</p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-brand/30 rounded-2xl bg-brand/5 p-4 flex items-center justify-between group h-32">
                <div className="w-20 h-full rounded-lg overflow-hidden bg-white border border-gray-200">
                  <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-brand/10 text-brand rounded-full text-sm font-medium hover:bg-brand/20 transition-colors"
                >
                  重新上传
                </button>
              </div>
            )}
          </div>

          {/* Model Type Selection */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3">选择模特类型</h3>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setModelType('adult')}
                className={clsx(
                  "flex-1 py-2 rounded-full text-sm font-medium transition-all border",
                  modelType === 'adult' 
                    ? "bg-brand/10 text-brand border-brand" 
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                )}
              >
                成人
              </button>
              <button
                onClick={() => setModelType('child')}
                className={clsx(
                  "flex-1 py-2 rounded-full text-sm font-medium transition-all border",
                  modelType === 'child' 
                    ? "bg-brand/10 text-brand border-brand" 
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                )}
              >
                儿童
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {displayedModels.map((model) => (
                <div 
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  onMouseEnter={(e) => handleMainHover(e, model.id)}
                  onMouseLeave={(e) => handleMainHover(e, null)}
                  className={clsx(
                    "aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all relative",
                    selectedModel === model.id ? "border-brand" : "border-transparent hover:border-gray-200",
                    // Visual feedback for hover
                    "hover:border-brand/50"
                  )}
                >
                  <img src={model.image} alt="Model" className="w-full h-full object-cover" />
                </div>
              ))}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreModal(true);
                }}
                className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
              >
                <span className="text-gray-500 text-xs">更多 &gt;</span>
              </div>
            </div>
          </div>

          {/* Style Scene Selection */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3">选择风格场景</h3>
            <div className="flex gap-3 mb-4">
              {[
                { key: 'daily', label: '日常生活风' },
                { key: 'magazine', label: '时尚杂志风' },
                { key: 'sport', label: '运动活力风' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setStyleCategory(item.key); setSelectedStyle(1); }}
                  className={clsx(
                    "flex-1 py-2 rounded-full text-sm font-medium transition-all border",
                    styleCategory === item.key
                      ? "bg-brand/10 text-brand border-brand"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            
            {/* <div className="relative mb-3">
               <button className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-left text-xs text-gray-600 flex items-center justify-between">
                 <span>全部</span>
                 <ChevronDown className="w-3 h-3" />
               </button>
            </div> */}

            <div className="grid grid-cols-3 gap-2">
              {currentStyles.map((style) => (
                <div 
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const containerRect = containerRef.current?.getBoundingClientRect();
                    if (!containerRect) return;
                    const itemTop = rect.top - containerRect.top;
                    const arrowTop = itemTop + rect.height / 2;
                    const previewHeight = 300;
                    let top = arrowTop - previewHeight / 2;
                    const containerHeight = containerRef.current!.offsetHeight;
                    if (top < 0) top = 0;
                    if (top + previewHeight > containerHeight) top = containerHeight - previewHeight;
                    setStyleMainHoveredId(style.id);
                    setStyleMainPreviewPos({ top, arrowTop: arrowTop - top });
                  }}
                  onMouseLeave={() => setStyleMainHoveredId(null)}
                  className={clsx(
                    "group relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                    selectedStyle === style.id ? "border-brand" : "border-transparent"
                  )}
                >
                  <img src={style.image} alt={style.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-black/40 p-1 backdrop-blur-[1px]">
                    <p className="text-white text-[10px] text-center truncate">{style.title}</p>
                  </div>
                </div>
              ))}
              <div 
                onClick={() => { setShowStyleModal(true); setStyleHoveredId(selectedStyle); }}
                className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
              >
                <span className="text-gray-500 text-xs">更多</span>
              </div>
            </div>
          </div>

          {/* Ratio Selection */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3">选择图片比例</h3>
            <div className="flex gap-3">
              {['1:1', '2:3', '3:4'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className={clsx(
                    "flex-1 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    ratio === r 
                      ? "bg-brand/10 text-brand border-brand/20" 
                      : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="pb-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">选择图片数量</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 6, 9].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuantity(q)}
                  className={clsx(
                    "flex-1 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    quantity === q 
                      ? "bg-brand/10 text-brand border-brand/20" 
                      : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Footer Button & Agreement */}
        <div className="sticky bottom-0 left-0 right-0 p-6 pt-2 bg-white z-10 border-t border-gray-50">
          <button className="w-full bg-gradient-to-r from-[#6C5CFF] to-[#5a4cf0] text-white py-3 rounded-full text-base font-bold shadow-lg shadow-brand/30 hover:shadow-brand/40 transition-all flex items-center justify-center gap-2">
            <span>开始生成</span>
            <div className="flex items-center bg-white/20 rounded-full px-2 py-0.5 text-xs">
              <span>30</span>
              <Coins className="w-3 h-3 ml-1 fill-yellow-400 text-yellow-400" />
            </div>
          </button>
          <div className="mt-3 text-center">
            <p className="text-[10px] text-gray-400">
              使用即表示您已阅读并同意 <a href="#" className="text-[#4C3BFF] hover:underline">《衣来图AI服务协议》</a>
            </p>
          </div>
        </div>
      </div>

      {/* Main List Hover Preview */}
      {!showMoreModal && mainHoveredId && mainPreviewModel && (
         <div 
            className="absolute left-[460px] bg-white p-2 rounded-2xl shadow-xl border border-gray-100 z-50 animate-in fade-in zoom-in duration-150"
            style={{ top: mainPreviewPos.top }}
         >
            {/* Speech bubble arrow pointing left */}
            <div 
              className="absolute -left-2 w-4 h-4 bg-white transform rotate-45 border-l border-b border-gray-100 z-0" 
              style={{ top: mainPreviewPos.arrowTop }}
            />
            
            <div className="w-[280px] aspect-[3/4] relative z-10 bg-white rounded-xl overflow-hidden">
              <img 
                src={mainPreviewModel.image} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>
         </div>
      )}

      {!showStyleModal && styleMainHoveredId && styleMainPreviewModel && (
        <div 
          className="absolute left-[460px] bg-white p-2 rounded-2xl shadow-xl border border-gray-100 z-40 animate-in fade-in zoom-in duration-150"
          style={{ top: styleMainPreviewPos.top }}
        >
          <div 
            className="absolute -left-2 w-4 h-4 bg-white transform rotate-45 border-l border-b border-gray-100 z-0"
            style={{ top: styleMainPreviewPos.arrowTop }}
          />
          <div className="w-[240px] aspect-square relative z-10 bg-white rounded-xl overflow-hidden">
            <img src={styleMainPreviewModel.image} alt="Preview" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* More Models Popover */}
      {showMoreModal && (
        <div 
          ref={popoverRef}
          className="absolute left-[calc(100%+1px)] top-0 z-[100] flex animate-in fade-in slide-in-from-left-2 duration-200 items-start h-full"
        >
           {/* Popover Content */}
           <div className="bg-white rounded-2xl w-[300px] h-full max-h-[calc(100vh-85px)] flex flex-col shadow-2xl relative z-10 border border-gray-100 overflow-hidden hover-scroll">
              <div className="flex items-center justify-between p-4 border-b border-gray-50">
                <h3 className="font-bold text-base text-gray-800">姿势</h3>
                <button onClick={() => setShowMoreModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div ref={modalGridRef} className="flex-1 overflow-y-auto p-4 scrollbar-thin-dark">
                <div className="grid grid-cols-3 gap-2">
                  {modalModels.map((model) => (
                    <div 
                      key={model.id}
                      onMouseEnter={(e) => {
                        setHoveredModelId(model.id);
                        if (popoverRef.current) {
                          const itemRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          const popoverRect = popoverRef.current.getBoundingClientRect();
                          const centerY = itemRect.top - popoverRect.top + itemRect.height / 2;
                          const previewHeight = 400;
                          let top = centerY - previewHeight / 2;
                          const popoverHeight = popoverRef.current.offsetHeight;
                          if (top < 0) top = 0;
                          if (top + previewHeight > popoverHeight) {
                            top = popoverHeight - previewHeight;
                          }
                          setModalPreviewPos({ top, arrowTop: centerY - top });
                        }
                      }}
                      onMouseLeave={() => setHoveredModelId(null)}
                      onClick={() => handleModelSelect(model.id, modelType === 'adult')}
                      className={clsx(
                        "aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all relative",
                        selectedModel === model.id ? "border-brand" : "border-transparent",
                        "hover:border-brand"
                      )}
                    >
                      <img src={model.image} alt="Model" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
           </div>

           {/* Hover Preview - Floating next to popover */}
           {hoveredModelId && previewModel && (
             <div 
               className="absolute left-[310px] bg-white p-2 rounded-2xl shadow-xl border border-gray-100 z-20 animate-in fade-in zoom-in duration-150"
               style={{ top: modalPreviewPos.top }}
             >
                {/* Speech bubble arrow pointing left to the grid item */}
                <div 
                  className="absolute -left-2 w-4 h-4 bg-white transform rotate-45 border-l border-b border-gray-100 z-0" 
                  style={{ top: modalPreviewPos.arrowTop }}
                />
                
                <div className="w-[280px] aspect-[3/4] relative z-10 bg-white rounded-xl overflow-hidden">
                  <img 
                    src={previewModel.image} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
             </div>
           )}
        </div>
      )}

      {showStyleModal && (
        <div 
          ref={stylePopoverRef}
          className="absolute left-[calc(100%+1px)] top-0 z-[100] flex animate-in fade-in slide-in-from-left-2 duration-200 items-start h-full"
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.style-modal-content') === null && target.closest('.style-modal-grid-item') === null) {
              setShowStyleModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-[300px] h-full max-h-[calc(100vh-85px)] flex flex-col shadow-2xl relative z-10 border border-gray-100 overflow-hidden hover-scroll">
            <div className="flex items-center justify-between p-4 border-b border-gray-50">
              <h3 className="font-bold text-base text-gray-800">风格</h3>
              <button onClick={() => setShowStyleModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div ref={styleModalGridRef} className="flex-1 overflow-y-auto p-4 scrollbar-thin-dark style-modal-content">
              <div className="grid grid-cols-3 gap-2">
                {modalStyles.map((style) => (
                  <div
                    key={style.id}
                    onMouseEnter={(e) => {
                      setStyleHoveredId(style.id);
                      if (stylePopoverRef.current) {
                        const itemRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        const popRect = stylePopoverRef.current.getBoundingClientRect();
                        const centerY = itemRect.top - popRect.top + itemRect.height / 2;
                        const previewHeight = 300;
                        let top = centerY - previewHeight / 2;
                        const ph = stylePopoverRef.current.offsetHeight;
                        if (top < 0) top = 0;
                        if (top + previewHeight > ph) top = ph - previewHeight;
                        setStyleModalPreviewPos({ top, arrowTop: centerY - top });
                      }
                    }}
                    onMouseLeave={() => setStyleHoveredId(null)}
                    onClick={() => {
                      setSelectedStyle(style.id);
                      const target = modalStyles.find(s => s.id === style.id);
                      if (!target) return;
                      if (style.id > 5) {
                        const newList = [...currentStyles];
                        newList[0] = target;
                        setCurrentStyles(newList);
                      } else {
                        // Restore default first image if selecting one of the first 5
                        const defaultFirst = modalStyles.find(s => s.id === 1);
                        if (defaultFirst) {
                          const newList = [...currentStyles];
                          newList[0] = defaultFirst;
                          setCurrentStyles(newList);
                        }
                      }
                    }}
                    className={clsx(
                      "style-modal-grid-item aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all relative",
                      selectedStyle === style.id ? "border-brand" : "border-transparent",
                      "hover:border-brand"
                    )}
                  >
                    <img src={style.image} alt={style.title} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {styleHoveredId && (
            <div 
              className="absolute left-[310px] bg-white p-2 rounded-2xl shadow-xl border border-gray-100 z-20 animate-in fade-in zoom-in duration-150"
              style={{ top: styleModalPreviewPos.top }}
            >
              <div 
                className="absolute -left-2 w-4 h-4 bg-white transform rotate-45 border-l border-b border-gray-100 z-0"
                style={{ top: styleModalPreviewPos.arrowTop }}
              />
              <div className="w-[240px] aspect-square relative z-10 bg-white rounded-xl overflow-hidden">
                <img src={modalStyles.find(s=>s.id===styleHoveredId)?.image || ''} alt="Preview" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
