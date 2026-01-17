import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ImagePlus, ChevronDown, Coins, Upload, X, Star } from 'lucide-react';
import clsx from 'clsx';
import { getMyModels, getSystemModels } from '../../../api/yilaitumodel';
import { modelImageGeneration } from '../../../api/modelImageGeneration';
import { getPublicScenes } from '../../../api/sysImages';
import AddModelModal from '../AddModelModal';
import { useAuthStore } from '../../../stores/useAuthStore';

// Data Mockups - Expanded to 20+ items
const generateModels = (type: 'adult' | 'system', count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: type === 'adult' ? i + 1 : i + 101,
    image: `https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=${type === 'adult' ? 'fashion model portrait' : 'system fashion model'} pose ${i + 1}&image_size=portrait_3_4`
  }));
};

const adultModels = generateModels('adult', 25);


// styleSets 初始为空数组，由API动态填充
const styleSets: Record<string, any[]> = {
  daily: [],
  magazine: [],
  sport: [],
};

// 风格key到后端style值的映射
const styleKeyToValue: Record<string, number> = {
  daily: 1,
  magazine: 2,
  sport: 3
};


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
  const hasCalledSystemModelsAPIRef = useRef(false);
  const hasCalledMyModelsAPIRef = useRef(false);
  const hasMounted = useRef(false);
  
  useEffect(() => {
    hasCalledSystemModelsAPIRef.current = hasCalledSystemModelsAPI;
  }, [hasCalledSystemModelsAPI]);
  
  useEffect(() => {
    hasCalledMyModelsAPIRef.current = hasCalledMyModelsAPI;
  }, [hasCalledMyModelsAPI]);
  
  const [selectedModel, setSelectedModel] = useState<number>(1);
  const [styleCategory, setStyleCategory] = useState('daily');
  const [selectedStyle, setSelectedStyle] = useState<number>(1);
  const [ratio, setRatio] = useState('1:1');
  const [quantity, setQuantity] = useState(1);
  
  const [pendingModelId, setPendingModelId] = useState<number | null>(null);
  const [pendingStyleCategory, setPendingStyleCategory] = useState<string | null>(null);
  const [pendingStyleId, setPendingStyleId] = useState<number | null>(null);
  const [pendingRatio, setPendingRatio] = useState<string | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState<number | null>(null);
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
  const styleModalScrollRef = useRef<HTMLDivElement>(null);
  const [styleModalPreviewPos, setStyleModalPreviewPos] = useState({ top: 0, arrowTop: 0 });
  const [styleMainHoveredId, setStyleMainHoveredId] = useState<number | null>(null);
  const [styleMainPreviewPos, setStyleMainPreviewPos] = useState({ top: 0, arrowTop: 0 });
  
  // Dynamic Model Lists
  const [currentAdultModels, setCurrentAdultModels] = useState(adultModels.slice(0, 5));
  
  const [currentDailyStyles, setCurrentDailyStyles] = useState(styleSets.daily.slice(0, 5));
  const [currentMagazineStyles, setCurrentMagazineStyles] = useState(styleSets.magazine.slice(0, 5));
  const [currentSportStyles, setCurrentSportStyles] = useState(styleSets.sport.slice(0, 5));

  // 场景图"更多"弹出层的完整数据
  const [allDailyStyles, setAllDailyStyles] = useState<any[]>([]);
  const [allMagazineStyles, setAllMagazineStyles] = useState<any[]>([]);
  const [allSportStyles, setAllSportStyles] = useState<any[]>([]);

  // 瀑布流分页状态
  const [sceneModalPage, setSceneModalPage] = useState(1);
  const [sceneModalHasMore, setSceneModalHasMore] = useState(true);
  const [sceneModalLoading, setSceneModalLoading] = useState(false);

  const [showValidationOverlay, setShowValidationOverlay] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

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
    if (isLoggedIn && wasLoggedIn.current === false && modelType === 'my' && !hasCalledMyModelsAPI && !hasMounted.current) {
      fetchMyModels(1, 12);
      hasMounted.current = true;
    }
    wasLoggedIn.current = isLoggedIn;
  }, [isLoggedIn, modelType]);

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

        if (!isVisible) {
          // Model is not in visible models, replace the first one
          // Create new visible models array with the selected model at index 0
          // Keep the existing visible models (excluding the first one) to maintain consistency
          const newVisibleModels = [model, ...visibleMyModels.slice(1)];
          setVisibleMyModels(newVisibleModels);
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

        if (!isVisible) {
          // Model is not in visible models, replace the first one
          // Create new visible models array with the selected model at index 0
          // Keep the existing visible models (excluding the first one) to maintain consistency
          const newVisibleModels = [model, ...visibleSystemModels.slice(1)];
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
    
    // 确保显示正确数量的我的模特图片
    if (allMyModels.length > 0) {
      setVisibleMyModels(allMyModels.slice(0, 4));
    }
    // API调用由useEffect处理，避免重复调用
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

  // 检查是否需要特殊渲染（当选中的模型不在前5张可见模型中时）
  const needsSpecialRender = useMemo(() => {
    if (!selectedModel || modelType === 'adult') return false;
    
    // 首先检查selectedModel是否存在于所有模型中
    const allModels = modelType === 'system' ? systemModels : allMyModels;
    const modelExists = allModels.find(m => m.id === selectedModel);
    if (!modelExists) return false;
    
    // 然后检查是否在可见模型中
    const currentVisibleModels = modelType === 'system' ? visibleSystemModels : visibleMyModels;
    return !currentVisibleModels.find(m => m.id === selectedModel);
  }, [selectedModel, modelType, visibleSystemModels, visibleMyModels, systemModels, allMyModels]);

  // 获取特殊渲染的模型数据
  const specialRenderModel = useMemo(() => {
    if (!needsSpecialRender || !selectedModel) return null;
    
    const allModels = modelType === 'system' ? systemModels : allMyModels;
    return allModels.find(m => m.id === selectedModel);
  }, [needsSpecialRender, selectedModel, modelType, systemModels, allMyModels]);
  
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

  // modalStyles: 直接使用动态加载的数据
  const modalStyles =
    styleCategory === 'daily' ? allDailyStyles
    : styleCategory === 'magazine' ? allMagazineStyles
    : allSportStyles;

  const setModalStyles =
    styleCategory === 'daily' ? setAllDailyStyles
    : styleCategory === 'magazine' ? setAllMagazineStyles
    : setAllSportStyles;

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
        return '随机人像';
      case 'system':
        return '系统人像';
      case 'my':
        return '我的人像';
      default:
        return '姿势';
    }
  };

  // 获取场景图片（用于主区域显示，只获取前5张）
  const fetchScenesByStyle = async (styleKey: string) => {
    try {
      const styleValue = styleKeyToValue[styleKey];
      const res = await getPublicScenes({ page: 1, page_size: 5, style: styleValue });

      if (res?.items) {
        const formattedItems = res.items.map((item: any) => ({
          id: item.id,
          title: item.name,
          image: item.image_url
        }));

        // 更新主区域显示的5张图片
        if (styleKey === 'daily') {
          setCurrentDailyStyles(formattedItems);
        } else if (styleKey === 'magazine') {
          setCurrentMagazineStyles(formattedItems);
        } else if (styleKey === 'sport') {
          setCurrentSportStyles(formattedItems);
        }
      }
    } catch (error) {
      console.error('获取场景图片失败:', error);
    }
  };

  // 获取更多场景图片（用于弹出层，支持瀑布流）
  const fetchModalScenes = async (styleKey: string, page: number, append: boolean = false) => {
    if (sceneModalLoading) return;
    if (append && !sceneModalHasMore) return;

    setSceneModalLoading(true);
    try {
      const styleValue = styleKeyToValue[styleKey];
      const pageSize = 12;
      const res = await getPublicScenes({ page, page_size: pageSize, style: styleValue });

      if (res?.items) {
        const formattedItems = res.items.map((item: any) => ({
          id: item.id,
          title: item.name,
          image: item.image_url
        }));

        const setter =
          styleKey === 'daily' ? setAllDailyStyles
          : styleKey === 'magazine' ? setAllMagazineStyles
          : setAllSportStyles;

        if (append) {
          setter((prev: any[]) => [...prev, ...formattedItems]);
        } else {
          setter(formattedItems);
        }

        setSceneModalHasMore(res.items.length >= pageSize);
        setSceneModalPage(page);
      }
    } catch (error) {
      console.error('加载更多场景失败:', error);
    } finally {
      setSceneModalLoading(false);
    }
  };

  // 滚动事件处理（瀑布流）
  const handleSceneModalScroll = useCallback(() => {
    const container = styleModalScrollRef.current;
    if (!container || sceneModalLoading || !sceneModalHasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      fetchModalScenes(styleCategory, sceneModalPage + 1, true);
    }
  }, [styleCategory, sceneModalPage, sceneModalHasMore, sceneModalLoading]);

  // 页面初始化时加载默认风格（日常生活风）的主区域图片
  useEffect(() => {
    fetchScenesByStyle('daily');
  }, []);

  // 滚动监听 - 瀑布流加载
  useEffect(() => {
    const container = styleModalScrollRef.current;
    if (container && showStyleModal) {
      container.addEventListener('scroll', handleSceneModalScroll);
      return () => container.removeEventListener('scroll', handleSceneModalScroll);
    }
  }, [showStyleModal, handleSceneModalScroll]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setShowGenerateSuccess(false);
    
    let isValid = true;
    let message = '';

    if (version === 'common') {
      if (!uploadedImage) {
        isValid = false;
        message = '请先上传服饰实拍图';
      }
    } else {
      if (outfitType === 'single') {
        if (!singleOutfitImage) {
          isValid = false;
          message = '请先上传服饰实拍图';
        }
      } else {
        if (!topOutfitImage || !bottomOutfitImage) {
          isValid = false;
          message = '请先上传上装和下装图片';
        }
      }
    }

    if (!isValid) {
      setValidationMessage(message);
      setShowValidationOverlay(true);

      setTimeout(() => {
        setShowValidationOverlay(false);
      }, 2000);

      setIsGenerating(false);
      return;
    }

    try {
      let requestData: any = {
        version,
        outfit_type: outfitType,
        model_type: modelType,
        selected_model: Number(selectedModel) || 1,
        style_category: styleCategory,
        selected_style: Number(selectedStyle) || 1,
        custom_scene_text: customSceneText || '',
        ratio,
        quantity: Number(quantity) > 0 ? Number(quantity) : 1,
      };

      let selectedModelUrl = '';
      if (modelType === 'adult') {
        const model = adultModels.find(m => m.id === selectedModel);
        selectedModelUrl = model?.image || '';
      } else if (modelType === 'system') {
        const model = systemModels.find(m => m.id === selectedModel);
        selectedModelUrl = model?.avatar || (model?.images && model.images[0]?.file_path) || '';
      } else {
        const model = allMyModels.find(m => m.id === selectedModel);
        selectedModelUrl = model?.avatar || (model?.images && model.images[0]?.file_path) || '';
      }
      if (selectedModelUrl) {
        requestData.selected_model_url = selectedModelUrl;
      }

      const styleObj = styleSets[styleCategory].find(s => s.id === selectedStyle);
      if (styleObj?.image) {
        requestData.select_style_url = styleObj.image;
      }

      if (version === 'common') {
        if (uploadedImage) {
          requestData.uploaded_image = uploadedImage;
        }
      } else if (version === 'pro') {
        if (outfitType === 'single') {
          if (singleOutfitImage) {
            requestData.single_outfit_image = singleOutfitImage;
          }
          if (singleOutfitBackImage) {
            requestData.single_outfit_back_image = singleOutfitBackImage;
          }
        } else if (outfitType === 'match') {
          if (topOutfitImage) {
            requestData.top_outfit_image = topOutfitImage;
          }
          if (topOutfitBackImage) {
            requestData.top_outfit_back_image = topOutfitBackImage;
          }
          if (bottomOutfitImage) {
            requestData.bottom_outfit_image = bottomOutfitImage;
          }
          if (bottomOutfitBackImage) {
            requestData.bottom_outfit_back_image = bottomOutfitBackImage;
          }
        }
      }

      console.log('Sending request data:', requestData);
      const response = await modelImageGeneration(requestData);
      console.log('API Response:', response);
      console.log('Response data:', response.data);
      console.log('Response images:', response.data?.images);
      console.log('Response task_id:', response.data?.task_id);
      
      if (response && response.data && response.data.images) {
        onGeneratedData(response.data.images, response.data.task_id || '', response.data);
        console.log('Generated data passed to parent:', response.data.images, response.data.task_id || '');
      } else if (response && response.images) {
        onGeneratedData(response.images, response.task_id || '', response);
        console.log('Generated data passed to parent (alternative):', response.images, response.task_id || '');
      } else {
        console.warn('No images found in response');
      }
      
      setShowGenerateSuccess(true);
      
      setTimeout(() => {
        setIsGenerating(false);
      }, 100);
      
      if (refreshImageRecordsRef && refreshImageRecordsRef.current) {
        refreshImageRecordsRef.current();
      }
    } catch (error) {
      console.error('Failed to generate model image:', error);
      setIsGenerating(false);
    }
  };

  const handleContinueCreating = () => {
    setVersion('common');
    setOutfitType('single');
    setModelType('adult');
    setSelectedModel(1);
    setStyleCategory('daily');
    setSelectedStyle(1);
    setRatio('1:1');
    setQuantity(1);
    setUploadedImage(null);
    setSingleOutfitImage(null);
    setSingleOutfitBackImage(null);
    setTopOutfitImage(null);
    setTopOutfitBackImage(null);
    setBottomOutfitImage(null);
    setBottomOutfitBackImage(null);
    setCustomSceneText('');
    setShowCustomSceneInput(false);
    setShowGenerateSuccess(false);
    setIsGenerating(false);
  };

  const handleLoadFromRecord = useCallback((record: any) => {
    console.log('=== handleLoadFromRecord 开始 ===');
    console.log('完整的record对象:', record);
    console.log('record.params:', record.params);
    console.log('record.params 的所有键:', record.params ? Object.keys(record.params) : 'params为空');
    console.log('record.params 的完整内容:', JSON.stringify(record.params, null, 2));
    
    const params = record.params;
    console.log('params参数:', params);
    
    if (!params) {
      console.log('params为空，直接返回');
      return;
    }

    console.log('version:', params.version);
    console.log('outfit_type:', params.outfit_type);
    console.log('model_type:', params.model_type);
    console.log('selected_model:', params.selected_model);
    console.log('style_category:', params.style_category);
    console.log('selected_style:', params.selected_style);
    console.log('custom_scene_text:', params.custom_scene_text);
    console.log('ratio:', params.ratio);
    console.log('quantity:', params.quantity);

    setPendingModelId(params.selected_model || 1);
    setPendingStyleCategory(params.style_category || 'daily');
    setPendingStyleId(params.selected_style || 1);
    setPendingRatio(params.ratio || '1:1');
    setPendingQuantity(params.quantity || 1);

    if (params.custom_scene_text && params.custom_scene_text.trim()) {
      console.log('检测到自定义场景，清除风格选择');
      setPendingStyleId(null);
    }

    if (params.model_type === 'system') {
      console.log('触发系统模特按钮点击事件');
      setModelType('system');
      if (!hasCalledSystemModelsAPIRef.current) {
        console.log('系统模特数据未加载过，调用API获取数据');
        fetchSystemModels(1, 12);
      }
    } else if (params.model_type === 'my') {
      console.log('触发我的模特按钮点击事件');
      setModelType('my');
      if (!isLoggedIn) {
        openAuthModal();
        return;
      }
      if (!hasCalledMyModelsAPIRef.current) {
        console.log('我的模特数据未加载过，调用API获取数据');
        fetchMyModels(1, 12);
      }
    } else {
      console.log('设置模特类型为adult');
      setModelType('adult');
    }

    if (params.version === 'common') {
      console.log('处理通用版图片 - 触发通用版按钮点击事件');
      setVersion('common');
      console.log('uploaded_image:', params.uploaded_image);
      console.log('uploaded_image类型:', typeof params.uploaded_image);
      setUploadedImage(params.uploaded_image || null);
    } else if (params.version === 'pro') {
      console.log('处理专业版图片 - 触发专业版按钮点击事件');
      setVersion('pro');
      console.log('outfit_type:', params.outfit_type);
      
      if (params.outfit_type === 'single') {
        console.log('处理单件服饰 - 触发单件上身按钮点击事件');
        setOutfitType('single');
        console.log('single_outfit_image:', params.single_outfit_image);
        console.log('single_outfit_back_image:', params.single_outfit_back_image);
        setSingleOutfitImage(params.single_outfit_image || null);
        setSingleOutfitBackImage(params.single_outfit_back_image || null);
      } else if (params.outfit_type === 'match') {
        console.log('处理搭配服饰 - 触发上下装搭配按钮点击事件');
        setOutfitType('match');
        console.log('top_outfit_image:', params.top_outfit_image);
        console.log('top_outfit_back_image:', params.top_outfit_back_image);
        console.log('bottom_outfit_image:', params.bottom_outfit_image);
        console.log('bottom_outfit_back_image:', params.bottom_outfit_back_image);
        setTopOutfitImage(params.top_outfit_image || null);
        setTopOutfitBackImage(params.top_outfit_back_image || null);
        setBottomOutfitImage(params.bottom_outfit_image || null);
        setBottomOutfitBackImage(params.bottom_outfit_back_image || null);
      }
    } else {
      console.log('未知的version:', params.version);
    }

    if (params.custom_scene_text && params.custom_scene_text.trim()) {
      console.log('设置自定义场景:', params.custom_scene_text);
      setCustomSceneText(params.custom_scene_text);
      setShowCustomSceneInput(true);
      setSelectedStyle(null);
    } else {
      setCustomSceneText('');
      setShowCustomSceneInput(false);
    }
    
    console.log('=== handleLoadFromRecord 结束 ===');
  }, [isLoggedIn]);

  useEffect(() => {
    onResetRef.current = handleContinueCreating;
  }, [onResetRef]);

  useEffect(() => {
    if (onLoadFromRecordRef) {
      onLoadFromRecordRef.current = handleLoadFromRecord;
    }
  }, [onLoadFromRecordRef]);

  // 统一处理所有模型类型的 pending 状态
  useEffect(() => {
    console.log('useEffect触发 - pendingModelId:', pendingModelId, 'modelType:', modelType);
    if (pendingModelId !== null) {
      // 处理所有模型类型，包括 adult、system 和 my
      if (modelType === 'system' || modelType === 'my') {
        const models = modelType === 'system' ? systemModels : allMyModels;
        if (models.length > 0) {
          console.log('设置待设置的模型ID:', pendingModelId, 'type:', typeof pendingModelId);
          setSelectedModel(pendingModelId);
          console.log('setSelectedModel已调用');
          setStyleCategory(pendingStyleCategory || 'daily');
          if (pendingStyleId !== null) {
            setSelectedStyle(pendingStyleId);
          }
          setRatio(pendingRatio || '1:1');
          setQuantity(pendingQuantity || 1);
          
          // 确保显示正确数量的模特图片
          if (modelType === 'system') {
            // 系统模特：显示5张图片
            setVisibleSystemModels(models.slice(0, 5));
          } else if (modelType === 'my') {
            // 我的模特：显示4张图片
            setVisibleMyModels(models.slice(0, 4));
          }
          
          // 重置 pending 状态
          setPendingModelId(null);
          setPendingStyleCategory(null);
          setPendingStyleId(null);
          setPendingRatio(null);
          setPendingQuantity(null);
        }
      } else if (modelType === 'adult') {
        // 直接处理成人模特类型，不需要等待 API 返回
        console.log('处理成人模特类型');
        setSelectedModel(pendingModelId);
        setStyleCategory(pendingStyleCategory || 'daily');
        if (pendingStyleId !== null) {
          setSelectedStyle(pendingStyleId);
        }
        setRatio(pendingRatio || '1:1');
        setQuantity(pendingQuantity || 1);
        // 重置 pending 状态
        setPendingModelId(null);
        setPendingStyleCategory(null);
        setPendingStyleId(null);
        setPendingRatio(null);
        setPendingQuantity(null);
      }
    }
  }, [pendingModelId, modelType, systemModels, allMyModels, pendingStyleCategory, pendingStyleId, pendingRatio, pendingQuantity]);

  

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
                随机人像
              </button>
              <button
                onClick={() => {
                  setModelType('system');
                  // Only call API if:
                  // 1. We haven't called it before, OR
                  // 2. We called it before but got 0 models
                  if (!hasCalledSystemModelsAPI || systemModels.length === 0) {
                    fetchSystemModels(1, 12);
                  } else {
                    // 确保显示正确数量的系统模特图片
                    setVisibleSystemModels(systemModels.slice(0, 5));
                  }
                }}
                className={clsx(
                  "flex-1 py-2.5 rounded-full text-sm font-medium border",
                  modelType === 'system' 
                    ? "border-[#3713ec] text-[#3713ec] bg-[#3713ec]/10" 
                    : "bg-slate-100 text-[#64748B] hover:bg-gray-100"
                )}
              >
                系统人像
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
                  我的人像
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
              {/* 特殊情况：选中的模型不在前5张中，将其显示在第一个位置 */}
              {needsSpecialRender && specialRenderModel && (
                <div 
                  key={`special-${specialRenderModel.id}`}
                  id={`main-model-item-special`}
                  onClick={() => {
                    if (modelType === 'my' && !isLoggedIn) {
                      return;
                    }
                    setSelectedModel(specialRenderModel.id);
                  }}
                  onMouseEnter={() => handleMainHover(null as any, specialRenderModel.id)}
                  onMouseLeave={() => handleMainHover(null as any, null)}
                  className={clsx(
                    "aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all relative",
                    "border-[#3713ec]"
                  )}
                  data-model-id={specialRenderModel.id}
                  data-selected={true}
                >
                  <img 
                    src={(specialRenderModel as any).avatar || ((specialRenderModel as any).images && (specialRenderModel as any).images[0]?.file_path) || (specialRenderModel as any).image} 
                    alt="Model" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
              
              {/* 正常渲染其他模型，但特殊情况时跳过第一个 */}
              {displayedModels.map((model, index) => {
                // 特殊情况时，跳过第一个模型（位置被特殊模型占据）
                if (needsSpecialRender && index === 0) {
                  return null;
                }
                
                return (
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
                      selectedModel === model.id && !needsSpecialRender ? "border-[#3713ec]" : "border-transparent",
                      "hover:border-[#3713ec]"
                    )}
                    data-model-id={model.id}
                    data-selected={selectedModel === model.id && !needsSpecialRender}
                  >
                    <img src={(model as any).avatar || ((model as any).images && (model as any).images[0]?.file_path) || (model as any).image} alt="Model" className="w-full h-full object-cover" />
                  </div>
                );
              })}
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
                  onClick={() => {
                    setStyleCategory(item.key);
                    setSelectedStyle(1);
                    // 只在对应数组为空时才调用API（第一次点击）
                    const currentData =
                      item.key === 'daily' ? currentDailyStyles
                      : item.key === 'magazine' ? currentMagazineStyles
                      : currentSportStyles;
                    if (currentData.length === 0) {
                      fetchScenesByStyle(item.key);
                    }
                    // 重置瀑布流状态
                    setSceneModalPage(1);
                    setSceneModalHasMore(true);
                  }}
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
                onClick={() => {
                  setShowStyleModal(true);
                  setStyleHoveredId(selectedStyle);
                  // 打开弹出层时加载第一页数据
                  setSceneModalPage(1);
                  setSceneModalHasMore(true);
                  fetchModalScenes(styleCategory, 1, false);
                }}
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
          {isGenerating ? (
            <button disabled className="w-full bg-gradient-to-r from-[#6C5CFF] to-[#5a4cf0] text-white py-3 rounded-full text-base font-bold shadow-lg shadow-brand/30 hover:shadow-brand/40 transition-all flex items-center justify-center gap-2 opacity-70 cursor-not-allowed">
              <span>生成中...</span>
              <div className="flex items-center bg-white/20 rounded-full px-2 py-0.5 text-xs">
                <span>30</span>
                <img src="/yidou.svg" alt="icon" className="w-3 h-3 ml-1" />
              </div>
            </button>
          ) : showGenerateSuccess ? (
            <div className="flex gap-3">
              <button onClick={handleGenerate} className="flex-1 bg-slate-100 dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark text-base font-semibold py-2.5 rounded-full flex items-center justify-center gap-2">
                <span>重新生成</span>
                <span className="flex items-center gap-1 bg-black/5 dark:bg-white/10 rounded-full px-2 py-0.5 text-sm font-normal">
                  <span>30</span>
                  <span className="text-base">🪙</span>
                </span>
              </button>
              <button onClick={handleContinueCreating} className="flex-1 text-white text-base font-semibold py-2.5 rounded-full flex items-center justify-center shadow-lg shadow-primary/30" style={{ backgroundColor: '#3713ec' }}>
                <span>继续创建</span>
              </button>
            </div>
          ) : (
            <button onClick={handleGenerate} className="w-full bg-gradient-to-r from-[#6C5CFF] to-[#5a4cf0] text-white py-3 rounded-full text-base font-bold shadow-lg shadow-brand/30 hover:shadow-brand/40 transition-all flex items-center justify-center gap-2">
              <span>立即生成</span>
              <div className="flex items-center bg-white/20 rounded-full px-2 py-0.5 text-xs">
                <span>30</span>
                <img src="/yidou.svg" alt="icon" className="w-3 h-3 ml-1" />
              </div>
            </button>
          )}
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
                      data-model-id={model.id}
                      data-selected={selectedModel === model.id}
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
            <div ref={styleModalScrollRef} className="flex-1 overflow-y-auto p-4 scrollbar-thin-dark style-modal-content">
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

                      // 使用数组索引判断，而不是id
                      const targetIndex = modalStyles.findIndex(s => s.id === style.id);

                      if (targetIndex >= 5) {
                        // 如果选择的是第6张以后的，将其放到首位
                        const newList = [...currentStyles];
                        newList[0] = target;
                        setCurrentStyles(newList);
                      } else {
                        // 如果选择的是前5张，恢复默认排序
                        const defaultFirst = modalStyles[0];
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
              {/* 加载状态 */}
              {sceneModalLoading && (
                <div className="text-center py-4 text-gray-500 text-sm">加载中...</div>
              )}
              {!sceneModalHasMore && modalStyles.length > 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">没有更多了</div>
              )}
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

      {showValidationOverlay && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[200] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl px-6 py-4 shadow-2xl animate-in zoom-in duration-200 flex items-center gap-3">
            <X className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-gray-800 font-medium text-base">{validationMessage}</p>
          </div>
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
