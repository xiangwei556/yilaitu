import request from '../utils/request';

export interface Message {
  id: number;
  title: string;
  content: string;
  type: 'system' | 'private' | 'business';
  status: 'read' | 'unread';
  created_at: string;
  link?: string;
  priority?: string;
}

export interface MessageListResponse {
  items: Message[];
  total: number;
  page: number;
  page_size: number;
}

export const getMyMessages = (params: { page: number; page_size: number; status?: string; type?: string; id?: number }) => {
  return request.get('/message/my', { params }) as any as Promise<MessageListResponse>;
};

export const getUnreadCount = () => {
  return request.get('/message/my/count') as any as Promise<{ count: number }>;
};

export const markMessageRead = (id: number) => {
  return request.put(`/message/my/${id}/read`);
};

export const markAllRead = () => {
  return request.put('/message/my/mark-all-read');
};

export const markBatchRead = (ids: number[]) => {
  return request.put('/message/my/batch-read', ids);
};

export const deleteBatchMessages = (ids: number[]) => {
  return request.delete('/message/my/batch-delete', { data: ids });
};

// Admin APIs
export const sendMessage = (data: { title: string; content: string; receiver_id: number; type?: string }) => {
  return request.post('/message/send', data);
};
