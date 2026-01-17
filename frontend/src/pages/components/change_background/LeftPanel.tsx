import React, { useState, useRef, useEffect } from 'react';
import { getPublicBackgrounds } from '../../../api/sysImages';

interface Background {
  id: number;
  name: string;
  image_url: string;
  status: string;
}

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
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<string>('smart');
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasMounted = useRef(false);

  // 获取背景图列表
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    const fetchBackgrounds = async () => {
      try {
        const res = await getPublicBackgrounds({ page: 1, page_size: 100 });
        console.log('背景图API返回:', res);
        if (res?.items) {
          setBackgrounds(res.items);
          // 如果有背景图，默认选中第一个
          if (res.items.length > 0) {
            setSelectedBackground(String(res.items[0].id));
          }
        }
      } catch (error) {
        console.error('获取背景图失败:', error);
      }
    };
    fetchBackgrounds();
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const readers = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(images => {
        setUploadedImages(images);
      });
    }
  };

  const handleBackgroundClick = (backgroundId: string) => {
    setSelectedBackground(backgroundId);
  };

  const handleGenerate = () => {
    if (uploadedImages.length === 0) {
      alert('请先上传模特图');
      return;
    }

    setIsGenerating(true);
    console.log('生成参数:', {
      uploaded_images: uploadedImages,
      selected_background: selectedBackground
    });

    setTimeout(() => {
      const mockImages = uploadedImages;
      const mockTaskId = Date.now().toString();
      onGeneratedData(mockImages, mockTaskId, {
        uploaded_images: uploadedImages,
        selected_background: selectedBackground
      });
      setIsGenerating(false);
    }, 2000);
  };

  const handleReset = () => {
    setUploadedImages([]);
    // 重置为智能背景或第一个背景图
    if (backgrounds.length > 0) {
      setSelectedBackground(String(backgrounds[0].id));
    } else {
      setSelectedBackground('smart');
    }
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
            <h1 className="text-lg font-semibold">换背景</h1>
       </div>
      </header>
      <div className="px-4 py-6 flex-1 overflow-y-auto">
        <div className="space-y-8">
          <div className="space-y-4">
            <div 
              onClick={handleUploadClick}
              className="bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/30 dark:border-primary/50 rounded-xl p-6 text-center flex flex-col items-center justify-center h-48 transition-colors hover:bg-primary/10 hover:border-primary/50 cursor-pointer"
            >
              {uploadedImages.length > 0 ? (
                <div className="flex gap-2 flex-wrap justify-center">
                  {uploadedImages.map((img, index) => (
                    <img key={index} src={img} alt={`Uploaded ${index + 1}`} className="max-h-20 max-w-20 object-contain" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex justify-center mb-3">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 0" }}>
                        add_photo_alternate
                      </span>
                    </div>
                  </div>
                  <p className="font-medium text-text-primary-light dark:text-text-primary-dark">上传模特图</p>
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">支持多张上传，点击/拖拽图片至此处</p>
                </>
              )}
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <section className="space-y-4">
            <h2 className="text-base font-semibold">选择更换的背景</h2>
            <div className="grid grid-cols-3 gap-3">
              {/* 智能背景 */}
              <div
                onClick={() => handleBackgroundClick('smart')}
                className={selectedBackground === 'smart' ? "aspect-[3/4] rounded-xl bg-slate-100 dark:bg-surface-dark border-2 border-primary relative cursor-pointer flex flex-col items-center justify-center group overflow-hidden transition-all" : "aspect-[3/4] rounded-xl bg-slate-100 dark:bg-surface-dark border border-transparent hover:border-border-dark dark:hover:border-border-light relative cursor-pointer flex flex-col items-center justify-center group overflow-hidden transition-all"}
              >
                <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full border border-text-secondary-light/30 bg-transparent"></div>
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-surface-light/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-text-secondary-light dark:text-text-secondary-dark text-2xl">auto_awesome</span>
                </div>
                <p className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">智能背景</p>
              </div>

              {/* 动态背景图列表 */}
              {backgrounds.map((bg, index) => (
                <div
                  key={bg.id}
                  onClick={() => handleBackgroundClick(String(bg.id))}
                  className={selectedBackground === String(bg.id) ? "aspect-[3/4] rounded-xl border-2 border-primary relative cursor-pointer group overflow-hidden transition-all" : "aspect-[3/4] rounded-xl bg-slate-100 dark:bg-surface-dark border border-transparent hover:border-border-dark dark:hover:border-border-light relative cursor-pointer group overflow-hidden transition-all"}
                >
                  <img alt={bg.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src={bg.image_url}/>
                  <div className="absolute inset-0 bg-black/10 flex items-end justify-center pb-2">
                    <span className="text-xs font-medium text-white shadow-sm">{bg.name}</span>
                  </div>
                  {selectedBackground === String(bg.id) ? (
                    <div className="absolute top-2 right-2 z-10 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-surface-dark">
                      {index + 1}
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full border border-white/60 bg-black/20"></div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || uploadedImages.length === 0}
          className="w-full text-white text-base font-semibold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-transform active:scale-[0.98]"
          style={{ backgroundColor: '#3713ec' }}
        >
          {isGenerating ? '生成中...' : '立即生成'}
          {!isGenerating && (
            <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-sm font-normal">
              20
              <img src="/yidou.svg" alt="icon" className="w-4 h-4" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
