import axios from 'axios';

const API_BASE_URL = 'https://api.yilaitu.com/v1';

export interface Pose {
  id: number;
  description: string;
  url: string;
  skeleton_url?: string;
}

export interface PosesResponse {
  success: boolean;
  message: string;
  data: Pose[];
}

export const getPoses = async (gender?: string): Promise<PosesResponse> => {
  try {
    const params = gender ? `?gender=${gender}` : '';
    const response = await axios.get<PosesResponse>(`${API_BASE_URL}/pose-split/sys-poses${params}`);
    return response.data;
  } catch (error) {
    console.error('获取姿势列表失败:', error);
    return {
      success: false,
      message: '获取姿势列表失败',
      data: []
    };
  }
};
