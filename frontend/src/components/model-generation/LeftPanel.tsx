import React, { useState, useRef, useEffect } from 'react';
import { ImagePlus, ChevronDown, Coins, Upload, X, Star } from 'lucide-react';
import clsx from 'clsx';
import { getMyModels, getSystemModels } from '../../api/yilaitumodel';
import AddModelModal from '../AddModelModal';
import { useAuthStore } from '../../stores/useAuthStore';

// Data Mockups - Expanded to 20+ items
const generateModels = (type: 'adult' | 'system', count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: type === 'adult' ? i + 1 : i + 101,
    image: `https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=${type === 'adult' ? 'fashion model portrait' : 'system fashion model'} pose ${i + 1}&image_size=portrait_3_4`
  }));
};

const adultModels = generateModels('adult', 25);


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
  const { isLoggedIn, user, openAuthModal } = useAuthStore();
  const [version, setVersion] = useState<'common' | 'pro'>('common');
  const [outfitType, setOutfitType] = useState<'single' | 'match'>('single');
  const [modelType, setModelType] = useState<'adult' | 'system' | 'my'>('adult');
  const [userMyModels, setUserMyModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [visibleMyModels, setVisibleMyModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [allMyModels, setAllMyModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [myModelsLoading, setMyModelsLoading] = useState(false);
  // System models state
  const [systemModels, setSystemModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [visibleSystemModels, setVisibleSystemModels] = useState<Array<{id: number, avatar?: string, images?: Array<{file_path: string}>}>>([]);
  const [systemModelsLoading, setSystemModelsLoading] = useState(false);
  // API call tracking
  const [hasCalledSystemModelsAPI, setHasCalledSystemModelsAPI] = useState(false);
  const [hasCalledMyModelsAPI, setHasCalledMyModelsAPI] = useState(false);
  const [selectedModel, setSelectedModel] = useState<number>(1);
  const [styleCategory, setStyleCategory] = useState('daily');
  const [selectedStyle, setSelectedStyle] = useState<number>(1);
  const [ratio, setRatio] = useState('1:1');
  const [quantity, setQuantity] = useState(1);
  
  // Upload State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [singleOutfitImage, setSingleOutfitImage] = useState<string | null>(null);
  const [singleOutfitBackImage, setSingleOutfitBackImage] = useState<string | null>(null);
  const [topOutfitImage, setTopOutfitImage] = useState<string | null>(null);
  const [topOutfitBackImage, setTopOutfitBackImage] = useState<string | null>(null);
  const [bottomOutfitImage, setBottomOutfitImage] = useState<string | null>(null);
  const [bottomOutfitBackImage, setBottomOutfitBackImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleOutfitFileInputRef = useRef<HTMLInputElement>(null);
  const singleOutfitBackFileInputRef = useRef<HTMLInputElement>(null);
  const topOutfitFileInputRef = useRef<HTMLInputElement>(null);
  const topOutfitBackFileInputRef = useRef<HTMLInputElement>(null);
  const bottomOutfitFileInputRef = useRef<HTMLInputElement>(null);
  const bottomOutfitBackFileInputRef = useRef<HTMLInputElement>(null);

  // Track previous login state
  const wasLoggedIn = useRef(isLoggedIn);

  // Modal State
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [addModelModalVisible, setAddModelModalVisible] = useState(false);
  const [hoveredModelId, setHoveredModelId] = useState<number | null>(null);
  const [modalPreviewPos, setModalPreviewPos] = useState({ top: 0, arrowTop: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const modalGridRef = useRef<HTMLDivElement>(null);

  // Main List Hover State
  const [mainHoveredId, setMainHoveredId] = useState<number | null>(null);
  const [mainPreviewPos, setMainPreviewPos] = useState({ top: 0, arrowTop: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showCustomSceneInput, setShowCustomSceneInput] = useState(false);
  const [customSceneText, setCustomSceneText] = useState('');
  const [customSceneDisabled, setCustomSceneDisabled] = useState(false);
  const [styleHoveredId, setStyleHoveredId] = useState<number | null>(null);
  const stylePopoverRef = useRef<HTMLDivElement>(null);
  const styleModalGridRef = useRef<HTMLDivElement>(null);
  const [styleModalPreviewPos, setStyleModalPreviewPos] = useState({ top: 0, arrowTop: 0 });
  const [styleMainHoveredId, setStyleMainHoveredId] = useState<number | null>(null);
  const [styleMainPreviewPos, setStyleMainPreviewPos] = useState({ top: 0, arrowTop: 0 });
  
  // Dynamic Model Lists
  const [currentAdultModels, setCurrentAdultModels] = useState(adultModels.slice(0, 5));
  
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

  // Clear my models data when user logs out
  useEffect(() => {
    if (!isLoggedIn) {
      setUserMyModels([]);
      setVisibleMyModels([]);
      setAllMyModels([]);
      setHasCalledMyModelsAPI(false);
    }
  }, [isLoggedIn]);

  // Fetch my models when user logs in and is on "我的模特" tab
  useEffect(() => {
    if (isLoggedIn && wasLoggedIn.current === false && modelType === 'my' && (!hasCalledMyModelsAPI || allMyModels.length === 0)) {
      fetchMyModels(1, 12);
    }
    wasLoggedIn.current = isLoggedIn;
  }, [isLoggedIn, modelType, hasCalledMyModelsAPI, allMyModels.length]);

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

  const handleModelSelect = (id: number, isAdult: boolean | null = null) => {
    setSelectedModel(id);
    
    // Handle my models separately
    if (modelType === 'my') {
      if (!isLoggedIn) {
        return;
      }
      
      // Find model from all loaded models
      const model = allMyModels.find(m => m.id === id);
      
      if (model) {
        // Check if model is already in visible models
        const isVisible = visibleMyModels.find(m => m.id === id);

        if (isVisible) {
          // Model is already visible, no need to change anything
          // Just refresh the visible models from all models
          const newVisibleModels = allMyModels.slice(0, 4);
          setVisibleMyModels(newVisibleModels);
        } else {
          // Model is not in visible models, replace the first one
          // Create new visible models array with the selected model at index 0
          const newVisibleModels = [model, ...allMyModels.slice(1, 5)];
          setVisibleMyModels(newVisibleModels.slice(0, 4));
        }
      }
      // Don't close the modal after selection
      return;
    }
    
    // Handle system models separately
    if (modelType === 'system') {
      // Find model from all loaded system models
      const model = systemModels.find(m => m.id === id);
      
      if (model) {
        // Check if model is already in visible system models
        const isVisible = visibleSystemModels.find(m => m.id === id);

        if (isVisible) {
          // Model is already visible, no need to change anything
          // Just refresh the visible models from all system models
          const newVisibleModels = systemModels.slice(0, 5);
          setVisibleSystemModels(newVisibleModels);
        } else {
          // Model is not in visible models, replace the first one
          // Create new visible models array with the selected model at index 0
          const newVisibleModels = [model, ...systemModels.slice(1, 5)];
          setVisibleSystemModels(newVisibleModels);
        }
      }
      // Don't close the modal after selection
      return;
    }
    
    // Original logic for adult models
    if (isAdult !== null) {
      const fullList = adultModels;
      const model = fullList.find(m => m.id === id);
      
      if (model) {
        const currentList = currentAdultModels;
        const setList = setCurrentAdultModels;
        
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
    }
    // Don't close the modal after selection
  };

  // Main List Hover Handler
  const handleMainHover = (_: React.MouseEvent<HTMLDivElement> | null, id: number | null) => {
    if (id === null) {
      setMainHoveredId(null);
      return;
    }

    setMainHoveredId(id);
    if (containerRef.current) {
      // Use id-based positioning instead of event target
      const modelElement = document.getElementById(`main-model-item-${id}`);
      if (modelElement) {
        const rect = modelElement.getBoundingClientRect();
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
    }
  };

  // Function to get my models from API
  const fetchMyModels = async (page: number = 1, limit: number = 12) => {
    if (!isLoggedIn || !user) {
      return;
    }
    
    setMyModelsLoading(true);
    try {
      // Calculate skip based on page and limit
      const skip = (page - 1) * limit;
      
      // Use actual API call
      const response = await getMyModels({ skip, page_size: limit }) as any;
      
      // Ensure we're storing all model data including the id returned by the backend
      const modelsWithId = response.items.map((model: any) => ({
        ...model,
        // Ensure id is properly preserved
        id: model.id
      }));
      
      if (page === 1) {
        // First page: set both visible and all models
        setAllMyModels(modelsWithId);
        setVisibleMyModels(modelsWithId.slice(0, 4));
        setUserMyModels(modelsWithId.slice(0, 4));
      } else {
        // Subsequent pages: add to all models only, preserving all ids
        // Filter out duplicate models by id to avoid duplicates
        setAllMyModels(prev => {
          const existingIds = new Set(prev.map(model => model.id));
          const newUniqueModels = modelsWithId.filter(model => !existingIds.has(model.id));
          return [...prev, ...newUniqueModels];
        });
      }
    } catch (error) {
      console.error('Failed to fetch my models:', error);
      // In real app, show proper error message
    } finally {
      setMyModelsLoading(false);
      // Update API call tracking state
      setHasCalledMyModelsAPI(true);
    }
  };

  // Function to get system models from API
  const fetchSystemModels = async (page: number = 1, limit: number = 12) => {
    setSystemModelsLoading(true);
    try {
      // Calculate skip based on page and limit
      const skip = (page - 1) * limit;
      
      // Use actual API call - no need for user_id, type=system is added in the API function
      const response = await getSystemModels({ skip, page_size: limit }) as any;
      
      // Ensure we're storing all model data including the id returned by the backend
      const modelsWithId = response.items.map((model: any) => ({
        ...model,
        // Ensure id is properly preserved
        id: model.id
      }));
      
      if (page === 1) {
        // First page: set both visible and all system models
        setSystemModels(modelsWithId);
        setVisibleSystemModels(modelsWithId.slice(0, 5));
      } else {
        // Subsequent pages: add to all system models only, preserving all ids
        // Filter out duplicate models by id to avoid duplicates
        setSystemModels(prev => {
          const existingIds = new Set(prev.map(model => model.id));
          const newUniqueModels = modelsWithId.filter(model => !existingIds.has(model.id));
          return [...prev, ...newUniqueModels];
        });
      }
      // Update API call tracking state
      setHasCalledSystemModelsAPI(true);
    } catch (error) {
      console.error('Failed to fetch system models:', error);
      // In real app, show proper error message
    } finally {
      setSystemModelsLoading(false);
    }
  };

  // Handle my models button click
  const handleMyModelsClick = () => {
    setModelType('my');
    
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }
    
    // Only call API if:
    // 1. We haven't called it before, OR
    // 2. We called it before but got 0 models
    if (!hasCalledMyModelsAPI || allMyModels.length === 0) {
      fetchMyModels(1, 12); // Use consistent limit of 12 to avoid duplicate IDs
    }
  };

  // Handle successful model addition
  const handleModelAdded = () => {
    // Refresh my models list
    fetchMyModels(1, 12);
  };

  // Displayed models logic
  const displayedModels = modelType === 'adult' 
    ? currentAdultModels 
    : modelType === 'system' 
    ? visibleSystemModels 
    : visibleMyModels;
  
  const modalModels = modelType === 'adult' 
    ? adultModels 
    : modelType === 'system' 
    ? systemModels 
    : allMyModels;
  
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
  const mainPreviewModel = modelType === 'my' 
    ? allMyModels.find(m => m.id === mainHoveredId)
    : modelType === 'system' 
    ? systemModels.find(m => m.id === mainHoveredId)
    : adultModels.find(m => m.id === mainHoveredId);
  const styleMainPreviewModel = currentStyles.find(s => s.id === styleMainHoveredId);

  const getModalTitle = () => {
    switch (modelType) {
      case 'adult':
        return '随机模特';
      case 'system':
        return '系统模特';
      case 'my':
        return '我的模特';
      default:
        return '姿势';
    }
  };

  const handleGenerate = () => {
    console.log('=== 开始生成 - 用户选择的数据 ===');
    console.log('版本:', version,version === 'common' ? '通用版' : '专业版');
    console.log('服饰类型:', outfitType,outfitType === 'single' ? '单件' : '搭配');
    console.log('模特类型:', modelType,modelType === 'adult' ? '随机模特' : modelType === 'system' ? '系统模特' : '我的模特');
    console.log('选中的模特ID:',selectedModel);
    console.log('风格场景:', styleCategory,styleCategory === 'daily' ? '日常生活风' : styleCategory === 'magazine' ? '时尚杂志风' : '运动活力风');
    console.log('选中的风格ID:', selectedStyle);
    console.log('自定义场景描述:', customSceneText || '无');
    console.log('图片比例:', ratio);
    console.log('图片数量:', quantity);
    
    if (version === 'common') {
      console.log('服饰图片:', uploadedImage ? '已上传' : '未上传');
    } else {
      if (outfitType === 'single') {
        console.log('单件服饰正面:', singleOutfitImage ? '已上传' : '未上传');
        console.log('单件服饰背面:', singleOutfitBackImage ? '已上传' : '未上传');
      } else {
        console.log('上装正面:', topOutfitImage ? '已上传' : '未上传');
        console.log('上装背面:', topOutfitBackImage ? '已上传' : '未上传');
        console.log('下装正面:', bottomOutfitImage ? '已上传' : '未上传');
        console.log('下装背面:', bottomOutfitBackImage ? '已上传' : '未上传');
      }
    }
    console.log('====================================');
  };

  // 预览位置改为基于悬停项的真实几何计算

  return (
    <div 
      ref={containerRef}
      className="w-[450px] flex-shrink-0 bg-white shadow-sm flex flex-col relative" 
      style={{ maxHeight: 'calc(100vh - 56px)', marginTop: '0' }}
    >
      <div className="overflow-y-auto scrollbar-thin-transparent flex-1">
        <div className="pt-3 pb-0 px-6 space-y-6">
          <h1 className="text-lg font-semibold text-gray-800 mb-6">模特图生成</h1>

          {/* Version Toggle */}
          <div className="bg-gray-100 p-1 rounded-full flex text-sm w-full">
            <button
              onClick={() => setVersion('common')}
              className={clsx(
                "flex-1 text-center py-1.5 rounded-full transition-all",
                version === 'common' ? "bg-white text-[#3713ec] font-medium shadow-sm" : "text-[#64748B] hover:text-[#334155]"
              )}
            >
              通用版
            </button>
            <button
              onClick={() => {
                setVersion('pro');
                setOutfitType('single');
              }}
              className={clsx(
                "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full transition-all",
                version === 'pro' ? "bg-white text-[#3713ec] font-medium shadow-sm" : "text-[#64748B] hover:text-[#334155]"
              )}
            >
              专业版
              <span className="material-symbols-outlined text-amber-500 text-[18px]">diamond</span>
            </button>
          </div>

          {/* Upload Area - 通用版 */}
          {version === 'common' && (
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
                  className="bg-[#3713ec]/5 border border-dashed border-[#3713ec]/30 rounded-xl p-6 text-center flex flex-col items-center justify-center h-40 cursor-pointer hover:bg-[#3713ec]/8 hover:border-[#3713ec]/50 transition-all duration-200"
                >
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-full bg-[#3713ec]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-[#3713ec]">add_photo_alternate</span>
                    </div>
                  </div>
                  <p className="font-medium text-gray-800">上传服饰实拍图</p>
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
          )}
          
          {/* Upload Area - 专业版 */}
          {version === 'pro' && (
            <>
              <input 
                type="file" 
                ref={singleOutfitFileInputRef}
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'image/gif'].includes(file.type)) {
                      alert('不支持的文件格式');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setSingleOutfitImage(e.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <input 
                type="file" 
                ref={singleOutfitBackFileInputRef}
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'image/gif'].includes(file.type)) {
                      alert('不支持的文件格式');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setSingleOutfitBackImage(e.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <input 
                type="file" 
                ref={topOutfitFileInputRef}
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'image/gif'].includes(file.type)) {
                      alert('不支持的文件格式');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setTopOutfitImage(e.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <input 
                type="file" 
                ref={bottomOutfitFileInputRef}
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'image/gif'].includes(file.type)) {
                      alert('不支持的文件格式');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setBottomOutfitImage(e.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <input 
                type="file" 
                ref={topOutfitBackFileInputRef}
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'image/gif'].includes(file.type)) {
                      alert('不支持的文件格式');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setTopOutfitBackImage(e.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <input 
                type="file" 
                ref={bottomOutfitBackFileInputRef}
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'image/gif'].includes(file.type)) {
                      alert('不支持的文件格式');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setBottomOutfitBackImage(e.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <div className="flex border-b border-gray-200 text-center text-sm font-medium -mt-2">
                <div className="flex-1 relative">
                  <button 
                    onClick={() => setOutfitType('single')}
                    className={`w-full py-3 transition-colors ${outfitType === 'single' ? 'text-[#3713ec]' : 'text-[#64748B] hover:text-[#334155]'}`}
                  >
                    单件上身
                  </button>
                  {outfitType === 'single' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3713ec] rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <button 
                    onClick={() => setOutfitType('match')}
                    className={`w-full py-3 transition-colors ${outfitType === 'match' ? 'text-[#3713ec]' : 'text-[#64748B] hover:text-[#334155]'}`}
                  >
                    上下装搭配
                  </button>
                  {outfitType === 'match' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3713ec] rounded-full"></div>
                  )}
                </div>
              </div>
              
              {/* 单件上身上传区域 */}
              {outfitType === 'single' && (
                <div className="space-y-4">
                  {!singleOutfitImage ? (
                    <div className="flex flex-col items-center justify-center p-6 border border-dashed border-[#3713ec]/30 rounded-2xl bg-[#3713ec]/[0.03] hover:bg-[#3713ec]/[0.06] transition-colors cursor-pointer group h-40">
                      <div 
                        onClick={() => singleOutfitFileInputRef.current?.click()}
                        className="flex justify-center mb-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#3713ec]/10 flex items-center justify-center group-hover:bg-[#3713ec]/20 cursor-pointer">
                          <span className="material-symbols-outlined text-3xl text-[#3713ec]">add_photo_alternate</span>
                        </div>
                      </div>
                      <p className="font-bold text-gray-900 text-sm mb-1">上传服饰实拍图</p>
                      <p className="text-[10px] text-gray-400">点击/拖拽图片</p>
                    </div>
                  ) : (
                    <div className="bg-[#3713ec]/5 border border-dashed border-[#3713ec]/30 rounded-xl p-3 flex items-center h-40 gap-4">
                      <div className="h-full aspect-[3/4] relative rounded-lg overflow-hidden bg-white border border-black/5 flex-shrink-0">
                        <img src={singleOutfitImage} alt="Uploaded clothing" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex justify-center items-center">
                        <button 
                          onClick={() => singleOutfitFileInputRef.current?.click()}
                          className="px-5 py-2.5 rounded-full bg-[#3713ec]/10 text-[#3713ec] font-medium text-sm hover:bg-[#3713ec]/20 transition-colors"
                        >
                          重新上传正面图
                        </button>
                      </div>
                    </div>
                  )}
                  {!singleOutfitBackImage ? (
                    <div 
                      onClick={() => singleOutfitBackFileInputRef.current?.click()}
                      className="bg-slate-100 border border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center space-x-2 text-center cursor-pointer hover:bg-slate-200 hover:border-gray-300 transition-all duration-200"
                    >
                      <span className="material-symbols-outlined text-2xl text-gray-500">add_photo_alternate</span>
                      <div className="text-left">
                        <p className="font-medium text-sm text-gray-800">上传服饰后背图</p>
                        <p className="text-xs text-gray-500 mt-0.5">如果不需要后背图可忽略上传</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#3713ec]/5 border border-dashed border-[#3713ec]/30 rounded-xl p-3 flex items-center h-40 gap-4">
                      <div className="h-full aspect-[3/4] relative rounded-lg overflow-hidden bg-white border border-black/5 flex-shrink-0">
                        <img src={singleOutfitBackImage} alt="Uploaded clothing back" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex justify-center items-center">
                        <button 
                          onClick={() => singleOutfitBackFileInputRef.current?.click()}
                          className="px-5 py-2.5 rounded-full bg-[#3713ec]/10 text-[#3713ec] font-medium text-sm hover:bg-[#3713ec]/20 transition-colors"
                        >
                          重新上传背面图
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* 上下装搭配上传区域 */}
              {outfitType === 'match' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {/* 上传上装区域 */}
                    <div className="space-y-3">
                      {!topOutfitImage ? (
                        <div 
                          onClick={() => topOutfitFileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center p-6 border border-dashed border-[#3713ec]/30 rounded-2xl bg-[#3713ec]/[0.03] hover:bg-[#3713ec]/[0.06] transition-colors cursor-pointer group h-40"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#3713ec]/10 flex items-center justify-center mb-2 group-hover:bg-[#3713ec]/20">
                            <span className="material-symbols-outlined text-[#3713ec]">checkroom</span>
                          </div>
                          <p className="font-bold text-gray-900 text-sm mb-1">上传上装</p>
                          <p className="text-[10px] text-gray-400">点击/拖拽图片</p>
                        </div>
                      ) : (
                        <div className="bg-[#3713ec]/5 border border-[#3713ec]/30 rounded-xl h-40 overflow-hidden relative">
                          <div className="w-full h-full relative bg-white">
                            <img src={topOutfitImage} alt="已上传上装" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setTopOutfitImage(null)}
                              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all"
                            >
                              <span className="material-symbols-outlined" style={{fontSize: '18px'}}>close</span>
                            </button>
                          </div>
                        </div>
                      )}
                      {!topOutfitBackImage ? (
                        <div 
                          onClick={() => topOutfitBackFileInputRef.current?.click()}
                          className="bg-slate-100 border border-dashed border-gray-200 rounded-xl py-3 flex items-center justify-center space-x-1.5 text-center cursor-pointer hover:bg-slate-200 hover:border-gray-300 transition-all"
                        >
                          <span className="text-xs font-medium text-gray-500">上传上装后背图</span>
                        </div>
                      ) : (
                        <div className="bg-[#3713ec]/5 border border-[#3713ec]/30 rounded-xl h-40 overflow-hidden relative">
                          <div className="w-full h-full relative bg-white">
                            <img src={topOutfitBackImage} alt="已上传上装后背图" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setTopOutfitBackImage(null)}
                              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all"
                            >
                              <span className="material-symbols-outlined" style={{fontSize: '18px'}}>close</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* 上传下装区域 */}
                    <div className="space-y-3">
                      {!bottomOutfitImage ? (
                        <div 
                          onClick={() => bottomOutfitFileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center p-6 border border-dashed border-[#3713ec]/30 rounded-2xl bg-[#3713ec]/[0.03] hover:bg-[#3713ec]/[0.06] transition-colors cursor-pointer group h-40"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#3713ec]/10 flex items-center justify-center mb-2 group-hover:bg-[#3713ec]/20">
                            <span className="material-symbols-outlined text-[#3713ec]">apparel</span>
                          </div>
                          <p className="font-bold text-gray-900 text-sm mb-1">上传下装</p>
                          <p className="text-[10px] text-gray-400">点击/拖拽图片</p>
                        </div>
                      ) : (
                        <div className="bg-[#3713ec]/5 border border-[#3713ec]/30 rounded-xl h-40 overflow-hidden relative">
                          <div className="w-full h-full relative bg-white">
                            <img src={bottomOutfitImage} alt="已上传下装" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setBottomOutfitImage(null)}
                              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all"
                            >
                              <span className="material-symbols-outlined" style={{fontSize: '18px'}}>close</span>
                            </button>
                          </div>
                        </div>
                      )}
                      {!bottomOutfitBackImage ? (
                        <div 
                          onClick={() => bottomOutfitBackFileInputRef.current?.click()}
                          className="bg-slate-100 border border-dashed border-gray-200 rounded-xl py-3 flex items-center justify-center space-x-1.5 text-center cursor-pointer hover:bg-slate-200 hover:border-gray-300 transition-all"
                        >
                          <span className="text-xs font-medium text-gray-500">上传下装后背图</span>
                        </div>
                      ) : (
                        <div className="bg-[#3713ec]/5 border border-[#3713ec]/30 rounded-xl h-40 overflow-hidden relative">
                          <div className="w-full h-full relative bg-white">
                            <img src={bottomOutfitBackImage} alt="已上传下装后背图" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setBottomOutfitBackImage(null)}
                              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all"
                            >
                              <span className="material-symbols-outlined" style={{fontSize: '18px'}}>close</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Model Type Selection */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">选择模特类型</h3>
            <div className="flex space-x-3 text-sm">
              <button
                onClick={() => setModelType('adult')}
                className={clsx(
                  "flex-1 py-2.5 rounded-full text-sm font-medium border",
                  modelType === 'adult' 
                    ? "border-[#3713ec] text-[#3713ec] bg-[#3713ec]/10" 
                    : "bg-slate-100 text-[#64748B] hover:bg-gray-100"
                )}
              >
                随机模特
              </button>
              <button
                onClick={() => {
                  setModelType('system');
                  // Only call API if:
                  // 1. We haven't called it before, OR
                  // 2. We called it before but got 0 models
                  if (!hasCalledSystemModelsAPI || systemModels.length === 0) {
                    fetchSystemModels(1, 12);
                  }
                }}
                className={clsx(
                  "flex-1 py-2.5 rounded-full text-sm font-medium border",
                  modelType === 'system' 
                    ? "border-[#3713ec] text-[#3713ec] bg-[#3713ec]/10" 
                    : "bg-slate-100 text-[#64748B] hover:bg-gray-100"
                )}
              >
                系统模特
              </button>
              {version === 'pro' && (
                <button
                  onClick={handleMyModelsClick}
                  className={clsx(
                    "flex-1 py-2.5 rounded-full text-sm font-medium border",
                    modelType === 'my' 
                      ? "border-[#3713ec] text-[#3713ec] bg-[#3713ec]/10" 
                      : "bg-slate-100 text-[#64748B] hover:bg-gray-100"
                  )}
                >
                  我的模特
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {modelType === 'my' && (
                <div 
                  onClick={() => {
                    if (!isLoggedIn) {
                      openAuthModal();
                      return;
                    }
                    setAddModelModalVisible(true);
                  }}
                  className="aspect-[3/4] flex flex-col items-center justify-center bg-[#3713ec]/[0.03] border border-dashed border-[#3713ec]/20 rounded-xl cursor-pointer hover:bg-[#3713ec]/[0.06] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#3713ec] text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
                    <span className="material-icons-outlined text-lg">add</span>
                  </div>
                  <span className="text-[#3713ec] font-medium text-sm">添加模特</span>
                </div>
              )}
              {displayedModels.map((model) => (
                <div 
                  key={model.id}
                  id={`main-model-item-${model.id}`}
                  onClick={() => {
                    if (modelType === 'my' && !isLoggedIn) {
                      return;
                    }
                    setSelectedModel(model.id);
                  }}
                  onMouseEnter={() => handleMainHover(null as any, model.id)}
                  onMouseLeave={() => handleMainHover(null as any, null)}
                  className={clsx(
                    "aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all relative",
                    selectedModel === model.id ? "border-[#3713ec]" : "border-transparent",
                    "hover:border-[#3713ec]"
                  )}
                >
                  <img src={(model as any).avatar || ((model as any).images && (model as any).images[0]?.file_path) || (model as any).image} alt="Model" className="w-full h-full object-cover" />
                </div>
              ))}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreModal(true);
                  // For my models, load more images when opening the modal only if we haven't loaded them yet
                  if (modelType === 'my' && isLoggedIn && allMyModels.length < 17) {
                    // Only fetch if we don't have enough models already
                    fetchMyModels(2, 12); // Load page 2 with 12 items
                  }
                  // For system models, load more images when opening the modal only if we haven't loaded them yet
                  if (modelType === 'system' && systemModels.length < 17) {
                    // Only fetch if we don't have enough models already
                    fetchSystemModels(2, 12); // Load page 2 with 12 items
                  }
                }}
                className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
              >
                <span className="text-gray-500 text-xs">更多 &gt;</span>
              </div>
            </div>
          </div>

          {/* Style Scene Selection */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">选择风格场景</h3>
            <div className="flex space-x-3 text-sm overflow-x-auto pb-2 -mb-2">
              {[
                { key: 'daily', label: '日常生活风' },
                { key: 'magazine', label: '时尚杂志风' },
                { key: 'sport', label: '运动活力风' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setStyleCategory(item.key); setSelectedStyle(1); }}
                  className={clsx(
                    "flex-shrink-0 px-4 py-2.5 rounded-full font-medium border",
                    styleCategory === item.key
                      ? "border-[#3713ec] text-[#3713ec] bg-[#3713ec]/10" 
                      : "bg-slate-100 text-[#64748B] hover:bg-gray-100"
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
                  id={`main-style-item-${style.id}`}
                  onClick={() => {
                    if (showCustomSceneInput) {
                      if (customSceneText.trim()) {
                        setCustomSceneDisabled(true);
                      } else {
                        setShowCustomSceneInput(false);
                      }
                    }
                    setSelectedStyle(style.id);
                  }}
                  onMouseEnter={() => {
                    const containerRect = containerRef.current?.getBoundingClientRect();
                    if (!containerRect) return;
                    // Use id-based positioning instead of event target
                    const styleElement = document.getElementById(`main-style-item-${style.id}`);
                    if (styleElement) {
                      const rect = styleElement.getBoundingClientRect();
                      const itemTop = rect.top - containerRect.top;
                      const arrowTop = itemTop + rect.height / 2;
                      const previewHeight = 300;
                      let top = arrowTop - previewHeight / 2;
                      const containerHeight = containerRef.current!.offsetHeight;
                      if (top < 0) top = 0;
                      if (top + previewHeight > containerHeight) top = containerHeight - previewHeight;
                      setStyleMainHoveredId(style.id);
                      setStyleMainPreviewPos({ top, arrowTop: arrowTop - top });
                    }
                  }}
                  onMouseLeave={() => setStyleMainHoveredId(null)}
                  className={clsx(
                    "group relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                    selectedStyle === style.id ? "border-[#3713ec]" : "border-transparent",
                    "hover:border-[#3713ec]"
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
            {!showCustomSceneInput && (
              <div className="w-full">
                <button 
                  onClick={() => setShowCustomSceneInput(true)}
                  className="w-full h-12 rounded-lg bg-[#3713ec]/5 border border-dashed border-[#3713ec]/30 flex items-center justify-center gap-2 text-[#3713ec] font-medium text-sm transition-colors hover:bg-[#3713ec]/10"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                  <span>自定义，输入场景描述</span>
                </button>
              </div>
            )}
            {showCustomSceneInput && (
              <div className="w-full">
                <textarea 
                  value={customSceneText}
                  onChange={(e) => setCustomSceneText(e.target.value)}
                  onBlur={() => {
                    if (customSceneText.trim()) {
                      setSelectedStyle(null);
                    } else {
                      setShowCustomSceneInput(false);
                    }
                  }}
                  onFocus={() => setCustomSceneDisabled(false)}
                  className={clsx(
                    "w-full h-24 rounded-lg bg-white text-sm p-3 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#3713ec] resize-none align-top shadow-sm",
                    customSceneDisabled ? "border-2 border-gray-300 text-gray-400" : "border border-[#3713ec] text-gray-800"
                  )}
                  placeholder="您希望模特在一个什么样的场景？示例：明亮的咖啡馆，有浅灰沙发和原木书架"
                />
              </div>
            )}
          </div>

          {/* Ratio Selection */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">选择图片比例</h3>
            <div className="flex space-x-3 text-sm font-medium">
              {['1:1', '2:3', '3:4'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className={clsx(
                    "flex-1 py-2.5 rounded-full border",
                    ratio === r 
                      ? "border-[#3713ec] text-[#3713ec] bg-[#3713ec]/10" 
                      : "bg-slate-100 text-[#64748B] hover:bg-gray-100"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="space-y-4 pb-4">
            <h3 className="text-base font-semibold">选择图片数量</h3>
            <div className="grid grid-cols-4 gap-3 text-sm font-medium">
              {[1, 2, 4, 6].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuantity(q)}
                  className={clsx(
                    "py-2.5 rounded-full border",
                    quantity === q 
                      ? "border-[#3713ec] text-[#3713ec] bg-[#3713ec]/10" 
                      : "bg-slate-100 text-[#64748B] hover:bg-gray-100"
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
          <button onClick={handleGenerate} className="w-full bg-gradient-to-r from-[#6C5CFF] to-[#5a4cf0] text-white py-3 rounded-full text-base font-bold shadow-lg shadow-brand/30 hover:shadow-brand/40 transition-all flex items-center justify-center gap-2">
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
                src={(mainPreviewModel as any).avatar || ((mainPreviewModel as any).images && (mainPreviewModel as any).images[0]?.file_path) || (mainPreviewModel as any).image} 
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
           <div className="bg-white rounded-2xl w-[300px] h-full max-h-[calc(100vh-56px)] flex flex-col shadow-2xl relative z-10 border border-gray-100 overflow-hidden hover-scroll">
              <div className="flex items-center justify-between p-4 border-b border-gray-50">
                <h3 className="font-bold text-base text-gray-800">{getModalTitle()}</h3>
                <button onClick={() => setShowMoreModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div ref={modalGridRef} className="flex-1 overflow-y-auto p-4 scrollbar-thin-dark" onScroll={(e) => {
                const target = e.target as HTMLElement;
                // Check if user has scrolled to the bottom (with a 10px threshold for better user experience)
                if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
                  if (modelType === 'my' && isLoggedIn) {
                    // Load more images for my models
                    const nextPage = Math.floor(allMyModels.length / 12) + 1;
                    fetchMyModels(nextPage, 12);
                  } else if (modelType === 'system') {
                    // Load more images for system models
                    const nextPage = Math.floor(systemModels.length / 12) + 1;
                    fetchSystemModels(nextPage, 12);
                  }
                }
              }}>
                <div className="grid grid-cols-3 gap-2">
                  {modalModels.map((model) => (
                    <div 
                      key={model.id}
                      id={`model-item-${model.id}`}
                      onMouseEnter={() => {
                        setHoveredModelId(model.id);
                        if (popoverRef.current) {
                          // Use id-based positioning instead of event target
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
                      onClick={() => handleModelSelect(model.id, modelType === 'my' ? null : modelType === 'adult')}
                      className={clsx(
                        "aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all relative",
                        selectedModel === model.id ? "border-[#3713ec]" : "border-transparent",
                        "hover:border-[#3713ec]"
                      )}
                    >
                      <img src={(model as any).avatar || ((model as any).images && (model as any).images[0]?.file_path) || (model as any).image} alt="Model" className="w-full h-full object-cover" />
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
                      src={(previewModel as any).avatar || ((previewModel as any).images && (previewModel as any).images[0]?.file_path) || (previewModel as any).image} 
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
          <div className="bg-white rounded-2xl w-[300px] h-full max-h-[calc(100vh-56px)] flex flex-col shadow-2xl relative z-10 border border-gray-100 overflow-hidden hover-scroll">
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
                    id={`style-item-${style.id}`}
                    onMouseEnter={() => {
                      setStyleHoveredId(style.id);
                      if (stylePopoverRef.current) {
                        // Use id-based positioning instead of event target
                        const styleElement = document.getElementById(`style-item-${style.id}`);
                        if (styleElement) {
                          const itemRect = styleElement.getBoundingClientRect();
                          const popRect = stylePopoverRef.current.getBoundingClientRect();
                          const centerY = itemRect.top - popRect.top + itemRect.height / 2;
                          const previewHeight = 300;
                          let top = centerY - previewHeight / 2;
                          const ph = stylePopoverRef.current.offsetHeight;
                          if (top < 0) top = 0;
                          if (top + previewHeight > ph) top = ph - previewHeight;
                          setStyleModalPreviewPos({ top, arrowTop: centerY - top });
                        }
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

      <AddModelModal 
        visible={addModelModalVisible}
        onClose={() => setAddModelModalVisible(false)}
        onSuccess={handleModelAdded}
      />
    </div>
  );
};
