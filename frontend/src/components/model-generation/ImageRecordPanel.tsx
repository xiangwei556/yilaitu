import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { getOriginalImageRecordsCursor } from '../../api/originalImageRecord';

interface Record {
  id: number;
  params?: any;
  images: any[];
  status: string;
  feedback_id?: number;
  model_id?: number;
}

interface RecordItemProps {
  record: Record;
  isLoaded: boolean;
  onImageLoad: (id: number) => void;
  onRecordClick?: (record: Record) => void;
}

const RecordItem: React.FC<RecordItemProps> = React.memo(({ record, isLoaded, onImageLoad, onRecordClick }) => {
  const imageUrl = useMemo(() => {
    const params = record.params;
    
    if (!params) {
      return '';
    }

    if (params.version === 'common') {
      return params.uploaded_image || '';
    } else if (params.version === 'pro') {
      if (params.outfit_type === 'single') {
        return params.single_outfit_image || '';
      } else if (params.outfit_type === 'match') {
        return params.top_outfit_image || params.bottom_outfit_image || '';
      }
    }
    
    return '';
  }, [record.params]);

  const status = record.status;

  const handleImageLoad = useCallback(() => {
    onImageLoad(record.id);
  }, [record.id, onImageLoad]);

  const handleClick = useCallback(() => {
    if (onRecordClick) {
      onRecordClick(record);
    }
  }, [record, onRecordClick, imageUrl, isLoaded]);

  return (
    <div 
      data-record-id={record.id}
      className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 relative cursor-pointer group"
      onClick={handleClick}
    >
      {!isLoaded && (
        <div className="w-full h-full bg-gray-100 animate-pulse absolute inset-0"></div>
      )}
      <img 
        alt="Record" 
        className="w-full h-full object-cover"
        src={imageUrl}
        onLoad={handleImageLoad}
        style={{ opacity: isLoaded ? 1 : 0 }}
      />
      
      {status === 'processing' && isLoaded && (
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center">
          <div className="flex flex-col items-center space-y-1">
            <div className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white text-[10px] font-bold tracking-wide mt-1">生成中</span>
          </div>
        </div>
      )}
      
      {status === 'failed' && isLoaded && (
        <div className="absolute inset-0 bg-red-900/40 backdrop-blur-[2px] flex items-center justify-center">
          <div className="flex flex-col items-center space-y-1">
            <span className="material-icons-outlined text-white text-lg">error</span>
            <span className="text-white text-[10px] font-bold tracking-wide mt-1">生成失败</span>
          </div>
        </div>
      )}
      
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
    </div>
  );
});

interface ImageRecordPanelProps {
  onContinueCreating: () => void;
  onRecordClick?: (record: Record) => void;
  refreshRef?: React.MutableRefObject<(() => void) | null>;
  findRecordRef?: React.MutableRefObject<((taskId: string) => Record | null) | null>;
  updateRecordRef?: React.MutableRefObject<((recordId: number, updates: Partial<Record>) => void) | null>;
}

