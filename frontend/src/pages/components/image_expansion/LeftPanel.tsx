import React, { useState, useRef } from 'react';
import { ImagePlus, Coins, X } from 'lucide-react';
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
  const [selectedRatio, setSelectedRatio] = useState<string>('1:1');
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
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRatioClick = (ratio: string) => {
    setSelectedRatio(ratio);
    setCustomWidth('');
    setCustomHeight('');
  };

  const handleCustomWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setCustomWidth(value);
      setSelectedRatio('');
    }
  };

  const handleCustomHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setCustomHeight(value);
      setSelectedRatio('');
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

    if (customWidth || customHeight) {
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
    console.log('原图尺寸:', imageDimensions);
    console.log('选择的比例:', selectedRatio);
    if (customWidth && customHeight) {
      console.log('自定义尺寸:', `${customWidth} x ${customHeight}`);
    }
    console.log('====================');

    setIsGenerating(true);

    const generationParams = {
      uploaded_image: uploadedImage,
      ratio: selectedRatio,
      custom_width: customWidth,
      custom_height: customHeight,
      original_dimensions: imageDimensions
    };

    setTimeout(() => {
      const mockImages = [`https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=image%20expansion&image_size=portrait_3_4`];
      const mockTaskId = Date.now().toString();
      onGeneratedData(mockImages, mockTaskId, generationParams);
      setIsGenerating(false);
      setShowGenerateSuccess(true);
    }, 2000);
  };

  const handleReset = () => {
    setUploadedImage('');
    setSelectedRatio('1:1');
    setCustomWidth('');
    setCustomHeight('');
    setImageDimensions(null);
  };

  React.useImperativeHandle(onResetRef, () => handleReset);

  const ratios = [
    { value: '1:1', icon: 'crop_square' },
    { value: '3:2', icon: 'crop_3_2' },
    { value: '2:3', icon: 'crop_3_2', rotate: true },
    { value: '4:3', icon: 'crop_5_4' },
    { value: '3:4', icon: 'crop_5_4', rotate: true },
    { value: '16:9', icon: 'crop_16_9' },
    { value: '9:16', icon: 'crop_16_9', rotate: true }
  ];

  return (
    <div className="relative flex flex-col h-full bg-white w-[400px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h1 className="text-lg font-semibold">无损扩图</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
        <div className="space-y-2">
          <div 
            onClick={handleUploadClick}
            className={clsx(
              "rounded-xl p-4 text-center flex flex-col items-center justify-center h-40 transition-colors cursor-pointer",
              uploadedImage 
                ? "bg-[#3713ec]/5 border border-dashed border-[#3713ec]/30" 
                : "bg-[#3713ec]/5 border-2 border-dashed border-[#3713ec]/30 hover:bg-[#3713ec]/10 hover:border-[#3713ec]/50"
            )}
          >
            {!uploadedImage ? (
              <>
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 rounded-full bg-[#3713ec]/10 flex items-center justify-center">
                    <ImagePlus className="w-6 h-6 text-[#3713ec]" />
                  </div>
                </div>
                <p className="font-medium text-gray-900 text-sm">上传图片</p>
                <p className="text-[10px] text-gray-500 mt-0.5">点击/拖拽图片至此处</p>
              </>
            ) : (
              <div className="flex items-center gap-4 w-full h-full">
                <div className="h-full aspect-[3/4] relative rounded-lg overflow-hidden bg-white border border-black/5 flex-shrink-0">
                  <img src={uploadedImage} alt="上传的图片" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex justify-center items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-5 py-2.5 rounded-full bg-[#3713ec]/10 text-[#3713ec] font-medium text-sm hover:bg-[#3713ec]/20 transition-colors"
                  >
                    重新上传
                  </button>
                </div>
              </div>
            )}
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          {imageDimensions && (
            <div className="flex justify-center">
              <p className="text-xs text-gray-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
                原图尺寸：{imageDimensions.width} x {imageDimensions.height}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2.5">选择比例</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {ratios.map((ratio) => (
                <div
                  key={ratio.value}
                  onClick={() => handleRatioClick(ratio.value)}
                  className={clsx(
                    "aspect-square rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all",
                    selectedRatio === ratio.value
                      ? "bg-white border-2 border-[#3713ec] shadow-sm"
                      : "bg-white border border-gray-200 hover:border-[#3713ec]/50"
                  )}
                >
                  <span 
                    className={clsx(
                      "material-symbols-outlined text-2xl",
                      selectedRatio === ratio.value ? "text-[#3713ec]" : "text-gray-500",
                      ratio.rotate ? "rotate-90" : ""
                    )}
                    style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                  >
                    {ratio.icon}
                  </span>
                  <span className={clsx(
                    "text-xs",
                    selectedRatio === ratio.value ? "font-bold text-[#3713ec]" : "font-medium text-gray-500"
                  )}>
                    {ratio.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className={clsx(
              "bg-white rounded-xl p-4 border transition-all",
              (customWidth || customHeight) ? "border-2 border-[#3713ec] shadow-sm" : "border-gray-200"
            )}>
              <h3 className="text-sm font-bold text-gray-900 mb-3">自定义尺寸</h3>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input 
                    className="w-full bg-slate-50 border border-transparent hover:border-gray-200 rounded-xl py-2 px-3 text-center text-sm font-medium focus:ring-2 focus:ring-[#3713ec]/20 focus:border-[#3713ec] outline-none transition-all placeholder:text-gray-400 shadow-sm pr-8"
                    placeholder="344"
                    type="number"
                    value={customWidth}
                    onChange={handleCustomWidthChange}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">px</span>
                </div>
                <span className="text-gray-500 text-sm font-medium">×</span>
                <div className="relative flex-1">
                  <input 
                    className="w-full bg-slate-50 border border-transparent hover:border-gray-200 rounded-xl py-2 px-3 text-center text-sm font-medium focus:ring-2 focus:ring-[#3713ec]/20 focus:border-[#3713ec] outline-none transition-all placeholder:text-gray-400 shadow-sm pr-8"
                    placeholder="456"
                    type="number"
                    value={customHeight}
                    onChange={handleCustomHeightChange}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">px</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-5 border-t border-gray-100">
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full text-white text-base font-semibold py-3 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-[#3713ec]/30 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#3713ec' }}
        >
          {isGenerating ? '生成中...' : '立即生成'}
          <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-xs font-normal">
            30
            <Coins className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>

      {showValidationOverlay && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[200] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl px-6 py-4 shadow-2xl animate-in zoom-in duration-200 flex items-center gap-3">
            <X className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-gray-800 font-medium text-base">{validationMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};
