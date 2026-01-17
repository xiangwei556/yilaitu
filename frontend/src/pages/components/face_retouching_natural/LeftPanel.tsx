import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../../../stores/useAuthStore';
import { getMyModels, getSystemModels } from '../../../api/yilaitumodel';
import AddModelModal from '../AddModelModal';

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
  const { isLoggedIn, user, openAuthModal } = useAuthStore();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedModelTab, setSelectedModelTab] = useState<'my' | 'recommended'>('my');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [selectedModelIndex, setSelectedModelIndex] = useState<number | null>(null);
  const [showMoreModels, setShowMoreModels] = useState(false);
  const [showValidationOverlay, setShowValidationOverlay] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [addModelModalVisible, setAddModelModalVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasMounted = useRef(false);
  
  const [userMyModels, setUserMyModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [visibleMyModels, setVisibleMyModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [allMyModels, setAllMyModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [myModelsLoading, setMyModelsLoading] = useState(false);
  const [hasCalledMyModelsAPI, setHasCalledMyModelsAPI] = useState(false);
  const [myModelsPage, setMyModelsPage] = useState(1);
  
  const [systemModels, setSystemModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [visibleSystemModels, setVisibleSystemModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [allSystemModels, setAllSystemModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [systemModelsLoading, setSystemModelsLoading] = useState(false);
  const [hasCalledSystemModelsAPI, setHasCalledSystemModelsAPI] = useState(false);
  const [systemModelsPage, setSystemModelsPage] = useState(1);
  const [systemModelsCategory, setSystemModelsCategory] = useState('全部');
  
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [hoveredModelId, setHoveredModelId] = useState<number | null>(null);
  const [modalPreviewPos, setModalPreviewPos] = useState({ top: 0, arrowTop: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const modalGridRef = useRef<HTMLDivElement>(null);

  const categories = ['全部', '亚洲', '欧美', '儿童'];

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

  const fetchMyModels = async (page: number = 1, limit: number = 12) => {
    if (!isLoggedIn || !user) {
      return;
    }
    
    setMyModelsLoading(true);
    try {
      const skip = (page - 1) * limit;
      const response = await getMyModels({ skip, page_size: limit }) as any;
      
      const modelsWithId = response.items.map((model: any) => ({
        ...model,
        id: model.id
      }));
      
      if (page === 1) {
        setAllMyModels(modelsWithId);
        const displayCount = modelsWithId.length > 5 ? 4 : modelsWithId.length;
        setVisibleMyModels(modelsWithId.slice(0, displayCount));
        setUserMyModels(modelsWithId.slice(0, displayCount));
      } else {
        setAllMyModels(prev => {
          const existingIds = new Set(prev.map(model => model.id));
          const newUniqueModels = modelsWithId.filter(model => !existingIds.has(model.id));
          return [...prev, ...newUniqueModels];
        });
      }
    } catch (error) {
      console.error('Failed to fetch my models:', error);
    } finally {
      setMyModelsLoading(false);
      setHasCalledMyModelsAPI(true);
    }
  };

  const fetchSystemModels = async (page: number = 1, limit: number = 12, category: string = '全部') => {
    setSystemModelsLoading(true);
    try {
      const skip = (page - 1) * limit;
      const response = await getSystemModels({ skip, page_size: limit, category }) as any;
      
      const modelsWithId = response.items.map((model: any) => ({
        ...model,
        id: model.id
      }));
      
      if (page === 1) {
        setAllSystemModels(modelsWithId);
        setVisibleSystemModels(modelsWithId.slice(0, 5));
        setSystemModels(modelsWithId.slice(0, 5));
      } else {
        setAllSystemModels(prev => {
          const existingIds = new Set(prev.map(model => model.id));
          const newUniqueModels = modelsWithId.filter(model => !existingIds.has(model.id));
          return [...prev, ...newUniqueModels];
        });
      }
    } catch (error) {
      console.error('Failed to fetch system models:', error);
    } finally {
      setSystemModelsLoading(false);
      setHasCalledSystemModelsAPI(true);
    }
  };

  const handleModelSelect = (id: number) => {
    setSelectedModelIndex(id);
    
    if (selectedModelTab === 'my') {
      const model = allMyModels.find(m => m.id === id);
      if (model) {
        const isVisible = visibleMyModels.find(m => m.id === id);
        if (!isVisible) {
          const newVisibleModels = [model, ...visibleMyModels.slice(1)];
          setVisibleMyModels(newVisibleModels);
        }
      }
    } else {
      const model = allSystemModels.find(m => m.id === id);
      if (model) {
        const isVisible = visibleSystemModels.find(m => m.id === id);
        if (!isVisible) {
          const newVisibleModels = [model, ...visibleSystemModels.slice(1)];
          setVisibleSystemModels(newVisibleModels);
        }
      }
    }
  };

  useEffect(() => {
    if (onResetRef) {
      onResetRef.current = () => {
        setUploadedImage(null);
        setSelectedModelTab('my');
        setSelectedCategory('全部');
        setSelectedModelIndex(null);
        setShowMoreModels(false);
        setShowMoreModal(false);
        setHoveredModelId(null);
      };
    }

    if (onLoadFromRecordRef) {
      onLoadFromRecordRef.current = (record: any) => {
        if (record.params) {
          if (record.params.uploadedImage) {
            setUploadedImage(record.params.uploadedImage);
          }
          if (record.params.selectedModelTab) {
            setSelectedModelTab(record.params.selectedModelTab);
          }
          if (record.params.selectedCategory) {
            setSelectedCategory(record.params.selectedCategory);
          }
          if (record.params.selectedModelIndex !== undefined) {
            setSelectedModelIndex(record.params.selectedModelIndex);
          }
        }
      };
    }
  }, [onResetRef, onLoadFromRecordRef]);

  useEffect(() => {
    if (isLoggedIn && user && !hasMounted.current) {
      fetchMyModels();
      hasMounted.current = true;
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (hasCalledMyModelsAPI && allMyModels.length === 0) {
      setSelectedModelTab('recommended');
    }
  }, [hasCalledMyModelsAPI, allMyModels.length]);

  useEffect(() => {
    if (selectedModelTab === 'recommended' && !hasCalledSystemModelsAPI) {
      fetchSystemModels(1, 12, selectedCategory);
    }
  }, [selectedModelTab, selectedCategory, hasCalledSystemModelsAPI]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAddModelClick = () => {
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }
    setAddModelModalVisible(true);
  };

  const handleModelAdded = () => {
    setAddModelModalVisible(false);
    fetchMyModels(1, 12);
  };

  const handleGenerate = async () => {
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }

    if (!uploadedImage) {
      setValidationMessage('请先上传原模特图');
      setShowValidationOverlay(true);
      setTimeout(() => setShowValidationOverlay(false), 2000);
      return;
    }

    if (selectedModelIndex === null) {
      setValidationMessage('请选择模特人像');
      setShowValidationOverlay(true);
      setTimeout(() => setShowValidationOverlay(false), 2000);
      return;
    }

    setIsGenerating(true);

    const generationParams = {
      uploadedImage,
      selectedModelTab,
      selectedCategory,
      selectedModelIndex
    };

    console.log('=== 用户选择的内容 ===');
    console.log('上传的原模特图:', uploadedImage);
    console.log('模特人像标签:', selectedModelTab === 'my' ? '我的模特' : '推荐模特');
    console.log('选中的分类:', selectedCategory);
    console.log('选中的模特索引:', selectedModelIndex);
    console.log('====================');

    setTimeout(() => {
      const mockImages = [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBgC02uvA-SFtdm0VZyvZovSNJZLbfR3didVii5y_cuzyUZlaa376pDQgbJ6Mz0X2IUyISv5HSiwjcIoRQnDTR3VrQTxflsVvsQV1_E2PleBI76JPmL83FuOUAlPkODAKFBaDqVhiI2oV-0T26_usmymtrXihQjDHk0ZMafnR5ksq7r0rz3RFG96q--sNKSSWQUSq0BLhRGFGs-dmV6dDf3neRlua7QtyqkGQ-uaTEAxEt-hA1AQX-9F4D42Jwln2vxZaJ5IunwrqY',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuApngINhXFIY9DGF3zTYAIK6naakEsrXf_c1znAPnj7qVJ4gUCfQ2BNvDF96ueNz-HkEbpyciDNhQHG9-YP8jn5OCRMvcmXt6kPrAoVQ9i5OfUWZJrWx7uB9osU8-oBd9dLpPWEoVZpOSwoAtKRf-W1MmY33Ftlzl7FFSwCNUp2C0VCCKjyGC1xZIgpcCbRQ-XL96bIpVRu-NaoztOPLIkgZ6evKKFguXwkCNn3KqwW3WnDDJ7qzBpjGwM5wOqCC8noP8YLGXd2hMM'
      ];
      const taskId = Date.now().toString();
      onGeneratedData(mockImages, taskId, generationParams);
      setIsGenerating(false);
      setShowGenerateSuccess(true);
    }, 2000);
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
            <h1 className="text-lg font-semibold">模特换脸</h1>
          </div>
          <button className="flex items-center gap-1.5 text-sm text-text-secondary-light dark:text-text-secondary-dark px-2">
            <span className="material-symbols-outlined text-xl text-primary">history</span>
            生图记录
          </button>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 pb-28 overflow-y-auto flex-1 custom-scrollbar">
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
              className="bg-[#3713ec]/5 border border-dashed border-[#3713ec]/30 rounded-xl p-6 text-center flex flex-col items-center justify-center h-40 cursor-pointer hover:bg-[#3713ec]/8 hover:border-[#3713ec]/50 transition-all duration-200"
            >
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-full bg-[#3713ec]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-[#3713ec]">face</span>
                </div>
              </div>
              <p className="font-medium text-gray-800">上传原模特图</p>
              <p className="text-xs text-gray-500 mt-1">点击/拖拽图片至此处</p>
            </div>
          ) : (
            <div className="bg-[#3713ec]/5 border border-dashed border-[#3713ec]/30 rounded-xl p-3 flex items-center h-40 gap-4">
              <div className="h-full aspect-[3/4] relative rounded-lg overflow-hidden bg-white border border-black/5 flex-shrink-0">
                <img src={uploadedImage} alt="Uploaded model" className="w-full h-full object-cover" />
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

        <div className="space-y-4">
          <h2 className="text-base font-bold text-text-primary-light dark:text-text-primary-dark">选择模特人像</h2>
          
          <div className="bg-slate-100 dark:bg-gray-800 p-1 rounded-full flex text-sm w-full">
            <button
              onClick={() => setSelectedModelTab('my')}
              className={clsx(
                'flex-1 text-center py-1.5 rounded-full transition-all',
                selectedModelTab === 'my'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 font-medium shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              我的人像
            </button>
            <button
              onClick={() => setSelectedModelTab('recommended')}
              className={clsx(
                'flex-1 text-center py-1.5 rounded-full transition-all',
                selectedModelTab === 'recommended'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 font-medium shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              系统人像
            </button>
          </div>

          {false && selectedModelTab === 'recommended' && (
            <div className="grid grid-cols-4 gap-2 text-sm">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={clsx(
                    'py-2 rounded-full w-full text-center transition-all',
                    selectedCategory === category
                      ? 'border border-primary bg-primary/10 dark:bg-primary/20 text-primary font-medium'
                      : 'text-text-secondary-light dark:text-text-secondary-dark bg-slate-50 dark:bg-surface-dark'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {selectedModelTab === 'my' && allMyModels.length === 0 ? (
              <div 
                onClick={handleAddModelClick}
                className="col-span-3 bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/30 dark:border-primary/50 rounded-xl p-6 text-center flex flex-col items-center justify-center h-80 cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-primary">add_photo_alternate</span>
                  </div>
                </div>
                <p className="font-medium text-text-primary-light dark:text-text-primary-dark text-lg">上传模特图</p>
                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">支持JPG/JPEG/PNG格式</p>
              </div>
            ) : (
              <>
                {selectedModelTab === 'my' && (
                  <button
                    onClick={handleAddModelClick}
                    className="w-full h-36 rounded-lg bg-primary/5 dark:bg-primary/10 border border-dashed border-primary/30 dark:border-primary/50 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl text-primary">add_photo_alternate</span>
                    </div>
                    <span className="text-xs font-medium text-text-primary-light dark:text-text-primary-dark">上传模特图</span>
                  </button>
                )}

                {(selectedModelTab === 'my' ? visibleMyModels : visibleSystemModels).map((model, index) => {
                  const imageUrl = model.avatar || (model.images && model.images[0]?.file_path) || '';
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      className={clsx(
                        'w-full h-36 rounded-lg overflow-hidden relative transition-all',
                        selectedModelIndex === model.id
                          ? 'ring-2 ring-primary ring-offset-2'
                          : ''
                      )}
                    >
                      <img
                        src={imageUrl}
                        alt={`模特${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}

                {!(selectedModelTab === 'my' && allMyModels.length > 0 && allMyModels.length <= 5) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMoreModal(true);
                      if (selectedModelTab === 'my' && isLoggedIn && allMyModels.length < 17) {
                        fetchMyModels(2, 12);
                      }
                      if (selectedModelTab === 'recommended' && allSystemModels.length < 17) {
                        fetchSystemModels(2, 12);
                      }
                    }}
                    className="w-full h-36 bg-slate-100 dark:bg-surface-dark rounded-lg flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium"
                  >
                    更多 &gt;
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg z-20">
        <div className="px-4 pt-2 pb-4">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full text-white text-base font-semibold py-2.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-[0.99] transition-transform"
            style={{ backgroundColor: '#3713ec' }}
          >
            {isGenerating ? '生成中...' : '立即生成'}
            {!isGenerating && (
              <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-sm font-normal">
                30
                <img src="/yidou.svg" alt="icon" className="w-4 h-4" />
              </span>
            )}
          </button>
          <div className="mt-2 text-center">
            <p className="text-[10px] text-gray-400">
              使用即表示您已阅读并同意 <a href="#" className="text-[#4C3BFF] hover:underline">《衣来图AI服务协议》</a>
            </p>
          </div>
        </div>
      </footer>

      {showValidationOverlay && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[200] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl px-6 py-4 shadow-2xl animate-in zoom-in duration-200 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-gray-800 font-medium text-base">{validationMessage}</p>
          </div>
        </div>
      )}

      {showMoreModal && (
        <div 
          ref={popoverRef}
          className="absolute left-[calc(100%+1px)] top-0 z-[100] flex animate-in fade-in slide-in-from-left-2 duration-200 items-start h-full"
        >
          {/* Popover Content */}
          <div className="bg-white rounded-2xl w-[300px] h-full max-h-[calc(100vh-56px)] flex flex-col shadow-2xl relative z-10 border border-gray-100 overflow-hidden hover-scroll">
            <div className="flex items-center justify-between p-4 border-b border-gray-50">
              <h3 className="font-bold text-base text-gray-800">{selectedModelTab === 'my' ? '我的人像' : '系统人像'}</h3>
              <button onClick={() => setShowMoreModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div ref={modalGridRef} className="flex-1 overflow-y-auto p-4 scrollbar-thin-dark" onScroll={(e) => {
              const target = e.target as HTMLElement;
              if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
                if (selectedModelTab === 'my' && isLoggedIn) {
                  const nextPage = Math.floor(allMyModels.length / 12) + 1;
                  fetchMyModels(nextPage, 12);
                } else if (selectedModelTab === 'recommended') {
                  const nextPage = Math.floor(allSystemModels.length / 12) + 1;
                  fetchSystemModels(nextPage, 12);
                }
              }
            }}>
              <div className="grid grid-cols-3 gap-2">
                {(selectedModelTab === 'my' ? allMyModels : allSystemModels).map((model) => (
                  <div 
                    key={model.id}
                    id={`model-item-${model.id}`}
                    onMouseEnter={() => {
                      setHoveredModelId(model.id);
                      if (popoverRef.current) {
                        const modelElement = document.getElementById(`model-item-${model.id}`);
                        if (modelElement) {
                          const itemRect = modelElement.getBoundingClientRect();
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
                      }
                    }}
                    onMouseLeave={() => setHoveredModelId(null)}
                    onClick={() => handleModelSelect(model.id)}
                    className={clsx(
                      "aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all relative",
                      selectedModelIndex === model.id ? "border-[#3713ec]" : "border-transparent",
                      "hover:border-[#3713ec]"
                    )}
                    data-model-id={model.id}
                    data-selected={selectedModelIndex === model.id}
                  >
                    <img src={model.avatar || (model.images && model.images[0]?.file_path) || ''} alt="Model" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hover Preview - Floating next to popover */}
          {hoveredModelId && (selectedModelTab === 'my' ? allMyModels : allSystemModels).find(m => m.id === hoveredModelId) && (
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
                  src={(selectedModelTab === 'my' ? allMyModels : allSystemModels).find(m => m.id === hoveredModelId)?.avatar || ((selectedModelTab === 'my' ? allMyModels : allSystemModels).find(m => m.id === hoveredModelId)?.images && (selectedModelTab === 'my' ? allMyModels : allSystemModels).find(m => m.id === hoveredModelId)!.images[0]?.file_path) || ''} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <AddModelModal 
        visible={addModelModalVisible}
        onClose={() => setAddModelModalVisible(false)}
        onSuccess={handleModelAdded}
      />
    </div>
  );
};
