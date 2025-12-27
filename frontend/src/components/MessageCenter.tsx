import React, { useState, useEffect } from 'react';
import { Modal, Checkbox, Pagination, Spin, Empty, Button, message as antdMessage } from 'antd';
import { X, Trash2, MailOpen, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { getMyMessages, markBatchRead, deleteBatchMessages, Message, getUnreadCount, markMessageRead } from '../api/message';
import { MessageDetail } from './MessageDetail';
import dayjs from 'dayjs';

interface MessageCenterProps {
  open: boolean;
  onClose: () => void;
  onUnreadCountChange: () => void;
  initialDetailOpen?: boolean;
  initialCurrentMessage?: Message | null;
  onOpenMessageCenter?: () => void;
}

export const MessageCenter: React.FC<MessageCenterProps> = ({ 
  open, 
  onClose, 
  onUnreadCountChange,
  initialDetailOpen = false,
  initialCurrentMessage = null,
  onOpenMessageCenter
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [unreadTotal, setUnreadTotal] = useState(0); // Track unread total specifically for title
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Detail Modal
  const [detailOpen, setDetailOpen] = useState(initialDetailOpen);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(initialCurrentMessage);
  
  // Delete Confirmation Modal
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  // Update detail modal when initial props change
  useEffect(() => {
    if (initialDetailOpen !== undefined) {
      setDetailOpen(initialDetailOpen);
    }
    if (initialCurrentMessage !== undefined) {
      setCurrentMessage(initialCurrentMessage);
    }
  }, [initialDetailOpen, initialCurrentMessage]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await getMyMessages({
        page,
        page_size: pageSize,
        status: activeTab === 'all' ? undefined : activeTab
      });
      // @ts-ignore
      setMessages(res.items);
      // @ts-ignore
      setTotal(res.total);
      
      // Unread count is now handled by fetchUnreadCount function, no need to update it here
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count when component opens
  const fetchUnreadCount = async () => {
    try {
      const res = await getUnreadCount();
      setUnreadTotal(res.count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMessages();
      fetchUnreadCount();
      // Reset selection when tab/page changes or re-opens
      setSelectedIds([]);
    }
  }, [open, page, activeTab]);

  const handleBatchRead = async () => {
    if (selectedIds.length === 0) return;
    try {
      await markBatchRead(selectedIds);
      antdMessage.success('标记成功');
      
      // Optimistic Update: Update local state without fetching
      setMessages(prev => prev.map(m => 
        selectedIds.includes(m.id) ? { ...m, status: 'read' } : m
      ));
      
      // Update Unread Count Global
      onUnreadCountChange();
      
      // Update local unread total
      fetchUnreadCount();
      
      // Update local unread total logic (simplified)
      if (activeTab === 'unread') {
          // If we are in 'unread' tab, read messages should disappear? 
          // Or just stay until refresh? Usually better to disappear or just update status.
          // Let's refetch if in 'unread' tab to remove them, otherwise just update status
          fetchMessages();
      } else {
         // Reset selection
         setSelectedIds([]);
      }
    } catch (e) {
      console.error(e);
      antdMessage.error('操作失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleteConfirmVisible(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteBatchMessages(selectedIds);
      antdMessage.success('删除成功');
      
      // Optimistic Update: Remove from local list
      setMessages(prev => prev.filter(m => !selectedIds.includes(m.id)));
      setTotal(prev => prev - selectedIds.length);
      
      onUnreadCountChange();
      setSelectedIds([]);
      
      // If page becomes empty, go back one page
      if (messages.length === selectedIds.length && page > 1) {
          setPage(prev => prev - 1);
      } else {
          // If we deleted some items, we might want to fetch to fill the page
          // But for smooth UX, maybe just leaving it is fine until next interaction
          // Or just fetch quietly
          fetchMessages();
      }
      
      // Update local unread total
      fetchUnreadCount();
    } catch (e) {
      console.error(e);
      antdMessage.error('删除失败');
    } finally {
      setDeleteConfirmVisible(false);
    }
  };

  const handleSelectAll = (e: any) => {
    if (e.target.checked) {
      setSelectedIds(messages.map(m => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleItemClick = async (msg: Message) => {
    // Mark as read if unread
    if (msg.status === 'unread') {
      try {
        await markMessageRead(msg.id);
        
        // Update local state: mark message as read
        setMessages(prev => prev.map(m => 
          m.id === msg.id ? { ...m, status: 'read' } : m
        ));
        
        // Update unread count
        fetchUnreadCount();
        
        // Update global unread count
        onUnreadCountChange();
        
        // Update the message being passed to detail
        msg = { ...msg, status: 'read' };
      } catch (error) {
        console.error('Failed to mark message as read:', error);
      }
    }
    
    setCurrentMessage(msg);
    setDetailOpen(true);
  };

  const getTimeAgo = (dateStr: string) => {
    const date = dayjs(dateStr);
    const now = dayjs();
    const diffHours = now.diff(date, 'hour');
    
    if (diffHours < 1) return `${now.diff(date, 'minute')}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffHours < 48) return '昨天';
    return date.format('YYYY-MM-DD');
  };

  const isAllSelected = messages.length > 0 && selectedIds.length === messages.length;
  const hasSelection = selectedIds.length > 0;

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={800}
        centered
        className="rounded-xl overflow-hidden"
        closeIcon={null}
        title={null}
        style={{ padding: 0 }}
        styles={{ body: { padding: 0, margin: 0 } }}
        wrapClassName="p-0"
      >
        <style>{`
          /* Hide scrollbar for Chrome, Safari and Opera */
          .custom-scrollbar::-webkit-scrollbar {
            display: none;
          }
          /* Hide scrollbar for IE, Edge and Firefox */
          .custom-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          /* Apply scrollbar hiding to list area */
          .ant-modal-content .flex-1.overflow-y-auto {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          .ant-modal-content .flex-1.overflow-y-auto::-webkit-scrollbar {
            display: none;
          }
          .ant-modal-content {
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
          .ant-modal-body {
            padding: 0 !important;
            margin: 0 !important;
          }
          .ant-modal-header {
            padding: 0 !important;
            margin: 0 !important;
          }
          .ant-modal-footer {
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Ensure list and pagination are tightly connected */
          .flex-1.overflow-y-auto {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
          .px-6.py-4.border-t {
            border-top: 0px solid #e5e7eb !important;
            margin-top: 0 !important;
            padding-top: 12px !important;
          }
          /* Custom checkbox styles */
          .ant-checkbox-checked .ant-checkbox-inner {
            background-color: #3713EC !important;
            border-color: #3713EC !important;
          }
          .ant-checkbox-checked::after {
            border-color: #3713EC !important;
          }
          .ant-checkbox:hover .ant-checkbox-inner {
            border-color: #3713EC !important;
          }

        `}</style>
        <div className="flex flex-col h-[660px]">
          {/* Custom Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              消息中心
              {unreadTotal > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">{unreadTotal}条未读</span>
              )}
            </h3>
            <button className="text-gray-400 hover:text-gray-500 focus:outline-none" type="button" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
             {/* Left Actions */}
             <div className="flex items-center space-x-4">
               <label className="flex items-center space-x-2 cursor-pointer">
                 <Checkbox 
                   checked={isAllSelected} 
                   onChange={handleSelectAll}
                   className="h-4 w-4 rounded-sm border-gray-300 text-[#3713EC] focus:ring-[#3713EC] dark:bg-gray-800 dark:border-gray-600"
                 />
                 <span className="text-sm text-gray-600 dark:text-gray-300">全选</span>
               </label>
               
               <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>

               <button
                 onClick={handleBatchRead}
                 disabled={!hasSelection}
                 className={`text-sm transition-colors flex items-center space-x-1 ${
                   hasSelection 
                     ? 'text-gray-600 dark:text-gray-300 hover:text-brand-dark dark:hover:text-brand-dark cursor-pointer' 
                     : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                 }`}
               >
                 <MailOpen className="w-4 h-4" />
                 <span>标记为已读</span>
               </button>

               <button
                 onClick={handleBatchDelete}
                 disabled={!hasSelection}
                 className={`text-sm transition-colors flex items-center space-x-1 ${
                   hasSelection 
                     ? 'text-gray-600 dark:text-gray-300 hover:text-red-500 cursor-pointer' 
                     : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                 }`}
               >
                 <Trash2 className="w-4 h-4" />
                 <span>删除消息</span>
               </button>
             </div>

             {/* Right Tabs */}
             <div className="flex space-x-1 bg-gray-200/50 dark:bg-gray-700/50 p-1 rounded-lg">
                 {['all', 'unread', 'read'].map((tab) => (
                   <button
                     key={tab}
                     onClick={() => { setActiveTab(tab as any); setPage(1); }}
                     className={`px-3 py-1 text-xs font-medium transition-all ${
                       activeTab === tab ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm rounded-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md'
                     }`}
                   >
                     {{ all: '全部', unread: '未读', read: '已读' }[tab]}
                   </button>
                 ))}
             </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
             {loading ? (
               <div className="flex justify-center items-center h-full"><Spin /></div>
             ) : messages.length === 0 ? (
               <Empty description="暂无消息" className="mt-20" />
             ) : (
               <ul className="divide-y divide-gray-100 dark:divide-gray-800" role="list">
                 {messages.map(msg => (
                   <li 
                     key={msg.id}
                     className={`group relative flex items-start gap-x-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${msg.status === 'unread' ? 'bg-brand-dark/5 dark:bg-brand-dark/10' : ''}`}
                   >
                     {/* Checkbox */}
                     <div className="flex h-6 items-center">
                        <Checkbox 
                          checked={selectedIds.includes(msg.id)}
                          onChange={() => handleSelectOne(msg.id)}
                          className="h-4 w-4 rounded-sm border-gray-300 text-[#3713EC] focus:ring-[#3713EC] dark:bg-gray-800 dark:border-gray-600"
                        />
                     </div>
                     
                     {/* Red Dot */}
                     {msg.status === 'unread' && (
                       <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"></span>
                     )}
                      
                     {/* Content */}
                     <div 
                       className="flex-auto min-w-0"
                       onClick={() => handleItemClick(msg)}
                     >
                       <div className="flex items-baseline justify-between gap-x-4">
                         <h4 className={`text-sm font-semibold leading-6 ${msg.status === 'unread' ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                           {msg.title}
                         </h4>
                          
                         <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                           {getTimeAgo(msg.created_at)}
                         </span>
                       </div>
                       <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
                         {msg.content}
                       </p>
                     </div>
                   </li>
                 ))}
               </ul>
             )}
          </div>
          
          {/* Custom Pagination */}
          <div className="px-6 py-3 border-t border-gray-100 bg-white dark:bg-gray-900 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              显示第 {(page - 1) * pageSize + 1} 到 {Math.min(page * pageSize, total)} 条，共 {total} 条
            </span>
            
            <div className="flex items-center gap-2">
               {/* Using Ant Design Pagination with custom itemRender to match style exactly if needed, 
                   but implementing the specific "..." jump logic manually is cleaner for this specific requirement. */}
               
               <div className="flex items-center gap-2">
                 <button className="w-8 h-8 border border-gray-200 rounded-lg bg-white text-gray-500 flex items-center justify-center hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700">
                   <ChevronLeft className="w-4 h-4"/>
                 </button>
                 
                 {/* Page numbers */}
                 {Array.from({ length: Math.min(5, Math.ceil(total / pageSize)) }, (_, i) => {
                   const pageNum = i + 1;
                   return (
                     <button 
                       key={pageNum}
                       className={`w-8 h-8 border rounded-lg font-medium transition-colors ${
                         pageNum === page 
                           ? 'bg-[#3713EC] border-[#3713EC] text-white' 
                           : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                       }`}
                       onClick={() => setPage(pageNum)}
                     >
                       {pageNum}
                     </button>
                   );
                 })}
                 
                 {/* Ellipsis if more than 5 pages */}
                 {Math.ceil(total / pageSize) > 5 && (
                   <span className="relative inline-flex items-center justify-center px-1 text-sm font-semibold text-gray-400 dark:text-gray-500 h-8">...</span>
                 )}
                 
                 {/* Last page if more than 5 pages */}
                 {Math.ceil(total / pageSize) > 5 && (
                   <button 
                     className={`w-10 h-8 border rounded-lg font-medium transition-colors ${
                       Math.ceil(total / pageSize) === page 
                         ? 'bg-[#3713EC] border-[#3713EC] text-white' 
                         : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                     }`}
                     onClick={() => setPage(Math.ceil(total / pageSize))}
                   >
                     {Math.ceil(total / pageSize)}
                   </button>
                 )}
                 
                 <button className="w-8 h-8 border border-gray-200 rounded-lg bg-white text-gray-500 flex items-center justify-center hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700">
                   <ChevronRight className="w-4 h-4"/>
                 </button>
               </div>
            </div>
          </div>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmVisible}
        onCancel={() => setDeleteConfirmVisible(false)}
        footer={null}
        closable={false}
        width={{ xs: '90%', sm: '90%', md: 400, lg: 400, xl: 400 }}
        centered
        className="rounded-2xl overflow-hidden"
        styles={{ body: { padding: 0 } }}
        zIndex={10000}
      >
        <div className="bg-white p-6 rounded-2xl relative">
          <button 
            onClick={() => setDeleteConfirmVisible(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h3 className="text-lg font-bold text-black mb-6">删除提示</h3>
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            <span className="text-base text-gray-700 font-medium">确定要删除选中的 {selectedIds.length} 条消息吗？</span>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirmVisible(false)}
              className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-5 py-2 rounded-lg bg-[rgb(55_19_236_/_0.9)] hover:bg-[rgb(55_19_236_/_0.8)] text-white font-medium transition-colors shadow-sm"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>

      {currentMessage && (
        <MessageDetail 
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setCurrentMessage(null);
            // Only close the entire message center if it was opened with initial detail (from header popup)
            // This means: if user clicked a message from the header popup, closing detail closes everything
            // If user opened the full message center first, closing detail only closes the detail
            if (initialDetailOpen) {
              onClose();
            }
          }}
          message={currentMessage}
          source={initialDetailOpen ? 'header' : 'messageCenter'}
          onOpenMessageCenter={onOpenMessageCenter}
        />
      )}
    </>
  );
};
