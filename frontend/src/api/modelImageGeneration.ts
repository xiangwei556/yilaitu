import request from '../utils/request';

export async function modelImageGeneration(data: {
  version: string;
  outfit_type: string;
  model_type: string;
  selected_model: number;
  style_category: string;
  selected_style: number;
  custom_scene_text?: string;
  ratio: string;
  quantity: number;
  uploaded_image?: string;
  single_outfit_image?: string;
  single_outfit_back_image?: string;
  top_outfit_image?: string;
  top_outfit_back_image?: string;
  bottom_outfit_image?: string;
  bottom_outfit_back_image?: string;
}): Promise<any> {
  const response = await request.post('/model-image/model-image-generation', data);
  return response as any;
}
