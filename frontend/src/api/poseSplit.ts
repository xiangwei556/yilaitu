import axios from 'axios';

const API_BASE_URL = 'http://localhost:8001/api/v1';

export interface Pose {
  id: number;
  description: string;
  url: string;
}

export interface PosesResponse {
  success: boolean;
  message: string;
  data: Pose[];
}

export const getPoses = async (): Promise<PosesResponse> => {
  try {
    const response = await axios.get<PosesResponse>(`${API_BASE_URL}/pose-split/poses`);
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
