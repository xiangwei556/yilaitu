import request from '../utils/request';

export const listModels = (params) => {
  return request.get('/yilaitumodel/admin/models', { params });
};

export const getModelDetail = (id) => {
  return request.get(`/yilaitumodel/admin/models/${id}`);
};

export const createModel = (data) => {
  return request.post('/yilaitumodel/admin/models', data);
};

export const updateModel = (id, data) => {
  return request.put(`/yilaitumodel/admin/models/${id}`, data);
};

export const deleteModel = (id) => {
  return request.delete(`/yilaitumodel/admin/models/${id}`);
};

export const batchDeleteModels = (ids) => {
  return request.post('/yilaitumodel/admin/models/batch-delete', ids);
};

export const changeModelStatus = (id, status) => {
  return request.post(`/yilaitumodel/admin/models/${id}/status`, null, { params: { status } });
};

export const batchChangeModelStatus = (ids, status) => {
  return request.post('/yilaitumodel/admin/models/batch-status', ids, { params: { status } });
};

export const uploadModelImage = (id, file, options = {}) => {
  const form = new FormData();
  form.append('file', file);
  if (options.view) form.append('view', options.view);
  if (options.is_cover) form.append('is_cover', options.is_cover ? 'true' : 'false');
  return request.post(`/yilaitumodel/admin/models/${id}/images`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// C-side APIs
export const getMyModels = (params) => {
    return request.get('/yilaitumodel/my-models', { params });
};

export const getSystemModels = (params) => {
    return request.get('/yilaitumodel/models', { params: { ...params, type: 'system' } });
};

export const createMyModel = (data) => {
    // data should be FormData
    return request.post('/yilaitumodel/my-models', data);
};

export const updateMyModel = (id, data) => {
    // data should be FormData
    return request.put(`/yilaitumodel/my-models/${id}`, data);
};

export const deleteMyModel = (id) => {
    return request.delete(`/yilaitumodel/my-models/${id}`);
};

export const addSystemModelToMy = (systemModelId) => {
    return request.post(`/yilaitumodel/add-system-to-my`, { system_model_id: systemModelId });
};

// 参考图相关API
export const uploadCankaotu = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request.post('/yilaitumodel/my-models/cankaotu', formData);
};

export const deleteCankaotu = (id) => {
    return request.delete(`/yilaitumodel/my-models/cankaotu/${id}`);
};
