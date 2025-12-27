import React from 'react';
import { Modal, Button } from 'antd';
import { X, Calendar, ArrowRight, Image as ImageIcon, Download as DownloadIcon } from 'lucide-react';
import { Message } from '../api/message';
import dayjs from 'dayjs';

interface MessageDetailProps {
  open: boolean;
  onClose: () => void;
  message: Message;
  source?: 'header' | 'messageCenter';
  onOpenMessageCenter?: () => void;
}

export const MessageDetail: React.FC<MessageDetailProps> = ({ open, onClose, message, source = 'messageCenter', onOpenMessageCenter }) => {
  const handleBackToList = () => {
    // Close the current detail modal first
    onClose();
    
    // If the detail was opened from header, open the full message center
    if (source === 'header' && onOpenMessageCenter) {
      onOpenMessageCenter();
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
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
      
      {/* Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <style>{`
          /* Hide scrollbar for Chrome, Safari and Opera */
          .flex-1.overflow-y-auto::-webkit-scrollbar {
            display: none;
          }
          /* Hide scrollbar for IE, Edge and Firefox */
          .flex-1.overflow-y-auto {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          /* Material Icons */
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
                {message.type === 'system' ? '系统通知' : 
                 message.type === 'business' ? '业务消息' : '私信'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="h-px bg-gray-100 dark:bg-gray-800 mb-6"></div>
        
        <div className="text-base text-gray-600 dark:text-gray-300 leading-7 space-y-4 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
      
      {/* Actions */}
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