export const ImageRecordPanel: React.FC<ImageRecordPanelProps> = ({ onContinueCreating, onRecordClick, refreshRef, findRecordRef, updateRecordRef }) => {
  const { isLoggedIn, user, openAuthModal } = useAuthStore();
  const [records, setRecords] = useState<Map<number, Record>>(new Map());
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<Map<number, boolean>>(new Map());
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const isInitialized = React.useRef(false);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const refreshRecords = useCallback(() => {
    setCursor(null);
    isInitialized.current = false;
    fetchRecords(null, false);
  }, []);

  const findRecordByTaskId = useCallback((taskId: string): Record | null => {
    const recordsArray = Array.from(records.values());
    return recordsArray.find(record => record.id.toString() === taskId) || null;
  }, [records]);

  const updateRecord = useCallback((recordId: number, updates: Partial<Record>) => {
    setRecords(prev => {
      const record = prev.get(recordId);
      if (record) {
        const newRecords = new Map(prev);
        newRecords.set(recordId, { ...record, ...updates });
        return newRecords;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = refreshRecords;
    }
  }, [refreshRef, refreshRecords]);

  useEffect(() => {
    if (findRecordRef) {
      findRecordRef.current = findRecordByTaskId;
    }
  }, [findRecordRef, findRecordByTaskId]);

  useEffect(() => {
    if (updateRecordRef) {
      updateRecordRef.current = updateRecord;
    }
  }, [updateRecordRef, updateRecord]);

  const fetchRecords = async (currentCursor: number | null, append: boolean = false) => {
    if (!isLoggedIn || !user) {
      return;
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await getOriginalImageRecordsCursor(parseInt(user.id), currentCursor, 8);
      const responseData = response.data || response;
      
      if (!Array.isArray(responseData)) {
        console.error('Invalid response data format:', responseData);
        // 即使响应格式错误，也设置hasMore为false避免循环
        setHasMore(false);
        return;
      }
      
      const newRecordMap = new Map<number, Record>();
      responseData.forEach((record: any) => {
        newRecordMap.set(record.id, record);
      });

      if (append) {
        setRecords(prev => new Map([...prev, ...newRecordMap]));
      } else {
        setRecords(newRecordMap);
        setImageLoaded(new Map());
      }

      // 只有当成功获取到数据时才更新cursor
      if (responseData.length > 0) {
        const lastRecord = responseData[responseData.length - 1];
        setCursor(lastRecord.id);
        
        // 只要返回的数据量大于0，就认为还有更多数据
        // 因为后端可能返回比请求的limit少的记录，但仍然有更多数据
        setHasMore(true);
      } else {
        // 没有数据时，停止加载
        setHasMore(false);
        setCursor(null);
      }
    } catch (error) {
      console.error('Failed to fetch image records:', error);
      // API错误时，设置hasMore为false避免循环请求
      setHasMore(false);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !user || isInitialized.current) {
      return;
    }
    
    isInitialized.current = true;
    setCursor(null);
    fetchRecords(null, false);
  }, [isLoggedIn, user]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // 使用ref确保获取正确的滚动容器
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    
    // 防抖处理：清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // 只有当滚动到底部附近且满足条件时才触发加载
    if (scrollBottom < 100 && hasMore && !isLoadingMore && !loading && cursor !== null) {
      // 延迟100ms执行，避免频繁触发
      scrollTimeoutRef.current = setTimeout(() => {
        fetchRecords(cursor, true);
      }, 100);
    }
  }, [hasMore, isLoadingMore, loading, cursor]);

  const handleImageLoad = useCallback((id: number) => {
    setImageLoaded(prev => new Map(prev).set(id, true));
  }, []);

  const renderSkeletonItem = () => {
    return (
      <div className="w-full aspect-square rounded-lg bg-gray-100 animate-pulse"></div>
    );
  };

  const recordsArray = useMemo(() => Array.from(records.values()), [records]);

  return (
    <div 
      className="w-32 flex-shrink-0 bg-white shadow-sm border-r border-gray-100 flex flex-col relative z-20" 
      style={{ maxHeight: 'calc(100vh - 56px)', marginTop: '0' }}
    >
      <div className="px-3 py-4 border-b border-transparent text-center flex-shrink-0">
        <h3 className="font-medium text-gray-900 text-xs text-left">生图记录</h3>
      </div>
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-3 scrollbar-thin-transparent"
      >
        <div 
          onClick={onContinueCreating}
          className="w-full h-16 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors group"
        >
          <span className="material-icons-outlined text-gray-400 group-hover:text-brand mb-1">add</span>
          <span className="text-[10px] text-gray-500 group-hover:text-brand font-medium text-center leading-tight">继续<br/>创建</span>
        </div>
        {loading && records.size === 0 && Array.from({ length: 8 }).map((_, index) => (
          <div key={`skeleton-${index}`}>{renderSkeletonItem()}</div>
        ))}
        {!loading && recordsArray.map((record) => (
          <RecordItem 
            key={record.id}
            record={record}
            isLoaded={imageLoaded.get(record.id) || false}
            onImageLoad={handleImageLoad}
            onRecordClick={onRecordClick}
          />
        ))}
        {isLoadingMore && (
          <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-10">
        <button className="w-full flex items-center justify-center space-x-0.5 text-[10px] text-gray-500 hover:text-brand transition-colors py-2">
          <span>全部记录</span>
          <span className="material-icons-outlined text-xs">chevron_right</span>
        </button>
      </div>
    </div>
  );
};
