import React, { useState, useRef, useEffect } from 'react';
import { ImagePlus, ChevronDown, Coins, X } from 'lucide-react';
import clsx from 'clsx';
import { getSystemModels } from '../../../api/yilaitumodel';
import { getPoses, Pose } from '../../../api/poseSplit';

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
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [selectedPoseTab, setSelectedPoseTab] = useState<'system' | 'custom'>('system');
  const [selectedPoses, setSelectedPoses] = useState<number[]>([0]);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [hoveredModelId, setHoveredModelId] = useState<number | null>(null);
  const [modalPreviewPos, setModalPreviewPos] = useState({ top: 0, arrowTop: 0 });
  const [systemModels, setSystemModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [visibleSystemModels, setVisibleSystemModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [allSystemModels, setAllSystemModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [systemModelsLoading, setSystemModelsLoading] = useState(false);
  const [systemModelsPage, setSystemModelsPage] = useState(1);
  const [poses, setPoses] = useState<Pose[]>([]);
  const [showValidationOverlay, setShowValidationOverlay] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [customPoses, setCustomPoses] = useState<string[]>(['']);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const modalGridRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  const defaultPoses: Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}> = [];

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuantityClick = (quantity: number) => {
    setSelectedQuantity(quantity);
    if (selectedPoseTab === 'system') {
      setSelectedPoses([0]);
    } else {
      setSelectedPoses(Array.from({ length: quantity }, (_, i) => i + 1));
    }
    setCustomPoses(Array.from({ length: quantity }, () => ''));
  };

  const handlePoseClick = (poseId: number) => {
    if (poseId === 0) {
      setSelectedPoses([0]);
    } else {
      if (selectedPoses.includes(0)) {
        setSelectedPoses([poseId]);
      } else if (selectedQuantity === 1) {
        setSelectedPoses([poseId]);
      } else {
        if (selectedPoses.includes(poseId)) {
          if (selectedPoses.length > 1) {
            setSelectedPoses(selectedPoses.filter(id => id !== poseId));
          }
        } else {
          if (selectedPoses.length < selectedQuantity) {
            setSelectedPoses([...selectedPoses, poseId]);
          }
        }
      }
    }
  };

  const fetchSystemModels = async (page: number = 1, limit: number = 12) => {
    setSystemModelsLoading(true);
    try {
      const response = await getPoses();
      
      if (response.success && response.data.length > 0) {
        const modelsWithId = response.data.map((pose) => ({
          id: pose.id,
          avatar: pose.url,
          images: [{ file_path: pose.url }]
        }));
        
        if (page === 1) {
          setPoses(response.data);
          setAllSystemModels(modelsWithId);
          setVisibleSystemModels(modelsWithId.slice(0, 4));
          setSystemModels(modelsWithId.slice(0, 4));
        } else {
          setAllSystemModels(prev => {
            const existingIds = new Set(prev.map(model => model.id));
            const newUniqueModels = modelsWithId.filter(model => !existingIds.has(model.id));
            return [...prev, ...newUniqueModels];
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch system models:', error);
    } finally {
      setSystemModelsLoading(false);
    }
  };

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
    if (!hasInitializedRef.current) {
      fetchSystemModels(1, 12);
      hasInitializedRef.current = true;
    }
  }, []);

  const handleGenerate = () => {
    if (!uploadedImage) {
      setValidationMessage('请先上传模特图');
      setShowValidationOverlay(true);
      setTimeout(() => setShowValidationOverlay(false), 2000);
      return;
    }

    console.log('=== 用户选择的内容 ===');
    console.log('上传的模特图:', uploadedImage);
    console.log('选择的裂变图片数量:', selectedQuantity);
    const selectedPoseDescriptions = selectedPoses.map(poseId => {
      if (poseId === 0) {
        return `0: 随机姿势`;
      }
      const pose = poses.find(p => p.id === poseId);
      return pose ? `${pose.id}: ${pose.description}` : `${poseId}: 未知姿势`;
    });
    console.log('选中的姿势:', selectedPoseDescriptions);
    console.log('选择的姿势标签:', selectedPoseTab === 'system' ? '系统推荐姿势' : '自定义姿势');
    console.log('====================');

    setIsGenerating(true);

    const generationParams = {
      uploaded_image: uploadedImage,
      quantity: selectedQuantity,
      selected_poses: selectedPoses,
      pose_tab: selectedPoseTab
    };

    setTimeout(() => {
      const mockImages = Array.from({ length: selectedQuantity }, (_, i) => 
        `https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=pose%20split%20${i + 1}&image_size=portrait_3_4`
      );
      const mockTaskId = Date.now().toString();
      onGeneratedData(mockImages, mockTaskId, generationParams);
      setIsGenerating(false);
      setShowGenerateSuccess(true);
    }, 2000);
  };

  const handleReset = () => {
    setUploadedImage('');
    setSelectedQuantity(1);
    setSelectedPoseTab('system');
    setSelectedPoses([0]);
  };

  React.useImperativeHandle(onResetRef, () => handleReset);

  return (
    <div className="relative flex flex-col h-full bg-white w-[400px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h1 className="text-lg font-semibold">姿势裂变</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin-1px">
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
              className="bg-[#3713ec]/5 border border-dashed border-[#3713ec]/30 rounded-xl p-4 text-center flex flex-col items-center justify-center h-36 cursor-pointer hover:bg-[#3713ec]/10 hover:border-[#3713ec]/50 transition-colors"
              style={{ marginTop: '2px' }}
            >
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-[#3713ec]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-[#3713ec]">accessibility_new</span>
                </div>
              </div>
              <p className="font-medium text-gray-800 text-sm">上传模特图</p>
              <p className="text-xs text-gray-500 mt-1">点击/拖拽图片至此处</p>
            </div>
          ) : (
            <div className="bg-[#3713ec]/5 border border-dashed border-[#3713ec]/30 rounded-xl p-3 flex items-center h-36 gap-4">
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

        <section className="space-y-3">
          <h2 className="text-base font-semibold">选择裂变图片数量</h2>
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((qty) => (
              <button
                key={qty}
                onClick={() => handleQuantityClick(qty)}
                className={clsx(
                  "flex-1 py-2.5 rounded-full font-medium transition-all",
                  selectedQuantity === qty
                    ? "border border-[#3713ec] text-[#3713ec] bg-[#3713ec]/5 shadow-sm ring-1 ring-[#3713ec]/20"
                    : "bg-slate-100 text-gray-600 hover:bg-slate-200 border border-transparent"
                )}
              >
                {qty}张
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 relative">
          <h2 className="text-base font-semibold">选择姿势</h2>
          <div className="bg-slate-100 p-1 rounded-full flex gap-1">
            <button
              onClick={() => setSelectedPoseTab('system')}
              className={clsx(
                "flex-1 py-2 rounded-full font-medium transition-all text-sm",
                selectedPoseTab === 'system'
                  ? "bg-white text-[#3713ec] font-bold shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              )}
            >
              系统推荐姿势
            </button>
            <button
              onClick={() => setSelectedPoseTab('custom')}
              className={clsx(
                "flex-1 py-2 rounded-full font-medium transition-all text-sm",
                selectedPoseTab === 'custom'
                  ? "bg-white text-[#3713ec] font-bold shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              )}
            >
              自定义姿势
            </button>
          </div>

          {selectedPoseTab === 'system' && (
            <div className="grid grid-cols-3 gap-3">
              <div 
                onClick={() => handlePoseClick(0)}
                className={clsx(
                  "aspect-[3/4] rounded-xl relative cursor-pointer flex flex-col items-center justify-center group overflow-hidden transition-all",
                  selectedPoses.includes(0) ? "border-2 border-[#3713ec] bg-slate-50" : "bg-slate-100 border border-transparent hover:border-gray-300"
                )}
              >
                {selectedPoses.includes(0) && (
                  <div className="absolute top-2 right-2 z-10 w-5 h-5 bg-[#3713ec] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm ring-2 ring-white">
                    {selectedQuantity}
                  </div>
                )}
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-gray-500 text-2xl">shuffle</span>
                </div>
                <p className="text-sm font-medium text-gray-600">随机姿势</p>
              </div>

              {visibleSystemModels.map((model) => (
                <div 
                  key={model.id}
                  onClick={() => handlePoseClick(model.id)}
                  className={clsx(
                    "aspect-[3/4] rounded-xl border-2 relative cursor-pointer group overflow-hidden transition-all",
                    selectedPoses.includes(model.id) ? "border-[#3713ec]" : "bg-slate-100 border-transparent hover:border-gray-300"
                  )}
                >
                  <img alt="Model" className="w-full h-full object-cover" src={model.avatar || (model.images && model.images[0]?.file_path) || ''} />
                  {selectedPoses.includes(model.id) && (
                    <div className="absolute top-2 right-2 z-10 w-5 h-5 bg-[#3713ec] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm ring-2 ring-white">
                      {selectedPoses.indexOf(model.id) + 1}
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('更多按钮被点击', allSystemModels.length);
                  setShowMoreModal(true);
                  if (allSystemModels.length < 17) {
                    fetchSystemModels(2, 12);
                  }
                }}
                className="w-full h-36 bg-slate-100 rounded-lg flex items-center justify-center text-gray-600 text-sm font-medium"
              >
                更多 &gt;
              </button>
            </div>
          )}

          {selectedPoseTab === 'custom' && (
            <div className="space-y-4">
              {Array.from({ length: selectedQuantity }).map((_, index) => (
                <div key={index} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <label className="block text-sm font-medium text-gray-800 mb-2">姿势{index + 1}</label>
                  <textarea 
                    value={customPoses[index] || ''}
                    onChange={(e) => {
                      const newCustomPoses = [...customPoses];
                      newCustomPoses[index] = e.target.value;
                      setCustomPoses(newCustomPoses);
                    }}
                    className="w-full bg-slate-50 border-0 rounded-lg text-sm p-3 placeholder:text-gray-400/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" 
                    placeholder="输入想要生成的动作" 
                    rows="3"
                  ></textarea>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="sticky bottom-0 bg-white/80 backdrop-blur-sm pt-[10px] pb-1 px-4 border-t border-gray-200">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full text-white text-base font-semibold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
          style={{ backgroundColor: '#3713ec' }}
        >
          立即生成
          <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-sm font-normal">
            30
            <span className="text-base">🪙</span>
          </span>
        </button>
        <div className="mt-3 text-center">
          <p className="text-[10px] text-gray-400">
            使用即表示您已阅读并同意 <a href="#" className="text-[#4C3BFF] hover:underline">《衣来图AI服务协议》</a>
          </p>
        </div>
      </footer>

      {showMoreModal && (
        <div 
          ref={popoverRef}
          className="absolute left-[calc(100%+1px)] top-0 z-[100] flex animate-in fade-in slide-in-from-left-2 duration-200 items-start h-full"
        >
          <div className="bg-white rounded-2xl w-[300px] h-full max-h-[calc(100vh-56px)] flex flex-col shadow-2xl relative z-10 border border-gray-100 overflow-hidden hover-scroll">
            <div className="flex items-center justify-between p-4 border-b border-gray-50">
              <h3 className="font-bold text-base text-gray-800">系统推荐姿势</h3>
              <button onClick={() => setShowMoreModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div ref={modalGridRef} className="flex-1 overflow-y-auto p-4 scrollbar-thin-dark">
              <div className="grid grid-cols-3 gap-2">
                {allSystemModels.map((model) => (
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
                    onClick={() => handlePoseClick(model.id)}
                    className={clsx(
                      "aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all relative",
                      selectedPoses.includes(model.id) ? "border-[#3713ec]" : "border-transparent",
                      "hover:border-[#3713ec]"
                    )}
                    data-model-id={model.id}
                    data-selected={selectedPoses.includes(model.id)}
                  >
                    <img src={model.avatar || (model.images && model.images[0]?.file_path) || ''} alt="Model" className="w-full h-full object-cover" />
                    {selectedPoses.includes(model.id) && (
                      <div className="absolute top-2 right-2 z-10 w-5 h-5 bg-[#3713ec] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm ring-2 ring-white">
                        {selectedPoses.indexOf(model.id) + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {hoveredModelId && allSystemModels.find(m => m.id === hoveredModelId) && (
            <div 
              className="absolute left-[310px] bg-white p-2 rounded-2xl shadow-xl border border-gray-100 z-20 animate-in fade-in zoom-in duration-150"
              style={{ top: modalPreviewPos.top }}
            >
              <div 
                className="absolute -left-2 w-4 h-4 bg-white transform rotate-45 border-l border-b border-gray-100 z-0" 
                style={{ top: modalPreviewPos.arrowTop }}
              />
              
              <div className="w-[280px] aspect-[3/4] relative z-10 bg-white rounded-xl overflow-hidden">
                <img 
                  src={allSystemModels.find(m => m.id === hoveredModelId)?.avatar || (allSystemModels.find(m => m.id === hoveredModelId)?.images && allSystemModels.find(m => m.id === hoveredModelId)!.images[0]?.file_path) || ''} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {showValidationOverlay && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[200] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl px-6 py-4 shadow-2xl animate-in zoom-in duration-200 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-gray-800 font-medium text-base">{validationMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};
