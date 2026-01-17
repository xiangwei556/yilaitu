import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { ColorPicker } from '../../../components/ColorPicker';

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

export const LeftPanel: React.FC<LeftPanelProps> = ({ isGenerating, setIsGenerating, showGenerateSuccess, setShowGenerateSuccess, onResetRef, onGeneratedData, onLoadFromRecord, onLoadFromRecordRef, refreshImageRecordsRef }) => {
  const [activeTab, setActiveTab] = useState<'color' | 'pattern'>('color');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>('custom');
  const [customColor, setCustomColor] = useState<string>('#3713ec');
  const [hasCustomColorSelected, setHasCustomColorSelected] = useState<boolean>(false);
  const colorPopoverRef = useRef<HTMLDivElement>(null);

  const [showColorModal, setShowColorModal] = useState(false);

  const [uploadedClothingImage, setUploadedClothingImage] = useState<string | null>(null);
  const [uploadedPatternClothingImage, setUploadedPatternClothingImage] = useState<string | null>(null);
  const [uploadedFabricPatternImage, setUploadedFabricPatternImage] = useState<string | null>(null);

  const [selectedColorArea, setSelectedColorArea] = useState<string>('上装');
  const [selectedPatternArea, setSelectedPatternArea] = useState<string>('上装');

  const [colorAreaInputValue, setColorAreaInputValue] = useState<string>('');
  const [patternAreaInputValue, setPatternAreaInputValue] = useState<string>('');

  const [colorAreaInputDisabled, setColorAreaInputDisabled] = useState<boolean>(false);
  const [patternAreaInputDisabled, setPatternAreaInputDisabled] = useState<boolean>(false);

  const [showValidationOverlay, setShowValidationOverlay] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string>('');

  const clothingFileInputRef = useRef<HTMLInputElement>(null);
  const patternClothingFileInputRef = useRef<HTMLInputElement>(null);
  const fabricPatternFileInputRef = useRef<HTMLInputElement>(null);

  const handleClothingFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedClothingImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePatternClothingFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedPatternClothingImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFabricPatternFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedFabricPatternImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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

  const originalPresetColors = presetColors.slice(0, 7);
  const [currentPresetColors, setCurrentPresetColors] = useState(presetColors.slice(0, 7));

  const handleColorPickerSelect = (color: string) => {
    setCustomColor(color);
    setSelectedColor('custom');
    setHasCustomColorSelected(true);
  };

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

  const handleGenerate = async () => {
    if (activeTab === 'color') {
      if (!uploadedClothingImage) {
        setValidationMessage('请先上传服装图片');
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
      console.log('当前标签:', activeTab === 'color' ? '换颜色' : '换图案');
      console.log('上传的服装图片:', uploadedClothingImage);
      console.log('选中的换色区域:', selectedColorArea);
      console.log('选中的颜色:', {
        id: selectedColorObj.id,
        name: selectedColorObj.name,
        color: selectedColorObj.color
      });
      console.log('====================');
    } else {
      if (!uploadedPatternClothingImage) {
        setValidationMessage('请先上传服装图片');
        setShowValidationOverlay(true);

        setTimeout(() => {
          setShowValidationOverlay(false);
        }, 2000);

        return;
      }

      if (!uploadedFabricPatternImage) {
        setValidationMessage('请先上传面料图案');
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
      console.log('当前标签:', activeTab );


      console.log('上传的服装图片:', uploadedPatternClothingImage);
      console.log('上传的面料图案:', uploadedFabricPatternImage);
      console.log('选中的换图案区域:', selectedPatternArea);
      console.log('选中的颜色:', {
        id: selectedColorObj.id,
        name: selectedColorObj.name,
        color: selectedColorObj.color
      });
       console.log('选择换色区域里的文本框内容：', colorAreaInputValue);
       console.log('选择换图案区域里的文本框内容:', patternAreaInputValue);
      console.log('====================');
    }

    setIsGenerating(true);

    const generationParams = {
      activeTab,
      uploadedClothingImage: activeTab === 'color' ? uploadedClothingImage : uploadedPatternClothingImage,
      uploadedFabricPatternImage,
      selectedColorArea,
      selectedPatternArea,
      selectedColor,
      customColor
    };

    setTimeout(() => {
      const mockImages = Array.from({ length: 1 }, (_, i) => 
        `https://via.placeholder.com/512?text=Clothing+${i + 1}`
      );
      const mockTaskId = Date.now().toString();
      
      onGeneratedData(mockImages, mockTaskId, generationParams);
      setIsGenerating(false);
      setShowGenerateSuccess(true);
    }, 2000);
  };

  return (
    <div className="relative w-[380px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <style>{`
        :root {
          --background-light: #F8FAFC;
          --background-dark: #111827;
          --surface-light: #FFFFFF;
          --surface-dark: #1F2937;
          --text-primary-light: #0F172A;
          --text-primary-dark: #F8FAFC;
          --text-secondary-light: #64748B;
          --text-secondary-dark: #94A3B8;
          --border-light: #E2E8F0;
          --border-dark: #334155;
        }
        .bg-surface-light {
          background-color: var(--surface-light) !important;
        }
        .dark .bg-surface-dark {
          background-color: var(--surface-dark) !important;
        }
        .bg-surface-dark {
          background-color: var(--surface-dark) !important;
        }
        .text-text-primary-light {
          color: var(--text-primary-light) !important;
        }
        .dark .text-text-primary-dark {
          color: var(--text-primary-dark) !important;
        }
        .text-text-secondary-light {
          color: var(--text-secondary-light) !important;
        }
        .dark .text-text-secondary-dark {
          color: var(--text-secondary-dark) !important;
        }
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
          <h1 className="text-lg font-semibold">服装换色</h1>
        </div>
        <div className="mt-4 flex">
          <div className="bg-slate-100 dark:bg-gray-800 p-1 rounded-full flex text-sm w-full">
            <button 
              onClick={() => setActiveTab('color')}
              className={`flex-1 text-center py-1.5 rounded-full transition-all ${activeTab === 'color' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 font-medium shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
            >
              换颜色
            </button>
            <button 
              onClick={() => setActiveTab('pattern')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full transition-all ${activeTab === 'pattern' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 font-medium shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
            >
              换图案
              <span className="material-symbols-outlined text-amber-500 text-[18px]">diamond</span>
            </button>
          </div>
        </div>
      </header>
      <main className="px-4 py-6 space-y-6 pb-[30px] overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'color' ? (
            <>
              <div className="space-y-4">
                <div>
                  <input
                    ref={clothingFileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif"
                    onChange={handleClothingFileUpload}
                    className="hidden"
                  />
                  {!uploadedClothingImage ? (
                    <div
                      onClick={() => clothingFileInputRef.current?.click()}
                      className="bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/30 dark:border-primary/50 rounded-xl p-6 text-center flex flex-col items-center justify-center h-48 cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
                    >
                      <div className="flex justify-center mb-3">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-3xl text-primary" style={{fontVariationSettings: "'FILL' 0"}}>checkroom</span>
                        </div>
                      </div>
                      <p className="font-medium text-text-primary-light dark:text-text-primary-dark">上传服装图</p>
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">点击/拖拽图片至此处</p>
                    </div>
                  ) : (
                    <div className="bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/30 dark:border-primary/50 rounded-xl p-3 flex items-center h-48 gap-4">
                      <div className="h-full aspect-[3/4] relative rounded-lg overflow-hidden bg-white border border-black/5 flex-shrink-0">
                        <img src={uploadedClothingImage} alt="Uploaded clothing" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex justify-center items-center">
                        <button
                          onClick={() => clothingFileInputRef.current?.click()}
                          className="px-5 py-2.5 rounded-full bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 transition-colors"
                        >
                          重新上传
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <section className="space-y-4">
                <h2 className="text-base font-semibold">选择换色区域</h2>
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <button 
                      onClick={() => {
                        setSelectedColorArea('上装');
                        if (colorAreaInputValue) {
                          setColorAreaInputDisabled(true);
                        }
                      }}
                      className={`py-2.5 rounded-full font-medium transition-all truncate ${selectedColorArea === '上装' ? 'border border-primary text-primary bg-primary/10 dark:bg-primary/20' : 'bg-slate-100 text-text-secondary-light hover:bg-slate-200 dark:bg-surface-dark dark:text-text-secondary-dark dark:hover:bg-surface-light/10'}`}
                    >
                      上装
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedColorArea('下装');
                        if (colorAreaInputValue) {
                          setColorAreaInputDisabled(true);
                        }
                      }}
                      className={`py-2.5 rounded-full font-medium transition-all truncate ${selectedColorArea === '下装' ? 'border border-primary text-primary bg-primary/10 dark:bg-primary/20' : 'bg-slate-100 text-text-secondary-light hover:bg-slate-200 dark:bg-surface-dark dark:text-text-secondary-dark dark:hover:bg-surface-light/10'}`}
                    >
                      下装
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedColorArea('内衣');
                        if (colorAreaInputValue) {
                          setColorAreaInputDisabled(true);
                        }
                      }}
                      className={`py-2.5 rounded-full font-medium transition-all truncate ${selectedColorArea === '内衣' ? 'border border-primary text-primary bg-primary/10 dark:bg-primary/20' : 'bg-slate-100 text-text-secondary-light hover:bg-slate-200 dark:bg-surface-dark dark:text-text-secondary-dark dark:hover:bg-surface-light/10'}`}
                    >
                      内衣
                    </button>
                  </div>
                  <input 
                    value={colorAreaInputValue}
                    onChange={(e) => {
                      setColorAreaInputValue(e.target.value);
                      setSelectedColorArea('');
                      setColorAreaInputDisabled(false);
                    }}
                    onFocus={() => setColorAreaInputDisabled(false)}
                    onBlur={() => {
                      if (colorAreaInputValue) {
                        setSelectedColorArea('');
                      }
                    }}
                    className={`w-full py-2.5 px-4 text-left rounded-full bg-slate-100 dark:bg-surface-dark font-medium border-0 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white dark:focus:bg-surface-dark placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark text-sm transition-all truncate ${colorAreaInputDisabled ? 'text-text-secondary-light dark:text-text-secondary-dark' : 'text-text-primary-light dark:text-text-primary-dark'}`} 
                    placeholder="输入想换色的区域，比如袖子" 
                    type="text"
                  />
                </div>
              </section>
              <section className="space-y-4">
                <h2 className="text-base font-semibold">选择目标颜色</h2>
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
                        <p className="text-white text-xs font-medium text-center truncate">指定颜色</p>
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
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <input
                    ref={patternClothingFileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif"
                    onChange={handlePatternClothingFileUpload}
                    className="hidden"
                  />
                  {!uploadedPatternClothingImage ? (
                    <div
                      onClick={() => patternClothingFileInputRef.current?.click()}
                      className="bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/30 dark:border-primary/50 rounded-xl p-6 text-center flex flex-col items-center justify-center h-48 cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
                    >
                      <div className="flex justify-center mb-3">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-3xl text-primary" style={{fontVariationSettings: "'FILL' 0"}}>checkroom</span>
                        </div>
                      </div>
                      <p className="font-medium text-text-primary-light dark:text-text-primary-dark">上传服装图</p>
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">点击/拖拽图片至此处</p>
                    </div>
                  ) : (
                    <div className="bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/30 dark:border-primary/50 rounded-xl p-3 flex items-center h-48 gap-4">
                      <div className="h-full aspect-[3/4] relative rounded-lg overflow-hidden bg-white border border-black/5 flex-shrink-0">
                        <img src={uploadedPatternClothingImage} alt="Uploaded clothing" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex justify-center items-center">
                        <button
                          onClick={() => patternClothingFileInputRef.current?.click()}
                          className="px-5 py-2.5 rounded-full bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 transition-colors"
                        >
                          重新上传
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <section className="space-y-4">
                <h2 className="text-base font-semibold">选择换图案区域</h2>
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <button 
                      onClick={() => {
                        setSelectedPatternArea('上装');
                        if (patternAreaInputValue) {
                          setPatternAreaInputDisabled(true);
                        }
                      }}
                      className={`py-2.5 rounded-full font-medium transition-all truncate ${selectedPatternArea === '上装' ? 'border border-primary text-primary bg-primary/10 dark:bg-primary/20' : 'bg-slate-100 text-text-secondary-light hover:bg-slate-200 dark:bg-surface-dark dark:text-text-secondary-dark dark:hover:bg-surface-light/10'}`}
                    >
                      上装
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedPatternArea('下装');
                        if (patternAreaInputValue) {
                          setPatternAreaInputDisabled(true);
                        }
                      }}
                      className={`py-2.5 rounded-full font-medium transition-all truncate ${selectedPatternArea === '下装' ? 'border border-primary text-primary bg-primary/10 dark:bg-primary/20' : 'bg-slate-100 text-text-secondary-light hover:bg-slate-200 dark:bg-surface-dark dark:text-text-secondary-dark dark:hover:bg-surface-light/10'}`}
                    >
                      下装
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedPatternArea('内衣');
                        if (patternAreaInputValue) {
                          setPatternAreaInputDisabled(true);
                        }
                      }}
                      className={`py-2.5 rounded-full font-medium transition-all truncate ${selectedPatternArea === '内衣' ? 'border border-primary text-primary bg-primary/10 dark:bg-primary/20' : 'bg-slate-100 text-text-secondary-light hover:bg-slate-200 dark:bg-surface-dark dark:text-text-secondary-dark dark:hover:bg-surface-light/10'}`}
                    >
                      内衣
                    </button>
                  </div>
                  <input 
                    value={patternAreaInputValue}
                    onChange={(e) => {
                      setPatternAreaInputValue(e.target.value);
                      setSelectedPatternArea('');
                      setPatternAreaInputDisabled(false);
                    }}
                    onFocus={() => setPatternAreaInputDisabled(false)}
                    onBlur={() => {
                      if (patternAreaInputValue) {
                        setSelectedPatternArea('');
                      }
                    }}
                    className={`w-full py-2.5 px-4 text-left rounded-full bg-slate-100 dark:bg-surface-dark font-medium border-0 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white dark:focus:bg-surface-dark placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark text-sm transition-all truncate ${patternAreaInputDisabled ? 'text-text-secondary-light dark:text-text-secondary-dark' : 'text-text-primary-light dark:text-text-primary-dark'}`} 
                    placeholder="输入想换图案的区域，比如袖子" 
                    type="text"
                  />
                </div>
              </section>
              <section className="space-y-4">
                <h2 className="text-base font-semibold">上传面料图案</h2>
                <div>
                  <input
                    ref={fabricPatternFileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif"
                    onChange={handleFabricPatternFileUpload}
                    className="hidden"
                  />
                  {!uploadedFabricPatternImage ? (
                    <div
                      onClick={() => fabricPatternFileInputRef.current?.click()}
                      className="bg-slate-50 dark:bg-surface-dark/50 border border-dashed border-border-light dark:border-border-dark rounded-xl p-6 text-center flex flex-col items-center justify-center h-48 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                    >
                      <div className="flex justify-center mb-3">
                        <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-surface-dark flex items-center justify-center">
                          <span className="material-symbols-outlined text-3xl text-text-secondary-light dark:text-text-secondary-dark" style={{fontVariationSettings: "'FILL' 0"}}>texture</span>
                        </div>
                      </div>
                      <p className="font-medium text-text-primary-light dark:text-text-primary-dark">上传面料图案</p>
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">点击/拖拽图片至此处</p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-surface-dark/50 border border-dashed border-border-light dark:border-border-dark rounded-xl p-3 flex items-center h-48 gap-4">
                      <div className="h-full aspect-square relative rounded-lg overflow-hidden bg-white border border-black/5 flex-shrink-0">
                        <img src={uploadedFabricPatternImage} alt="Uploaded fabric pattern" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex justify-center items-center">
                        <button
                          onClick={() => fabricPatternFileInputRef.current?.click()}
                          className="px-5 py-2.5 rounded-full bg-slate-200 dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark font-medium text-sm hover:bg-slate-300 dark:hover:bg-surface-light/20 transition-colors"
                        >
                          重新上传
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
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

      <footer className="sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full text-white text-base font-semibold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
          style={{ backgroundColor: '#3713ec' }}
        >
          立即生成
          <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-sm font-normal">
            30
            <img src="/yidou.svg" alt="icon" className="w-4 h-4" />
          </span>
        </button>
        <div className="mt-3 text-center">
          <p className="text-[10px] text-gray-400">
            使用即表示您已阅读并同意 <a href="#" className="text-indigo-600 hover:underline">《衣来图AI服务协议》</a>
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
