import React, { useState, useRef } from 'react';

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
  const [selectedBackground, setSelectedBackground] = useState<string>('1');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setSelectedBackground('1');
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

              <div 
                onClick={() => handleBackgroundClick('1')}
                className={selectedBackground === '1' ? "aspect-[3/4] rounded-xl border-2 border-primary relative cursor-pointer group overflow-hidden transition-all" : "aspect-[3/4] rounded-xl bg-slate-100 dark:bg-surface-dark border border-transparent hover:border-border-dark dark:hover:border-border-light relative cursor-pointer group overflow-hidden transition-all"}
              >
                <img alt="纯色背景" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQQVXbRbdDu_UJoN68aE7H8BtftZHTJ_IaM-pUAkbyeE9sdPJxZ-_efrgDXwiVm1bpd_zvsq8EMdUWoBZeDF7eSKu9KKHAFNdV1KEJZWS_QX6RMSLyW0aNs3-8OXMMAmVCqJgoUYngzl8G00uVLvRTnTMVqblbRO73ntCxs91z-nOjBSsnjBnbF5I0ZdyyrH88zOiagVh0Klqnhci-xHRl1N4SRkKEQd1ODzM7fTp-8UR6uNCjSGoTQJAlK6gfyFPa8Lm6a_p_Nso"/>
                <div className="absolute inset-0 bg-black/10 flex items-end justify-center pb-2">
                  <span className="text-xs font-medium text-white shadow-sm">纯白影棚</span>
                </div>
                <div className="absolute top-2 right-2 z-10 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-surface-dark">
                  1
                </div>
              </div>

              <div 
                onClick={() => handleBackgroundClick('2')}
                className={selectedBackground === '2' ? "aspect-[3/4] rounded-xl border-2 border-primary relative cursor-pointer group overflow-hidden transition-all" : "aspect-[3/4] rounded-xl bg-slate-100 dark:bg-surface-dark border border-transparent hover:border-border-dark dark:hover:border-border-light relative cursor-pointer group overflow-hidden transition-all"}
              >
                <img alt="都市街景" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAFZBvey8Tyn9RKPzWG1WBk8vZ-iVKm6OyqiU2k5MlFnc-VgRcDEnuIvp221RDHun8khmUhk5t1_EdEpwFJ6CsfCUonZytkWakcwQB8dUI_yV118PqFh7H1idMLwUnDcbVrScyqrO76HlsMRi9MVklNhvkNLmeyYIr6KsG_QmPGjGcIxntsssFUPts5rtvNBPMjAgojWPrvw5e1E-V6htw0ATuzka_D0w5smLACQQEMXsl4tMFbAlWWZYAxVApTvzBDAgFkMEHmGk"/>
                <div className="absolute inset-0 bg-black/10 flex items-end justify-center pb-2">
                  <span className="text-xs font-medium text-white shadow-sm">都市街头</span>
                </div>
                <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full border border-white/60 bg-black/20"></div>
              </div>

              <div 
                onClick={() => handleBackgroundClick('3')}
                className={selectedBackground === '3' ? "aspect-[3/4] rounded-xl border-2 border-primary relative cursor-pointer group overflow-hidden transition-all" : "aspect-[3/4] rounded-xl bg-slate-100 dark:bg-surface-dark border border-transparent hover:border-border-dark dark:hover:border-border-light relative cursor-pointer group overflow-hidden transition-all"}
              >
                <img alt="自然风光" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0NVpTaIFAi7-jTOw_xxN6mw3xToxsTpQryP272qoud9wgXsJO1tRsPGc9Q-hAnUe6Sl-5W7UXEQgAplVuRW4UUY86YALyXfpnHDGMMgSB1-DFdgm-puNQa1jvDS11870HnJlW6fgek6GZel8YwnffUszd60tISgMqLpEat9rvUDQMSCXsklx2YeaOPS3Ek8NfzTiSDytTo_U_565b30CnInL78vGvSzE8fBp1vyYNgosPUWE_ii235kO1IgTUcrM28RGpJbS8PEY"/>
                <div className="absolute inset-0 bg-black/10 flex items-end justify-center pb-2">
                  <span className="text-xs font-medium text-white shadow-sm">清新自然</span>
                </div>
                <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full border border-white/60 bg-black/20"></div>
              </div>

              <div 
                onClick={() => handleBackgroundClick('4')}
                className={selectedBackground === '4' ? "aspect-[3/4] rounded-xl border-2 border-primary relative cursor-pointer group overflow-hidden transition-all" : "aspect-[3/4] rounded-xl bg-slate-100 dark:bg-surface-dark border border-transparent hover:border-border-dark dark:hover:border-border-light relative cursor-pointer group overflow-hidden transition-all"}
              >
                <img alt="室内家居" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhmxlUnZEaDM6kZc8CEBJvsc_gQ42_wDa5PkfJrIGQD1c74k_orEWhu09FTESk9ZqqN7Y9XxXEHg_U_8QoXShvocOy13R8oetmgkMdlh68iVrjTw7Nim_YqmiB2VKef0eBfJzGcv2izBpupLVqpRombMYEPwJJLPIEd380XU_rN1l9iXlq_UzwxgBSf8Mz96sqOmcV3pZqJK5b-gLBCwP81yn9vfQTdhBUuNyq3vc1j6fe91-QwaRSDiSxMALRahY0oxm0QsGDKAQ"/>
                <div className="absolute inset-0 bg-black/10 flex items-end justify-center pb-2">
                  <span className="text-xs font-medium text-white shadow-sm">温馨家居</span>
                </div>
                <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full border border-white/60 bg-black/20"></div>
              </div>

              <div 
                onClick={() => handleBackgroundClick('5')}
                className={selectedBackground === '5' ? "aspect-[3/4] rounded-xl border-2 border-primary relative cursor-pointer group overflow-hidden transition-all" : "aspect-[3/4] rounded-xl bg-slate-100 dark:bg-surface-dark border border-transparent hover:border-border-dark dark:hover:border-border-light relative cursor-pointer group overflow-hidden transition-all"}
              >
                <img alt="海边度假" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjl2f8KIboaGVxC9mcsdebPSK5dbY3ezeZ2aPHO0bnyGQwXAjk44ASJfSd0eGXRvpGrZfrPkaatGmLNgcKpdQakvfNjkOoU8L6SY1GnSxJMjW1jqZ5gOwae5La84w-VAt-RLbB-ZrWo_YqUm2LqOe4UXEjRKl4PNx6uMkCt9NpaPEaI4SfOkTzOC2OAUUcZijdS3cnbFsa-JqkreXblsjjr5I6yIGUluhZGt_jHMorpPSutNPnKIJMV4BJvt6lqR6e2xkywOMJ5EQ"/>
                <div className="absolute inset-0 bg-black/10 flex items-end justify-center pb-2">
                  <span className="text-xs font-medium text-white shadow-sm">海边度假</span>
                </div>
                <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full border border-white/60 bg-black/20"></div>
              </div>
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
              <span className="text-base">🪙</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
