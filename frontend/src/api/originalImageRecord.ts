import request from '../utils/request';

export async function getOriginalImageRecords(userId: number, skip: number = 0, limit: number = 10) {
  const response = await request.get(`/original_image_record/user/${userId}`, {
    params: { skip, limit }
  });
  return response;
}

export async function getOriginalImageRecordsCursor(userId: number, cursor: number | null = null, limit: number = 10, modelId?: number) {
  const params: any = { limit };
  if (cursor !== null) {
    params.cursor = cursor;
  }
  if (modelId !== undefined) {
    params.model_id = modelId;
  }
  const response = await request.get(`/original_image_record/user/${userId}/cursor`, {
    params
  });
  return response;
}

export async function deleteOriginalImageRecord(recordId: number) {
  const response = await request.delete(`/original_image_record/${recordId}`);
  return response;
}

export async function getOriginalImageRecord(recordId: number) {
  const response = await request.get(`/original_image_record/${recordId}`);
  return response;
}
