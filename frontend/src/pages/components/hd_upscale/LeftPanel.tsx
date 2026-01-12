import React, { useState, useRef } from 'react';
import clsx from 'clsx';

interface LeftPanelProps {
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  showGenerateSuccess: boolean;
  setShowGenerateSuccess: (value: boolean) => void;
  onResetRef: React.MutableRefObject<(() => void) | null>;
  onGeneratedData: (images: string[], taskId: string, generationParams?: any) => void;
  onLoadFromRecord?: (record: any) => void;
  onLoadFromRecordRef?: React.MutableRefObject<((record: any) => void) | null>;
  refreshImageRecordsRef?: React.MutableRefObject<(() => void) | null>;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  isGenerating,
  setIsGenerating,
  showGenerateSuccess,
  setShowGenerateSuccess,
  onResetRef,
  onGeneratedData,
  onLoadFromRecord,
  onLoadFromRecordRef,
  refreshImageRecordsRef
}) => {
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('original');
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showValidationOverlay, setShowValidationOverlay] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
          setCustomWidth(img.width.toString());
          setCustomHeight(img.height.toString());
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSizeClick = (size: string) => {
    setSelectedSize(size);
    if (size !== 'custom' && imageDimensions) {
      if (size === '2x') {
        setCustomWidth((imageDimensions.width * 2).toString());
        setCustomHeight((imageDimensions.height * 2).toString());
      } else if (size === '4x') {
        setCustomWidth((imageDimensions.width * 4).toString());
        setCustomHeight((imageDimensions.height * 4).toString());
      } else {
        setCustomWidth(imageDimensions.width.toString());
        setCustomHeight(imageDimensions.height.toString());
      }
    }
  };

  const handleGenerate = () => {
    if (!uploadedImage) {
      setValidationMessage('请先上传图片');
      setShowValidationOverlay(true);
      setTimeout(() => {
        setShowValidationOverlay(false);
      }, 2000);
      return;
    }

    if (selectedSize === 'custom') {
      if (!customWidth || !customHeight) {
        setValidationMessage('请输入完整的自定义尺寸');
        setShowValidationOverlay(true);
        setTimeout(() => {
          setShowValidationOverlay(false);
        }, 2000);
        return;
      }

      const width = parseInt(customWidth, 10);
      const height = parseInt(customHeight, 10);

      if (isNaN(width) || isNaN(height)) {
        setValidationMessage('请输入正确的尺寸');
        setShowValidationOverlay(true);
        setTimeout(() => {
          setShowValidationOverlay(false);
        }, 2000);
        return;
      }

      if (width < 100 || height < 100) {
        setValidationMessage('尺寸不能小于100px');
        setShowValidationOverlay(true);
        setTimeout(() => {
          setShowValidationOverlay(false);
        }, 2000);
        return;
      }

      if (width > 4096 || height > 4096) {
        setValidationMessage('尺寸不能大于4096px');
        setShowValidationOverlay(true);
        setTimeout(() => {
          setShowValidationOverlay(false);
        }, 2000);
        return;
      }
    }

    console.log('=== 用户选择的内容 ===');
    console.log('上传的图片:', uploadedImage);
    console.log('选择的尺寸:', selectedSize === 'original' ? '保持原尺寸' : selectedSize === '2x' ? '放大2倍' : selectedSize === '4x' ? '放大4倍' : '自定义尺寸');
    console.log('自定义宽度:', customWidth);
    console.log('自定义高度:', customHeight);
    console.log('原图尺寸:', imageDimensions ? `${imageDimensions.width} x ${imageDimensions.height}` : '未获取');
    console.log('====================');

    setIsGenerating(true);
    console.log('生成参数:', {
      uploaded_image: uploadedImage,
      selected_size: selectedSize,
      custom_width: customWidth,
      custom_height: customHeight,
      original_dimensions: imageDimensions
    });

    setTimeout(() => {
      const mockImages = [uploadedImage];
      const mockTaskId = Date.now().toString();
      onGeneratedData(mockImages, mockTaskId, {
        uploaded_image: uploadedImage,
        selected_size: selectedSize,
        custom_width: customWidth,
        custom_height: customHeight
      });
      setIsGenerating(false);
    }, 2000);
  };

  const handleReset = () => {
    setUploadedImage('');
    setSelectedSize('original');
    setCustomWidth('');
    setCustomHeight('');
    setImageDimensions(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  React.useEffect(() => {
    if (onResetRef) {
      onResetRef.current = handleReset;
    }
  }, [onResetRef]);

  return (
    <div className="w-[400px] bg-white border-r border-gray-100 h-full flex flex-col">
      <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-border-light dark:border-border-dark">
       <div className="flex items-center gap-1">
            <h1 className="text-lg font-semibold">变清晰</h1>
       </div>
      </header>
      <div className="px-4 py-6 flex-1 overflow-y-auto">
        <div className="space-y-6">
          <div className="space-y-4">
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {!uploadedImage ? (
              <div 
                onClick={handleUploadClick}
                className="bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/30 dark:border-primary/50 rounded-xl p-6 text-center flex flex-col items-center justify-center h-48 transition-colors hover:bg-primary/10 hover:border-primary/50 cursor-pointer"
              >
                <div className="flex justify-center mb-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>
                      add_photo_alternate
                    </span>
                  </div>
                </div>
                <p className="font-medium text-text-primary-light dark:text-text-primary-dark">上传图片</p>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">点击/拖拽图片至此处</p>
              </div>
            ) : (
              <div className="bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/30 dark:border-primary/50 rounded-xl p-3 flex items-center h-48 gap-4">
                <div className="h-full aspect-[3/4] relative rounded-lg overflow-hidden bg-white border border-black/5 flex-shrink-0">
                  <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex justify-center items-center">
                  <button
                    onClick={handleUploadClick}
                    className="px-5 py-2.5 rounded-full bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 transition-colors"
                  >
                    重新上传
                  </button>
                </div>
              </div>
            )}
            <div className="flex justify-center">
              <p className="text-xs text-gray-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
                原图尺寸：{imageDimensions ? `${imageDimensions.width} x ${imageDimensions.height}` : '344 x 456'}
              </p>
            </div>
          </div>

          <section className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">选择尺寸</h3>
              <div className="grid grid-cols-3 gap-2.5">
                <div 
                  onClick={() => handleSizeClick('original')}
                  className={clsx(
                    "aspect-square rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all",
                    selectedSize === 'original'
                      ? "bg-white border-2 border-[#3713ec] shadow-sm"
                      : "bg-white border border-gray-200 hover:border-[#3713ec]/50"
                  )}
                >
                  <div className={selectedSize === 'original' ? "w-10 h-10 rounded-lg bg-[#3713ec]/10 border-2 border-[#3713ec]/20 flex items-center justify-center mb-1" : "w-10 h-10 rounded-lg bg-slate-50 border-2 border-gray-200 flex items-center justify-center mb-1"}>
                    <span className="material-symbols-outlined text-xl" style={{ 
                      color: selectedSize === 'original' ? '#3713ec' : '#64748B',
                      fontVariationSettings: "'FILL' 0, 'wght' 300"
                    }}>
                      crop_free
                    </span>
                  </div>
                  <p className={selectedSize === 'original' ? "text-xs font-bold text-[#3713ec]" : "text-xs font-medium text-gray-500"}>
                    保持原尺寸
                  </p>
                  <p className={selectedSize === 'original' ? "text-[10px] font-medium text-[#3713ec]/70" : "text-[10px] text-gray-500"}>
                    {imageDimensions ? `${imageDimensions.width} x ${imageDimensions.height}` : '344 x 456'}
                  </p>
                </div>

                <div 
                  onClick={() => handleSizeClick('2x')}
                  className={clsx(
                    "aspect-square rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all",
                    selectedSize === '2x'
                      ? "bg-white border-2 border-[#3713ec] shadow-sm"
                      : "bg-white border border-gray-200 hover:border-[#3713ec]/50"
                  )}
                >
                  <div className={selectedSize === '2x' ? "w-10 h-10 rounded-lg bg-[#3713ec]/10 border-2 border-[#3713ec]/20 flex items-center justify-center mb-1 relative" : "w-10 h-10 rounded-lg bg-slate-50 border-2 border-gray-200 flex items-center justify-center mb-1 relative"}>
                    <span className="material-symbols-outlined text-xl" style={{ 
                      color: selectedSize === '2x' ? '#3713ec' : '#64748B',
                      fontVariationSettings: "'FILL' 0, 'wght' 300"
                    }}>
                      open_in_full
                    </span>
                    <span className="text-[8px] font-bold bg-white absolute translate-x-3 translate-y-3 rounded-md px-1 py-0.5 border border-gray-200" style={{ color: selectedSize === '2x' ? '#3713ec' : '#64748B' }}>
                      2x
                    </span>
                  </div>
                  <p className={selectedSize === '2x' ? "text-xs font-bold text-[#3713ec]" : "text-xs font-medium text-gray-500"}>放大2倍</p>
                  <p className={selectedSize === '2x' ? "text-[10px] font-medium text-[#3713ec]/70" : "text-[10px] text-gray-500"}>
                    {imageDimensions ? `${imageDimensions.width * 2} x ${imageDimensions.height * 2}` : '688 x 912'}
                  </p>
                </div>

                <div 
                  onClick={() => handleSizeClick('4x')}
                  className={clsx(
                    "aspect-square rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all",
                    selectedSize === '4x'
                      ? "bg-white border-2 border-[#3713ec] shadow-sm"
                      : "bg-white border border-gray-200 hover:border-[#3713ec]/50"
                  )}
                >
                  <div className={selectedSize === '4x' ? "w-10 h-10 rounded-lg bg-[#3713ec]/10 border-2 border-[#3713ec]/20 flex items-center justify-center mb-1 relative" : "w-10 h-10 rounded-lg bg-slate-50 border-2 border-gray-200 flex items-center justify-center mb-1 relative"}>
                    <span className="material-symbols-outlined text-xl" style={{ 
                      color: selectedSize === '4x' ? '#3713ec' : '#64748B',
                      fontVariationSettings: "'FILL' 0, 'wght' 300"
                    }}>
                      open_in_full
                    </span>
                    <span className="text-[8px] font-bold bg-white absolute translate-x-3 translate-y-3 rounded-md px-1 py-0.5 border border-gray-200" style={{ color: selectedSize === '4x' ? '#3713ec' : '#64748B' }}>
                      4x
                    </span>
                  </div>
                  <p className={selectedSize === '4x' ? "text-xs font-bold text-[#3713ec]" : "text-xs font-medium text-gray-500"}>放大4倍</p>
                  <p className={selectedSize === '4x' ? "text-[10px] font-medium text-[#3713ec]/70" : "text-[10px] text-gray-500"}>
                    {imageDimensions ? `${imageDimensions.width * 4} x ${imageDimensions.height * 4}` : '1376 x 1824'}
                  </p>
                </div>
              </div>
            </div>

            <div className={clsx(
              "bg-white rounded-xl p-4 transition-all",
              selectedSize === 'custom'
                ? "border-2 border-[#3713ec] shadow-sm"
                : "border border-gray-200"
            )}>
              <h3 className="text-sm font-bold text-gray-900 mb-3">自定义尺寸</h3>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value && isNaN(Number(value))) {
                        setCustomWidth('');
                      } else {
                        setCustomWidth(value);
                      }
                      setSelectedSize('custom');
                    }}
                    placeholder="344"
                    className="w-full bg-slate-50 border border-transparent hover:border-gray-200 rounded-xl py-2 px-3 text-center text-sm font-medium focus:ring-2 focus:ring-[#3713ec]/20 focus:border-[#3713ec] outline-none transition-all placeholder:text-gray-400 shadow-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">px</span>
                </div>
                <span className="text-gray-500 text-sm font-medium">×</span>
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value && isNaN(Number(value))) {
                        setCustomHeight('');
                      } else {
                        setCustomHeight(value);
                      }
                      setSelectedSize('custom');
                    }}
                    placeholder="456"
                    className="w-full bg-slate-50 border border-transparent hover:border-gray-200 rounded-xl py-2 px-3 text-center text-sm font-medium focus:ring-2 focus:ring-[#3713ec]/20 focus:border-[#3713ec] outline-none transition-all placeholder:text-gray-400 shadow-sm pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">px</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark leading-relaxed">
                说明：选择放大倍数后，在图片变清晰的同时会扩大图片尺寸，最大尺寸为4096X4096
              </p>
            </div>
          </section>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 relative">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full text-white text-base font-semibold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-transform active:scale-[0.98]"
          style={{ backgroundColor: '#3713ec' }}
        >
          {isGenerating ? '生成中...' : '立即生成'}
          {!isGenerating && (
            <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-sm font-normal">
              30
              <span className="text-base">🪙</span>
            </span>
          )}
        </button>
        {showValidationOverlay && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[200] animate-in fade-in duration-200">
            <div className="bg-white rounded-xl px-6 py-4 shadow-2xl animate-in zoom-in duration-200 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                error
              </span>
              <span className="text-sm font-medium text-gray-900">{validationMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
