import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { ColorPicker } from '../../../components/ColorPicker';
import { ColorModal } from '../../../components/ColorModal';

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
  const [imageType, setImageType] = useState<'flat' | '3d'>('flat');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('custom');
  const [customColor, setCustomColor] = useState<string>('#ffffff');
  const [hasCustomColorSelected, setHasCustomColorSelected] = useState<boolean>(false);
  const [ratio, setRatio] = useState<string>('1:1');
  const [quantity, setQuantity] = useState<number>(1);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorPopoverRef = useRef<HTMLDivElement>(null);

  const [showColorModal, setShowColorModal] = useState(false);
  const [showValidationOverlay, setShowValidationOverlay] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

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

  const originalPresetColors = presetColors.slice(0, 4);
  const [currentPresetColors, setCurrentPresetColors] = useState(presetColors.slice(0, 4));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'image/gif'].includes(file.type)) {
        alert('不支持的文件格式');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage) {
      setValidationMessage('请先上传服装饰图');
      setShowValidationOverlay(true);

      setTimeout(() => {
        setShowValidationOverlay(false);
      }, 2000);

      return;
    }

    const selectedColorObj = selectedColor === 'custom' 
      ? { id: 'custom', name: '自定义颜色', color: customColor }
      : presetColors.find(c => c.id === selectedColor) || { id: selectedColor, name: '未知颜色', color: customColor };

    console.log('=== 用户选择的内容 ===');
    console.log('图片类型:', imageType === 'flat' ? '平铺图' : '3D图');
    console.log('上传的图片:', uploadedImage);
    console.log('选中的颜色:', {
      id: selectedColorObj.id,
      name: selectedColorObj.name,
      color: selectedColorObj.color
    });
    console.log('图片比例:', ratio);
    console.log('生成数量:', quantity);
    console.log('====================');

    setIsGenerating(true);

    const generationParams = {
      imageType,
      uploadedImage,
      selectedColor,
      customColor,
      ratio,
      quantity
    };

    setTimeout(() => {
      const mockImages = Array.from({ length: quantity }, (_, i) => 
        `https://via.placeholder.com/512?text=Background+${i + 1}`
      );
      const mockTaskId = Date.now().toString();
      
      onGeneratedData(mockImages, mockTaskId, generationParams);
      setIsGenerating(false);
      setShowGenerateSuccess(true);
    }, 2000);
  };

  const handleReset = () => {
    setUploadedImage(null);
    setSelectedColor('custom');
    setHasCustomColorSelected(false);
    setRatio('1:1');
    setQuantity(1);
    setShowGenerateSuccess(false);
  };

  React.useEffect(() => {
    if (onResetRef) {
      onResetRef.current = handleReset;
    }
  }, [onResetRef]);

  React.useEffect(() => {
    if (onLoadFromRecordRef) {
      onLoadFromRecordRef.current = (record: any) => {
        const params = record.params;
        if (params) {
          setImageType(params.imageType || 'flat');
          setUploadedImage(params.uploadedImage || null);
          setSelectedColor(params.selectedColor || 'custom');
          setCustomColor(params.customColor || '#ffffff');
          setRatio(params.ratio || '1:1');
          setQuantity(params.quantity || 1);
        }
      };
    }
  }, [onLoadFromRecordRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPopoverRef.current && !colorPopoverRef.current.contains(event.target as Node)) {
        setShowColorModal(false);
      }
    };

    if (showColorModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorModal]);

  const handleColorSelect = (colorId: string, colorHex: string) => {
    setSelectedColor(colorId);
    setCustomColor(colorHex);
    setHasCustomColorSelected(false);

    const color = presetColors.find(c => c.id === colorId);
    if (!color) return;

    const isOriginalColor = originalPresetColors.find(c => c.id === colorId);

    if (isOriginalColor) {
      setCurrentPresetColors(originalPresetColors);
    } else {
      const newColors = [color, ...currentPresetColors.slice(1)];
      setCurrentPresetColors(newColors);
    }
  };

  const handleColorPickerSelect = (color: string) => {
    setCustomColor(color);
    setSelectedColor('custom');
    setHasCustomColorSelected(true);
  };

  return (
    <div className="relative w-[380px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.8);
        }
      `}</style>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center h-11">
          <div className="flex items-center gap-1">
            <h1 className="text-lg font-semibold">白底图生成</h1>
          </div>
          <button className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 px-2">
            <span className="material-symbols-outlined text-xl text-indigo-600">history</span>
            生图记录
          </button>
        </div>
      </header>
      <main className="px-4 py-6 space-y-6 pb-28 overflow-y-auto flex-1 custom-scrollbar">
        <div className="bg-slate-100 dark:bg-gray-800 p-1 rounded-full flex text-sm w-full">
          <button
            onClick={() => setImageType('flat')}
            className={`flex-1 text-center py-1.5 rounded-full transition-all ${
              imageType === 'flat'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 font-medium shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            平铺图
          </button>
          <button
            onClick={() => setImageType('3d')}
            className={`flex-1 text-center py-1.5 rounded-full transition-all ${
              imageType === '3d'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 font-medium shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            3D图
          </button>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif"
            onChange={handleFileUpload}
            className="hidden"
          />
          {!uploadedImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#3713ec]/5 border border-dashed border-[#3713ec]/30 rounded-xl p-6 text-center flex flex-col items-center justify-center h-40 cursor-pointer hover:bg-[#3713ec]/8 hover:border-[#3713ec]/50 transition-all duration-200"
            >
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-full bg-[#3713ec]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-[#3713ec]">add_photo_alternate</span>
                </div>
              </div>
              <p className="font-medium text-gray-800">上传服装饰图</p>
              <p className="text-xs text-gray-500 mt-1">点击/拖拽图片至此处</p>
            </div>
          ) : (
            <div className="bg-[#3713ec]/5 border border-dashed border-[#3713ec]/30 rounded-xl p-3 flex items-center h-40 gap-4">
              <div className="h-full aspect-[3/4] relative rounded-lg overflow-hidden bg-white border border-black/5 flex-shrink-0">
                <img src={uploadedImage} alt="Uploaded clothing" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex justify-center items-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-full bg-[#3713ec]/10 text-[#3713ec] font-medium text-sm hover:bg-[#3713ec]/20 transition-colors"
                >
                  重新上传
                </button>
              </div>
            </div>
          )}
        </div>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">选择背景颜色</h2>
          <div className="grid grid-cols-3 gap-3">
            <div
              onClick={() => setShowColorPicker(true)}
              className={`relative cursor-pointer transition-all ${
                selectedColor === 'custom' ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 rounded-lg' : ''
              } hover:ring-2 hover:ring-indigo-600 hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-gray-900 hover:rounded-lg`}
            >
              <div 
                className="w-full aspect-square rounded-lg flex items-center justify-center"
                style={hasCustomColorSelected ? { backgroundColor: customColor } : { background: 'linear-gradient(to bottom right, #818cf8, #c084fc, #f472b6)' }}
              >
                <span className="material-symbols-outlined text-white text-3xl drop-shadow-md">colorize</span>
              </div>
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-black/30 backdrop-blur-sm rounded-md px-2 py-1">
                  <p className="text-white text-xs font-medium text-center truncate">自定义颜色</p>
                </div>
              </div>
            </div>
            {currentPresetColors.map((color) => (
              <div
                key={color.id}
                onClick={() => handleColorSelect(color.id, color.color)}
                className={`relative cursor-pointer transition-all ${
                  selectedColor === color.id ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 rounded-lg' : ''
                } hover:ring-2 hover:ring-indigo-600 hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-gray-900 hover:rounded-lg`}
              >
                <div className="w-full aspect-square rounded-lg" style={{ backgroundColor: color.color }}></div>
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black/30 backdrop-blur-sm rounded-md px-2 py-1">
                    <p className="text-white text-xs font-medium text-center truncate">{color.name}</p>
                  </div>
                </div>
              </div>
            ))}
            <div 
              onClick={() => setShowColorModal(true)}
              className="w-full aspect-square bg-slate-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 text-sm font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
            >
              更多 &gt;
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">选择图片比例</h2>
          <div className="flex space-x-3 text-sm font-medium">
            <button
              onClick={() => setRatio('1:1')}
              className={`flex-1 py-2.5 rounded-full transition-all ${
                ratio === '1:1'
                  ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              1:1
            </button>
            <button
              onClick={() => setRatio('3:4')}
              className={`flex-1 py-2.5 rounded-full transition-all ${
                ratio === '3:4'
                  ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              3:4
            </button>
            <button
              onClick={() => setRatio('4:3')}
              className={`flex-1 py-2.5 rounded-full transition-all ${
                ratio === '4:3'
                  ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              4:3
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">选择图片数量</h2>
          <div className="flex space-x-3 text-sm font-medium">
            <button
              onClick={() => setQuantity(1)}
              className={`flex-1 py-2.5 rounded-full transition-all ${
                quantity === 1
                  ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              1
            </button>
            <button
              onClick={() => setQuantity(4)}
              className={`flex-1 py-2.5 rounded-full transition-all ${
                quantity === 4
                  ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              4
            </button>
            <button
              onClick={() => setQuantity(9)}
              className={`flex-1 py-2.5 rounded-full transition-all ${
                quantity === 9
                  ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              9
            </button>
          </div>
        </section>
      </main>

      {showColorPicker && (
        <ColorPicker
          isOpen={showColorPicker}
          onClose={() => setShowColorPicker(false)}
          initialColor={customColor}
          onColorSelect={handleColorPickerSelect}
        />
      )}

      {showColorModal && (
        <div 
          ref={colorPopoverRef}
          className="absolute left-[calc(100%+1px)] top-0 z-[100] flex animate-in fade-in slide-in-from-left-2 duration-200 items-start h-full"
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.color-modal-content') === null && target.closest('.color-modal-grid-item') === null) {
              setShowColorModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-[300px] h-full max-h-[calc(100vh-56px)] flex flex-col shadow-2xl relative z-10 border border-gray-100 overflow-hidden hover-scroll">
            <div className="flex items-center justify-between p-4 border-b border-gray-50">
              <h3 className="font-bold text-base text-gray-800">更多颜色</h3>
              <button onClick={() => setShowColorModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin-dark color-modal-content">
              <div className="grid grid-cols-3 gap-2">
                {presetColors.map((color) => (
                  <div
                    key={color.id}
                    id={`color-item-${color.id}`}
                    className="color-modal-grid-item aspect-square rounded-lg cursor-pointer transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: color.color,
                      border: selectedColor === color.id ? '2px solid #3713ec' : '1px solid rgba(0,0,0,0.1)'
                    }}
                    onClick={() => handleColorSelect(color.id, color.color)}
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
      )}

      <footer className="sticky bottom-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full text-white text-base font-semibold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
          style={{ backgroundColor: '#3713ec' }}
        >
          立即生成
          <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-sm font-normal">
            5
            <img src="/yidou.svg" alt="icon" className="w-4 h-4" />
          </span>
        </button>
        <div className="mt-3 text-center">
          <p className="text-[10px] text-gray-400">
            使用即表示您已阅读并同意 <a href="#" className="text-[#4C3BFF] hover:underline">《衣来图AI服务协议》</a>
          </p>
        </div>
      </footer>

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
