import request from '../utils/request';

export interface Feedback {
  id: number;
  user_id: number;
  feedback_type: number;
  feedback_type_name: string;
  content: string;
  create_time: string;
  reply_content: string;
  reply_time: string;
  original_image_record_id: number;
  model_id: number;
  status: string;
  points_transactions_id: number;
  created_at: string;
  updated_at: string;
}

export interface FeedbackCreate {
  user_id: number;
  feedback_type: string;
  content?: string;
  original_image_record_id?: number;
  model_id?: number;
}

export interface FeedbackUpdate {
  status: string;
  reply_content?: string;
  refund_points?: number;
}

export interface FeedbackListResponse {
  items: Feedback[];
  total: number;
  page: number;
  page_size: number;
}

export interface FeedbackDetailResponse {
  feedback: Feedback;
  original_image_record?: any;
}

export const createFeedback = (data: FeedbackCreate) => {
  return request.post('/feedback', data) as any as Promise<Feedback>;
};

export const getFeedback = (feedbackId: number) => {
  return request.get(`/feedback/${feedbackId}`) as any as Promise<FeedbackDetailResponse>;
};

export const getFeedbackListAdmin = (params: {
  page?: number;
  page_size?: number;
  status?: string;
  user_id?: number;
}) => {
  return request.get('/admin/feedback', { params }) as any as Promise<FeedbackListResponse>;
};

export const getFeedbackAdmin = (feedbackId: number) => {
  return request.get(`/admin/feedback/${feedbackId}`) as any as Promise<FeedbackDetailResponse>;
};

export const updateFeedbackAdmin = (feedbackId: number, data: FeedbackUpdate) => {
  return request.put(`/admin/feedback/${feedbackId}`, data) as any as Promise<Feedback>;
};
