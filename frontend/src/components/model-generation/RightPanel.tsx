import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ImagePreviewModal } from '../ImagePreviewModal';
import { FeedbackModal, FeedbackInfoModal } from '../FeedbackModal';

const styles = `
  @keyframes sparkle {
    0%, 100% { opacity: 0.8; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
  }
  .animate-sparkle {
    animation: sparkle 2s infinite ease-in-out;
  }
  .animate-sparkle-delayed {
    animation: sparkle 2s infinite ease-in-out 1s;
  }
`;

interface RightPanelProps {
  isGenerating: boolean;
  generatedImages?: string[];
  taskId?: string;
  currentRecord?: any;
  findRecordRef?: React.MutableRefObject<((taskId: string) => any) | null>;
  onFeedback?: (feedback: string, feedbackId: number) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ isGenerating, generatedImages, taskId, currentRecord, findRecordRef, onFeedback }) => {
  const [downloading, setDownloading] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [actionsHeight, setActionsHeight] = useState(0);
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null);
  const [hoveredMenuIndex, setHoveredMenuIndex] = useState<number | null>(null);

  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const record = useMemo(() => {
    if (currentRecord) {
      return currentRecord;
    }
    if (taskId && findRecordRef?.current) {
      return findRecordRef.current(taskId);
    }
    return null;
  }, [currentRecord, taskId, findRecordRef]);



  const handleDownloadAll = async () => {
    if (!generatedImages || generatedImages.length === 0) return;
    
    setDownloading(true);
    try {
      const zip = new JSZip();
      
      const downloadPromises = generatedImages.map(async (imageUrl, index) => {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const fileName = `generated_image_${index + 1}.jpg`;
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to download image ${index + 1}:`, error);
        }
      });
      
      await Promise.all(downloadPromises);
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `generated_images_${taskId || Date.now()}.zip`);
    } catch (error) {
      console.error('Failed to create zip file:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSingle = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1] || `generated_image_${index + 1}.jpg`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error(`Failed to download image ${index + 1}:`, error);
    }
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setPreviewModalVisible(true);
  };

  const handleCloseModal = () => {
    setPreviewModalVisible(false);
  };

  const handlePreviewModalFeedback = (feedback: string, feedbackId: number) => {
    if (onFeedback) {
      onFeedback(feedback, feedbackId);
    }
  };

  const checkOverflow = useRef<() => void>();

  useEffect(() => {
    checkOverflow.current = () => {
      // 获取当前可视区域的高度（即面板高度）
      const panelHeight = panelRef.current?.clientHeight || 0;
      // 获取内容区域的实际高度
      const contentHeight = contentRef.current?.scrollHeight || 0;
      // 获取按钮区域高度用于计算padding
      const nextActionsHeight = actionsRef.current?.offsetHeight || 0;

      setActionsHeight(nextActionsHeight);
      
      // 这里的逻辑对应需求：
      // 1) 当图片区域的内容高度超过当前可视屏幕高度时 -> isOverflowing = true
      // 2) 当图片区域的内容高度未超过当前可视屏幕高度时 -> isOverflowing = false
      // 注意：这里比较的是 contentHeight + nextActionsHeight，即总内容高度是否超过面板高度
      // 如果超过，说明如果不固定按钮，按钮会被挤出屏幕外
      setIsOverflowing(panelHeight > 0 && contentHeight + nextActionsHeight > panelHeight);
    };
  });

  useEffect(() => {
    if (!generatedImages || generatedImages.length === 0) return;

    // 立即执行一次检查
    if (checkOverflow.current) checkOverflow.current();

    const resizeObserver = new ResizeObserver(() => {
      if (checkOverflow.current) checkOverflow.current();
    });

    if (panelRef.current) resizeObserver.observe(panelRef.current);
    if (contentRef.current) resizeObserver.observe(contentRef.current);
    if (actionsRef.current) resizeObserver.observe(actionsRef.current);

    const handleResize = () => {
      if (checkOverflow.current) checkOverflow.current();
    };

    window.addEventListener('resize', handleResize);
    
    // 延迟检查，确保DOM渲染完成
    const timer = setTimeout(() => {
      if (checkOverflow.current) checkOverflow.current();
    }, 100);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [generatedImages?.length, isGenerating]);

  return (
    <>
      <style>{styles}</style>
      <div ref={panelRef} className="flex-1 min-w-[360px] h-full flex flex-col relative overflow-hidden">
        {isGenerating ? (
          <div className="flex-1 bg-[#F7F8FC] p-6 flex items-center justify-center overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-sm p-16 flex flex-col items-center justify-center w-[512px] h-[512px] text-center">
              <div className="relative w-40 h-40 mx-auto mb-8">
                <svg className="absolute top-0 left-0 w-full h-full text-gray-200" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46"></circle>
                </svg>
                <svg className="absolute top-0 left-0 w-full h-full text-[#3713EC]" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" style={{ strokeDasharray: 289, strokeDashoffset: 216 }} viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" transform="rotate(-180 50 50)"></circle>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <svg className="w-12 h-12 text-[#3713EC] animate-sparkle" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"></path>
                    </svg>
                    <svg className="absolute -top-3 -right-4 w-6 h-6 text-[#3713EC]/80 animate-sparkle-delayed" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"></path>
                    </svg>
                    <svg className="absolute -bottom-2 -right-3 w-5 h-5 text-[#3713EC]/80 animate-sparkle" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"></path>
                    </svg>
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-800 tracking-wide">图片正在生成中，请耐心等待</h3>
            </div>
          </div>
        ) : generatedImages && generatedImages.length > 0 ? (
          <div className={`flex-1 flex flex-col relative ${isOverflowing ? 'overflow-hidden' : 'overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200'}`}>
            <div 
              ref={scrollContainerRef}
              className={`${isOverflowing ? 'flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200' : ''} pr-2`}
              style={isOverflowing ? { paddingBottom: actionsHeight + 32 } : undefined}
            >
              <div ref={contentRef} className="w-full">
                <div className="max-w-3xl mx-auto pt-4 lg:pt-8 pb-2 px-4 lg:px-8">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">生成结果</h3>
                    <p className="text-xs text-gray-500 mt-1">任务ID: {taskId || 'N/A'}</p>
                  </div>
                  <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 ${generatedImages.length === 1 ? 'w-fit mx-auto' : ''}`}>
                    <div className={`grid gap-6 ${generatedImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {generatedImages.map((imageUrl, index) => (
                        <div 
                          key={index} 
                          className="relative group cursor-pointer overflow-hidden rounded-lg" 
                          style={generatedImages.length === 1 ? { width: '300px' } : undefined}
                          onMouseEnter={() => setHoveredImageIndex(index)}
                          onMouseLeave={() => setHoveredImageIndex(null)}
                          onClick={() => handleImageClick(index)}
                        >
                          <img 
                            alt={`Result ${index + 1}`} 
                            className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-105" 
                            src={imageUrl}
                            onLoad={() => {
                              if (checkOverflow.current) checkOverflow.current();
                            }}
                          />
                          <div className={`absolute bottom-3 left-0 right-0 transition-all duration-300 translate-y-2 z-10 flex justify-center items-center pointer-events-none ${hoveredImageIndex === index ? 'opacity-100 translate-y-0' : 'opacity-0'}`}>
                            <div className="flex items-center space-x-3 pointer-events-auto">
                              <div 
                                className="relative group/menu"
                                onMouseEnter={() => setHoveredMenuIndex(index)}
                                onMouseLeave={() => setHoveredMenuIndex(null)}
                              >
                                <button className="bg-white/90 hover:bg-white backdrop-blur-md rounded-full px-4 py-2 text-gray-700 shadow-sm text-xs font-medium transition-colors focus:outline-none">
                                  图片处理
                                </button>
                                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden p-1 transition-all duration-200 ${hoveredMenuIndex === index ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                                  <button className="w-full flex items-center px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors text-left">
                                    <span className="material-symbols-outlined text-[16px] mr-2 text-gray-500 dark:text-gray-400">accessibility_new</span>
                                    姿势裂变
                                  </button>
                                  <button className="w-full flex items-center px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors text-left">
                                    <span className="material-symbols-outlined text-[16px] mr-2 text-gray-500 dark:text-gray-400">photo_size_select_large</span>
                                    扩图
                                  </button>
                                  <button className="w-full flex items-center px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors text-left">
                                    <span className="material-symbols-outlined text-[16px] mr-2 text-gray-500 dark:text-gray-400">hd</span>
                                    变清晰
                                  </button>
                                  <button className="w-full flex items-center px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors text-left">
                                    <span className="material-symbols-outlined text-[16px] mr-2 text-gray-500 dark:text-gray-400">face_retouching_natural</span>
                                    模特换脸
                                  </button>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleDownloadSingle(imageUrl, index)}
                                className="bg-white/90 hover:bg-white backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow-sm transition-colors" 
                                title="下载"
                              >
                                <span className="material-icons-outlined text-[18px]">download</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              ref={actionsRef}
              className={`flex-shrink-0 px-4 lg:px-8 flex justify-center ${isOverflowing ? 'absolute bottom-8 left-0 right-0 z-50 pointer-events-none' : 'pt-1 pb-8'}`}
            >
              <div className={`flex items-center w-[360px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-2 rounded-full shadow-xl border border-gray-200/50 dark:border-gray-700/50 pointer-events-auto transition-transform hover:-translate-y-1 duration-300`}>
                <div className="flex-[1.6] flex justify-center">
                  <button 
                    onClick={handleDownloadAll}
                    disabled={downloading}
                    className="bg-[#3713EC] text-white font-semibold py-3 px-8 rounded-full shadow-lg shadow-[#3713EC]/20 hover:bg-[#3713EC]/90 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <span className="material-icons-outlined">download</span>
                    <span>{downloading ? '下载中...' : '下载全部内容'}</span>
                  </button>
                </div>
                <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-2 flex-shrink-0"></div>
                <div className="flex-1 flex justify-center">
                  {record?.feedback_id ? (
                    <FeedbackInfoModal feedbackId={record.feedback_id} />
                  ) : (
                    <FeedbackModal
                      onSubmit={(feedback, feedbackId) => onFeedback && onFeedback(feedback, feedbackId)}
                      buttonIcon="thumb_down"
                      buttonClassName="flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 whitespace-nowrap"
                      originalImageRecordId={record?.id || taskId}
                      modelId={record?.model_id}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
      ) : (
        <div className="max-w-[500px] mx-auto space-y-6 pb-6">
          <h2 className="text-lg font-bold text-gray-800 text-center mb-6">实拍图示例</h2>

          {/* Correct Examples */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-[#56C271] font-medium">
              <CheckCircle2 className="w-5 h-5" />
              <span>正确示例</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={`https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=fashion%20model%20professional%20photo%20clean%20background%20full%20body%20shot%20pose%20${i}&image_size=portrait_4_3`}
                    alt="Correct example"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Incorrect Examples */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-[#FF5A5A] font-medium">
              <XCircle className="w-5 h-5" />
              <span>错误示例</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={`https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=bad%20quality%20blurry%20fashion%20photo%20bad%20lighting%20amateur%20${i}&image_size=portrait_4_3`}
                    alt="Incorrect example"
                    className="w-full h-full object-cover opacity-80"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-[#FFF6E6] rounded-xl p-5 border border-[#FFE0B2]">
            <div className="flex items-center gap-2 mb-3 text-[#FFA62B] font-bold">
              <AlertTriangle className="w-5 h-5" />
              <span>温馨提示</span>
            </div>
            <ol className="list-decimal list-outside ml-4 space-y-2 text-xs text-gray-600 leading-relaxed">
              <li>请上传清晰的模特照片，构图居中，平整、干净，光线良好</li>
              <li>图片中只可展示单件服装，不可叠加其他服装一起拍摄</li>
              <li>服装在图片中的占比尽可能大</li>
              <li>建议选择和上传的服饰同品类商品的模特参考图</li>
            </ol>
          </div>
        </div>
      )}
      <ImagePreviewModal
        visible={previewModalVisible}
        recordId={record?.id || null}
        initialImageIndex={selectedImageIndex}
        onClose={handleCloseModal}
        onFeedback={handlePreviewModalFeedback}
      />
    </div>
    </>
  );
};
