import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { getOriginalImageRecordsCursor, deleteOriginalImageRecord } from '../../api/originalImageRecord';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { AlertCircle, X } from 'lucide-react';
import { ImagePreviewModal } from './ImagePreviewModal';
import { FeedbackModal, FeedbackInfoModal } from './FeedbackModal';

interface Record {
  id: number;
  params?: any;
  images: any[];
  status: string;
  created_at?: string;
  task_type?: string;
  feedback_id?: number;
  model_id?: number;
}

type StatusFilter = 'all' | 'processing' | 'completed' | 'failed';

interface RecordCardProps {
  record: Record;
  onFeedback?: (recordId: number, feedback: string, feedbackId: number) => void;
  onDelete?: (recordId: number) => void;
  onDownload?: (recordId: number) => void;
  downloading?: boolean;
  onImageClick?: (recordId: number, imageIndex: number) => void;
}

const RecordCard: React.FC<RecordCardProps> = ({ record, onFeedback, onDelete, onDownload, downloading, onImageClick }) => {
  const getOriginalImages = () => {
    const params = record.params;
    if (!params) return [];
    
    const images: string[] = [];
    
    if (params.version === 'common') {
      if (params.uploaded_image) {
        images.push(params.uploaded_image);
      }
    } else if (params.version === 'pro') {
      if (params.outfit_type === 'single') {
        if (params.single_outfit_image) {
          images.push(params.single_outfit_image);
        }
        if (params.single_outfit_back_image) {
          images.push(params.single_outfit_back_image);
        }
      } else if (params.outfit_type === 'match') {
        if (params.top_outfit_image) {
          images.push(params.top_outfit_image);
        }
        if (params.top_outfit_back_image) {
          images.push(params.top_outfit_back_image);
        }
        if (params.bottom_outfit_image) {
          images.push(params.bottom_outfit_image);
        }
        if (params.bottom_outfit_back_image) {
          images.push(params.bottom_outfit_back_image);
        }
      }
    }
    
    return images;
  };

  const getTaskTypeName = () => {
    const params = record.params;
    if (!params) return '未知任务';
    
    switch (params.version) {
      case 'common':
        return '模特图生成';
      case 'pro':
        switch (params.outfit_type) {
          case 'single':
            return '模特图生成';
          case 'match':
            return '模特图生成';
          default:
            return '模特图生成';
        }
      default:
        return '模特图生成';
    }
  };

  const getStatusDisplay = () => {
    switch (record.status) {
      case 'completed':
        return (
          <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
            <span className="material-icons-outlined text-base mr-1.5">check_circle</span>
            已完成
          </div>
        );
      case 'processing':
        return (
          <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
            <svg className="animate-spin h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
            </svg>
            进行中
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center text-sm font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-1 rounded-full">
            <span className="material-icons-outlined text-base mr-1.5">error_outline</span>
            失败
          </div>
        );
      default:
        return null;
    }
  };

  const originalImages = getOriginalImages();
  const generatedImages = record.images || [];
  const isProcessing = record.status === 'processing';
  const isFailed = record.status === 'failed';

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm relative group/card">
      <input type="hidden" name={`feedback_id_${record.id}`} value={record.feedback_id || ''} />
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-800 dark:text-gray-200">{getTaskTypeName()}</span>
            <div className="h-3 w-px bg-gray-200 dark:bg-gray-700"></div>
            <span>{record.created_at ? new Date(record.created_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
          </div>
        </div>
        {getStatusDisplay()}
      </div>
      <div className="flex space-x-4">
        <div className="flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">原图</p>
          {originalImages.length > 0 ? (
            <div className="flex flex-row flex-wrap gap-2">
              {originalImages.map((img, idx) => (
                <img key={idx} alt={`Original image ${idx + 1}`} className="w-32 h-32 object-cover rounded-lg" src={img} />
              ))}
            </div>
          ) : (
            <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-xs text-gray-400">暂无原图</span>
            </div>
          )}
        </div>
        <div className="h-36 w-px bg-gray-200 dark:bg-gray-700 self-center"></div>
        <div className="flex-grow">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {isProcessing ? '生成中...' : isFailed ? '生成图 (0)' : `生成图 (${generatedImages.length})`}
          </p>
          {isProcessing ? (
            <div className="flex flex-row flex-wrap gap-4">
              <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
              <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            </div>
          ) : isFailed ? (
            <div className="flex flex-row flex-wrap gap-4">
              {generatedImages.length > 0 ? (
                generatedImages.map((img: any, idx: number) => (
                  <div key={idx} className="relative group">
                    <img alt={`Generated image ${idx + 1}`} className="w-32 h-32 object-cover rounded-lg cursor-pointer transition-transform duration-300 group-hover:scale-150 group-hover:z-10" src={img.url || img} />
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400">生成失败，无图片</div>
              )}
            </div>
          ) : (
            <div className="flex flex-row flex-wrap gap-4">
              {generatedImages.map((img: any, idx: number) => (
                <div key={idx} className="relative group">
                  <img 
                    alt={`Generated image ${idx + 1}`} 
                    className="w-32 h-32 object-cover rounded-lg cursor-pointer transition-transform duration-300 group-hover:scale-150 group-hover:z-10" 
                    src={img.url || img}
                    onClick={() => onImageClick && onImageClick(record.id, idx)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-between items-center relative">
        {record.feedback_id ? (
          <FeedbackInfoModal feedbackId={record.feedback_id} />
        ) : (
          <FeedbackModal
            onSubmit={(feedback, feedbackId) => {
              onFeedback && onFeedback(record.id, feedback, feedbackId);
            }}
            originalImageRecordId={record.id}
            modelId={record.model_id || undefined}
          />
        )}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => onDelete && onDelete(record.id)}
            className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors flex items-center space-x-1"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span>删除记录</span>
          </button>
          <button 
            onClick={() => onDownload && onDownload(record.id)}
            disabled={downloading}
            className="px-4 py-2 text-sm font-semibold text-primary bg-primary/10 rounded-full hover:bg-primary/20 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-base">{downloading ? 'hourglass_empty' : 'download'}</span>
            <span>{downloading ? '下载中...' : '下载全部内容'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const ImageRecordsPage: React.FC = () => {
  const { isLoggedIn, user, openAuthModal } = useAuthStore();
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [downloading, setDownloading] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewRecordId, setPreviewRecordId] = useState<number | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  const fetchRecords = useCallback(async (currentCursor: number | null, append: boolean = false) => {
    if (!isLoggedIn || !user) {
      return;
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await getOriginalImageRecordsCursor(parseInt(user.id), currentCursor, 10);
      const responseData = response.data || response;
      
      if (!Array.isArray(responseData)) {
        console.error('Invalid response data format:', responseData);
        setHasMore(false);
        return;
      }
      
      let filteredData = responseData;
      if (statusFilter !== 'all') {
        filteredData = responseData.filter((record: Record) => {
          switch (statusFilter) {
            case 'processing':
              return record.status === 'processing';
            case 'completed':
              return record.status === 'completed';
            case 'failed':
              return record.status === 'failed';
            default:
              return true;
          }
        });
      }

      if (append) {
        setRecords(prev => [...prev, ...filteredData]);
      } else {
        setRecords(filteredData);
      }

      if (responseData.length > 0) {
        const lastRecord = responseData[responseData.length - 1];
        setCursor(lastRecord.id);
        setHasMore(true);
      } else {
        setHasMore(false);
        setCursor(null);
      }
    } catch (error) {
      console.error('Failed to fetch image records:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [isLoggedIn, user, statusFilter]);

  useEffect(() => {
    if (!isLoggedIn || !user || isInitialized.current) {
      return;
    }
    
    isInitialized.current = true;
    setCursor(null);
    fetchRecords(null, false);
  }, [isLoggedIn, user, fetchRecords]);

  useEffect(() => {
    if (isLoggedIn && user) {
      setCursor(null);
      isInitialized.current = true;
      fetchRecords(null, false);
    }
  }, [statusFilter, isLoggedIn, user, fetchRecords]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    if (scrollBottom < 100 && hasMore && !isLoadingMore && !loading && cursor !== null) {
      scrollTimeoutRef.current = setTimeout(() => {
        fetchRecords(cursor, true);
      }, 100);
    }
  }, [hasMore, isLoadingMore, loading, cursor, fetchRecords]);

  const handleFeedback = useCallback((recordId: number, feedback: string, feedbackId: number) => {
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, feedback_id: feedbackId } : r));
  }, []);

  const handlePreviewModalFeedback = useCallback((feedback: string, feedbackId: number) => {
    if (previewRecordId) {
      setRecords(prev => prev.map(r => r.id === previewRecordId ? { ...r, feedback_id: feedbackId } : r));
    }
  }, [previewRecordId]);

  const handleDelete = useCallback(async (recordId: number) => {
    setRecordToDelete(recordId);
    setDeleteConfirmVisible(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!recordToDelete) return;
    
    try {
      await deleteOriginalImageRecord(recordToDelete);
      setRecords(prev => prev.filter(r => r.id !== recordToDelete));
      setDeleteConfirmVisible(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('删除失败，请重试');
    }
  }, [recordToDelete]);

  const handleDownload = useCallback(async (recordId: number) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    
    const getOriginalImages = () => {
      const params = record.params;
      if (!params) return [];
      
      const images: string[] = [];
      
      if (params.version === 'common') {
        if (params.uploaded_image) {
          images.push(params.uploaded_image);
        }
      } else if (params.version === 'pro') {
        if (params.outfit_type === 'single') {
          if (params.single_outfit_image) {
            images.push(params.single_outfit_image);
          }
          if (params.single_outfit_back_image) {
            images.push(params.single_outfit_back_image);
          }
        } else if (params.outfit_type === 'match') {
          if (params.top_outfit_image) {
            images.push(params.top_outfit_image);
          }
          if (params.top_outfit_back_image) {
            images.push(params.top_outfit_back_image);
          }
          if (params.bottom_outfit_image) {
            images.push(params.bottom_outfit_image);
          }
          if (params.bottom_outfit_back_image) {
            images.push(params.bottom_outfit_back_image);
          }
        }
      }
      
      return images;
    };
    
    const originalImages = getOriginalImages();
    const generatedImages = record.images || [];
    const allImageUrls = [...originalImages, ...generatedImages];
    
    const allImages = allImageUrls.map((img: any) => {
      if (typeof img === 'string') {
        return img;
      }
      return img.url || img.file_path || img;
    }).filter((url: string) => url);
    
    if (allImages.length === 0) {
      alert('没有可下载的图片');
      return;
    }
    
    setDownloading(true);
    try {
      const zip = new JSZip();
      
      const downloadPromises = allImages.map(async (imageUrl: string, index: number) => {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const blob = await response.blob();
          const urlParts = imageUrl.split('/');
          const fileName = urlParts[urlParts.length - 1] || `image_${index + 1}.jpg`;
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to download image ${index + 1}:`, error);
        }
      });
      
      await Promise.all(downloadPromises);
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `record_images_${recordId}_${Date.now()}.zip`);
    } catch (error) {
      console.error('Download failed:', error);
      alert('下载失败，请重试');
    } finally {
      setDownloading(false);
    }
  }, [records]);

  const handleImageClick = useCallback((recordId: number, imageIndex: number) => {
    setPreviewRecordId(recordId);
    setPreviewImageIndex(imageIndex);
    setPreviewModalVisible(true);
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 mb-4">请先登录查看生图记录</p>
          <button
            onClick={openAuthModal}
            className="px-6 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
          >
            登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">生图记录</h2>
        <div className="flex items-center space-x-2 bg-white dark:bg-gray-900 p-1 rounded-full border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setStatusFilter('processing')}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              statusFilter === 'processing'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            进行中
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              statusFilter === 'completed'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            已完成
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              statusFilter === 'failed'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            失败
          </button>
        </div>
      </div>
      
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-6 pr-2"
      >
        {loading && records.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
        
        {!loading && records.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">暂无生图记录</p>
          </div>
        )}
        
        {records.map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            onFeedback={handleFeedback}
            onDelete={handleDelete}
            onDownload={handleDownload}
            downloading={downloading}
            onImageClick={handleImageClick}
          />
        ))}
        
        {isLoadingMore && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
        
        {!hasMore && records.length > 0 && (
          <div className="text-center py-4 text-sm text-gray-400">
            已加载全部记录
          </div>
        )}
      </div>

      {deleteConfirmVisible && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl relative w-full max-w-[400px]">
            <button 
              onClick={() => setDeleteConfirmVisible(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-bold text-black dark:text-white mb-6">删除提示</h3>
            
            <div className="flex items-center gap-3 mb-8">
              <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-orange-500" />
              </div>
              <span className="text-base text-gray-700 dark:text-gray-300 font-medium">确定要删除吗？</span>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmVisible(false)}
                className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2 rounded-lg bg-[rgb(55_19_236_/_0.9)] hover:bg-[rgb(55_19_236_/_0.8)] text-white font-medium transition-colors shadow-sm"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      <ImagePreviewModal
        visible={previewModalVisible}
        recordId={previewRecordId}
        initialImageIndex={previewImageIndex}
        onClose={() => setPreviewModalVisible(false)}
        onFeedback={handlePreviewModalFeedback}
      />
    </div>
  );
};
