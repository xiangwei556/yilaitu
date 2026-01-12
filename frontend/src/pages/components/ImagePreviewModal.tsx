import React, { useState, useEffect } from 'react';
import request from '../../utils/request';
import { FeedbackModal, FeedbackInfoModal } from './FeedbackModal';

interface Record {
  id: number;
  params?: any;
  images: any[];
  status: string;
  feedback_id?: number;
  model_id?: number;
}

interface ImagePreviewModalProps {
  visible: boolean;
  recordId: number | null;
  initialImageIndex?: number;
  onClose: () => void;
  onFeedback?: (feedback: string, feedbackId: number) => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ 
  visible, 
  recordId, 
  initialImageIndex = 0,
  onClose,
  onFeedback
}) => {
  const [record, setRecord] = useState<Record | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState('');
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (visible && recordId) {
      fetchRecordData(recordId);
    } else {
      setRecord(null);
      setPreviewImage('');
      setOriginalImages([]);
    }
  }, [visible, recordId]);

  const fetchRecordData = async (id: number) => {
    setLoading(true);
    try {
      const data = await request.get(`/original_image_record/${id}`);
      setRecord(data);
      
      setSelectedImageIndex(initialImageIndex);
      if (data.images && data.images[initialImageIndex]) {
        const img = data.images[initialImageIndex];
        setPreviewImage(img.file_path || img.url || img);
      }
      
      const images: string[] = [];
      if (data.params) {
        if (data.params.version === 'common') {
          if (data.params.uploaded_image) {
            images.push(data.params.uploaded_image);
          }
        } else if (data.params.version === 'pro') {
          if (data.params.outfit_type === 'single') {
            if (data.params.single_outfit_image) {
              images.push(data.params.single_outfit_image);
            }
            if (data.params.single_outfit_back_image) {
              images.push(data.params.single_outfit_back_image);
            }
          } else if (data.params.outfit_type === 'match') {
            if (data.params.top_outfit_image) {
              images.push(data.params.top_outfit_image);
            }
            if (data.params.top_outfit_back_image) {
              images.push(data.params.top_outfit_back_image);
            }
            if (data.params.bottom_outfit_image) {
              images.push(data.params.bottom_outfit_image);
            }
            if (data.params.bottom_outfit_back_image) {
              images.push(data.params.bottom_outfit_back_image);
            }
          }
        }
      }
      setOriginalImages(images);
    } catch (error) {
      console.error('Failed to fetch record:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (previewImage) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        setImageDimensions(null);
      };
      img.src = previewImage;
    } else {
      setImageDimensions(null);
    }
  }, [previewImage]);

  const handleResultImageClick = (index: number) => {
    setSelectedImageIndex(index);
    if (record && record.images && record.images[index]) {
      const img = record.images[index];
      setPreviewImage(img.file_path || img.url || img);
    }
  };

  const handleDownload = async () => {
    if (!previewImage) return;
    try {
      const response = await fetch(previewImage);
      const blob = await response.blob();
      const urlParts = previewImage.split('/');
      const fileName = urlParts[urlParts.length - 1] || 'image.jpg';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleFeedbackSubmit = (feedback: string, feedbackId: number) => {
    if (onFeedback) {
      onFeedback(feedback, feedbackId);
    }
    setRecord(prev => prev ? { ...prev, feedback_id: feedbackId } : null);
  };

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 w-full max-w-[1300px] h-[85vh] rounded-2xl shadow-2xl overflow-hidden relative grid grid-cols-[1fr_1fr_120px] grid-rows-[1fr_80px]"
        onClick={e => e.stopPropagation()}
      >
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black text-gray-600 dark:text-gray-300 transition-all shadow-sm"
        >
          <span className="material-icons-outlined">close</span>
        </button>
        
        <div className="col-start-1 col-end-2 row-start-1 row-end-2 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col relative group h-full min-h-0">
          <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-white/60 dark:bg-black/40 backdrop-blur rounded-full border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">原图</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
            {originalImages.length > 0 ? (
              originalImages.length === 1 ? (
                <div className="relative max-w-full max-h-full shadow-lg rounded-md">
                  <img alt="Original" className="max-w-full max-h-[calc(85vh-140px)] object-contain rounded-md" src={originalImages[0]} />
                </div>
              ) : originalImages.length === 2 ? (
                <div className="flex items-center justify-center gap-4 w-full max-w-[calc(85vh-140px)] aspect-square self-center">
                  {originalImages.map((img, idx) => (
                    <div key={idx} className="relative overflow-hidden rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 flex-1">
                      <img alt={`Original ${idx + 1}`} className="w-full h-full object-cover" src={img} />
                    </div>
                  ))}
                </div>
              ) : originalImages.length === 3 ? (
                <div className="flex flex-col items-center justify-center gap-4 w-full max-w-[calc(85vh-140px)] aspect-square self-center">
                  <div className="flex gap-4 w-full">
                    {originalImages.slice(0, 2).map((img, idx) => (
                      <div key={idx} className="relative overflow-hidden rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 flex-1">
                        <img alt={`Original ${idx + 1}`} className="w-full h-full object-cover" src={img} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center w-full">
                    <div className="relative overflow-hidden rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 w-1/2">
                      <img alt="Original 3" className="w-full h-full object-cover" src={originalImages[2]} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 w-full max-w-[calc(85vh-140px)] aspect-square self-center">
                  {originalImages.map((img, idx) => (
                    <div key={idx} className="relative overflow-hidden rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
                      <img alt={`Original ${idx + 1}`} className="w-full h-full object-cover" src={img} />
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="flex items-center justify-center text-gray-400 text-sm">
                暂无原图
              </div>
            )}
          </div>
        </div>

        <div className="col-start-2 col-end-3 row-start-1 row-end-2 bg-gray-100/50 dark:bg-gray-900/50 flex flex-col relative border-r border-gray-200 dark:border-gray-800 h-full min-h-0">
          <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-[#3713EC]/10 backdrop-blur rounded-full border border-[#3713EC]/20 shadow-sm flex items-center justify-center">
            <span className="text-xs font-semibold text-[#3713EC]">生成预览</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
            <div className="relative max-w-full max-h-full shadow-lg rounded-md group">
              {previewImage ? (
                <>
                  <img alt="Preview" className="max-w-full max-h-[calc(85vh-140px)] object-contain rounded-md" src={previewImage} />
                  {imageDimensions && (
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-medium px-2 py-1 rounded backdrop-blur-md">
                      {imageDimensions.width} × {imageDimensions.height}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center text-gray-400 text-sm">
                  暂无预览图片
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-start-3 col-end-4 row-start-1 row-end-2 bg-white dark:bg-gray-900 flex flex-col z-10 h-full overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">生成结果</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">{record?.images?.length || 0} 张</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar" style={{ minHeight: 0 }}>
            {record?.images && record.images.length > 0 ? (
              record.images.map((img, idx) => {
                const imageUrl = img.file_path || img.url || img;
                return (
                  <div 
                    key={idx} 
                    className={`group relative cursor-pointer ${
                      selectedImageIndex === idx ? '' : 'opacity-70 hover:opacity-100 transition-all'
                    }`}
                    onClick={() => handleResultImageClick(idx)}
                  >
                    <div className={`aspect-[3/4] rounded-lg overflow-hidden ${
                      selectedImageIndex === idx 
                        ? 'ring-2 ring-[#3713EC] ring-offset-1 ring-offset-white dark:ring-offset-gray-900 transition-all' 
                        : 'border border-gray-200 dark:border-gray-700 group-hover:border-[#3713EC]/50'
                    }`}>
                      <img alt={`Result ${idx + 1}`} className="w-full h-full object-cover" src={imageUrl} />
                    </div>
                    <div className={`absolute top-1 left-1 text-white text-[9px] font-bold px-1 py-0.5 rounded shadow-sm ${
                      selectedImageIndex === idx ? 'bg-[#3713EC]' : 'bg-black/50 backdrop-blur-sm'
                    }`}>
                      #{idx + 1}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center text-gray-400 text-xs h-20">
                暂无生成结果
              </div>
            )}
          </div>
        </div>

        <div className="col-start-1 col-end-4 row-start-2 row-end-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center px-6 z-20 h-20">
          <div className="flex-1 flex justify-start">
            {record?.feedback_id ? (
              <FeedbackInfoModal feedbackId={record.feedback_id} />
            ) : (
              <FeedbackModal
                onSubmit={handleFeedbackSubmit}
                originalImageRecordId={recordId}
                modelId={record?.model_id || undefined}
              />
            )}
          </div>

          <div className="flex items-center justify-center space-x-10">
            <button className="flex flex-col items-center justify-center space-y-1 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors group">
              <span className="material-icons-outlined text-2xl group-hover:scale-110 transition-transform">accessibility_new</span>
              <span className="text-[10px] font-medium">姿势裂变</span>
            </button>
            <button className="flex flex-col items-center justify-center space-y-1 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors group">
              <span className="material-icons-outlined text-2xl group-hover:scale-110 transition-transform">photo_size_select_large</span>
              <span className="text-[10px] font-medium">扩图</span>
            </button>
            <button className="flex flex-col items-center justify-center space-y-1 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors group">
              <span className="material-icons-outlined text-2xl group-hover:scale-110 transition-transform">hd</span>
              <span className="text-[10px] font-medium">变清晰</span>
            </button>
            <button className="flex flex-col items-center justify-center space-y-1 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors group">
              <span className="material-icons-outlined text-2xl group-hover:scale-110 transition-transform">wallpaper</span>
              <span className="text-[10px] font-medium">换场景</span>
            </button>
            <button className="flex flex-col items-center justify-center space-y-1 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors group">
              <span className="material-icons-outlined text-2xl group-hover:scale-110 transition-transform">face_retouching_natural</span>
              <span className="text-[10px] font-medium">模特换脸</span>
            </button>
          </div>

          <div className="flex-1 flex justify-end">
            <button 
              onClick={handleDownload}
              className="flex items-center space-x-2 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all shadow-md hover:shadow-lg transform active:scale-95"
            >
              <span className="material-icons-outlined text-lg">download</span>
              <span className="font-medium">下载图片</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #9ca3af;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #6b7280;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: #374151;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #6b7280;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default ImagePreviewModal;
