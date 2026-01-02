import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'antd';
import { X, Calendar, ArrowRight, Image as ImageIcon, Download as DownloadIcon } from 'lucide-react';
import { Message } from '../api/message';
import { getOriginalImageRecord } from '../api/originalImageRecord';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

interface MessageDetailProps {
  open: boolean;
  onClose: () => void;
  message: Message;
  source?: 'header' | 'messageCenter';
  onOpenMessageCenter?: () => void;
}

export const MessageDetail: React.FC<MessageDetailProps> = ({ open, onClose, message, source = 'messageCenter', onOpenMessageCenter }) => {
  const [taskData, setTaskData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open && message.extra_data) {
      try {
        const extraData = JSON.parse(message.extra_data);
        if (extraData.task_id) {
          loadTaskData(extraData.task_id);
        }
      } catch (e) {
        console.error('Failed to parse extra_data:', e);
      }
    }
  }, [open, message.extra_data]);

  const loadTaskData = async (taskId: number) => {
    setLoading(true);
    try {
      const response = await getOriginalImageRecord(taskId);
      setTaskData(response);
    } catch (error) {
      console.error('Failed to load task data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!taskData?.images || taskData.images.length === 0) {
      alert('没有可下载的图片');
      return;
    }

    setDownloading(true);
    try {
      const zip = new JSZip();

      const downloadPromises = taskData.images.map(async (img: any, index: number) => {
        try {
          const imageUrl = img.url || img.thumbnail;
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
      const taskId = message.extra_data ? JSON.parse(message.extra_data).task_id : 'unknown';
      saveAs(content, `task_images_${taskId}_${Date.now()}.zip`);
    } catch (error) {
      console.error('Failed to download images:', error);
      alert('下载失败，请重试');
    } finally {
      setDownloading(false);
    }
  };

  const handleBackToList = () => {
    onClose();
    
    if (source === 'header' && onOpenMessageCenter) {
      onOpenMessageCenter();
    }
  };

  const getMainContent = () => {
    if (message.extra_data) {
      try {
        const extraData = JSON.parse(message.extra_data);
        if (extraData.model_id === 1) {
          const imageCount = taskData?.images?.length || 0;
          return (
            <div className="text-base text-gray-600 dark:text-gray-300 leading-7 space-y-4">
              <p className="font-medium text-gray-900 dark:text-white">尊敬的用户：</p>
              <p>您好！您于今日上午提交的"模特换装"生图任务已顺利完成智能处理。我们的AI引擎已为您精心生成了多张高品质的效果图，您可以根据需求选择最满意的一张作为最终产品图。</p>
              <p>本次任务共生成了 <span className="font-semibold text-gray-900 dark:text-white">{imageCount} 张</span> 高清结果图，系统已自动为您保存至云端相册。您可以直接点击下方附件图片预览大图，或前往"生图记录"页面进行批量下载和管理。请注意，生成的图片将在云端保留30天，请及时下载保存。</p>
              <p>如有任何疑问或需要进一步的调整，请随时联系我们的在线客服。</p>
              <p>感谢您使用衣来图智能生图服务！</p>
            </div>
          );
        }
      } catch (e) {
        console.error('Failed to parse extra_data:', e);
      }
    }
    return <div className="text-base text-gray-600 dark:text-gray-300 leading-7 space-y-4 whitespace-pre-wrap">{message.content}</div>;
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={896}
      centered
      className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
      closeIcon={null}
      title={null}
      style={{ padding: 0 }}
      styles={{ body: { padding: 0, margin: 0 } }}
      wrapClassName="p-0"
    >
      <div className="flex flex-col h-[660px]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <button 
            className="group p-1 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
            type="button"
            onClick={handleBackToList}
          >
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors rotate-180" />
          </button>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            消息详情
          </h3>
        </div>
        <button 
          className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none transition-colors"
          type="button"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 p-8 overflow-y-auto">
        <style>{`
          .flex-1.overflow-y-auto::-webkit-scrollbar {
            display: none;
          }
          .flex-1.overflow-y-auto {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
          .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          }
        `}</style>
        
        <div className="flex justify-between items-start mb-6">
          <div className="w-full">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 leading-snug">{message.title}</h1>
            <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">schedule</span>
                {dayjs(message.created_at).format('YYYY-MM-DD HH:mm')}
              </span>
              <span className="h-1 w-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
              <span className="text-[#3713EC] font-medium bg-[#3713EC]/5 px-2 py-0.5 rounded text-xs border border-[#3713EC]/10">
                {message.type === 'task' || message.type === 'system' ? '系统通知' : 
                 message.type === 'business' ? '业务消息' : '私信'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="h-px bg-gray-100 dark:bg-gray-800 mb-6"></div>
        
        {getMainContent()}

        {taskData?.images && taskData.images.length > 0 && (
          <div className="mt-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                <span className="material-symbols-outlined text-lg mr-2 text-gray-500">image</span>
                相关附件 ({taskData.images.length})
              </h4>
              <button className="text-xs font-medium text-primary hover:underline flex items-center">
                <span className="material-symbols-outlined text-sm mr-1">download</span>
                打包下载
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {taskData.images.map((img: any, index: number) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 relative group cursor-pointer shadow-sm hover:shadow-md transition-all">
                  <img alt={`Generated Result ${index + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={img.url || img.thumbnail} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-end gap-3 rounded-b-2xl">
        <Button 
          onClick={handleBackToList}
          className="px-5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm"
        >
          返回列表
        </Button>
        {message.link && (
          <Button 
            type="primary" 
            className="px-5 py-2 rounded-lg bg-[#4C3BFF] text-sm font-bold text-white shadow-lg shadow-[#4C3BFF]/25 hover:bg-[#4C3BFF]/90 hover:shadow-[#4C3BFF]/40 transition-all flex items-center"
            onClick={() => window.open(message.link, '_blank')}
          >
            前往任务详情
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>
      </div>
    </Modal>
  );
};
