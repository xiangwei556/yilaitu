import request from '../utils/request';

// ======================== 类目管理 ========================
export const listCategories = (params) => {
  return request.get('/sys-images/admin/categories', { params });
};

export const getCategoryDetail = (id) => {
  return request.get(`/sys-images/admin/categories/${id}`);
};

export const createCategory = (data) => {
  return request.post('/sys-images/admin/categories', data);
};

export const updateCategory = (id, data) => {
  return request.put(`/sys-images/admin/categories/${id}`, data);
};

export const deleteCategory = (id) => {
  return request.delete(`/sys-images/admin/categories/${id}`);
};

export const batchDeleteCategories = (ids) => {
  return request.post('/sys-images/admin/categories/batch-delete', ids);
};

export const changeCategoryStatus = (id, status) => {
  return request.post(`/sys-images/admin/categories/${id}/status`, null, { params: { status } });
};

export const batchChangeCategoryStatus = (ids, status) => {
  return request.post('/sys-images/admin/categories/batch-status', ids, { params: { status } });
};

// 公开API
export const getPublicCategories = (params) => {
  return request.get('/sys-images/categories', { params });
};

// ======================== 模特参考图管理 ========================
export const listModelRefs = (params) => {
  return request.get('/sys-images/admin/model-refs', { params });
};

export const getModelRefDetail = (id) => {
  return request.get(`/sys-images/admin/model-refs/${id}`);
};

export const createModelRef = (data) => {
  const form = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'file' && data[key]) {
      form.append('file', data[key]);
    } else if (Array.isArray(data[key])) {
      form.append(key, data[key].join(','));
    } else if (data[key] !== undefined && data[key] !== null) {
      form.append(key, data[key]);
    }
  });
  return request.post('/sys-images/admin/model-refs', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateModelRef = (id, data) => {
  const form = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'file' && data[key]) {
      form.append('file', data[key]);
    } else if (data[key] !== undefined && data[key] !== null) {
      if (key === 'category_ids' && Array.isArray(data[key])) {
        form.append(key, data[key].join(','));
      } else {
        form.append(key, data[key]);
      }
    }
  });
  return request.put(`/sys-images/admin/model-refs/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteModelRef = (id) => {
  return request.delete(`/sys-images/admin/model-refs/${id}`);
};

export const batchDeleteModelRefs = (ids) => {
  return request.post('/sys-images/admin/model-refs/batch-delete', ids);
};

export const changeModelRefStatus = (id, status) => {
  return request.post(`/sys-images/admin/model-refs/${id}/status`, null, { params: { status } });
};

export const batchChangeModelRefStatus = (ids, status) => {
  return request.post('/sys-images/admin/model-refs/batch-status', ids, { params: { status } });
};

export const uploadModelRefImage = (id, file) => {
  const form = new FormData();
  form.append('file', file);
  return request.post(`/sys-images/admin/model-refs/${id}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 公开API
export const getPublicModelRefs = (params) => {
  return request.get('/sys-images/model-refs', { params });
};

// 公开API - 获取系统模特列表（用于模特换装页面，入参出参和 yilaitumodel 的 getSystemModels 保持一致）
export const getPublicSystemModels = async ({ skip = 0, page_size = 12, category } = {}) => {
  // 转换 skip 为 page
  const page = Math.floor(skip / page_size) + 1;

  const res = await request.get('/sys-images/model-refs', {
    params: { page, page_size }
  });

  // 转换返回数据格式，使其和 getSystemModels 的出参一致
  const items = (res?.items || []).map(item => ({
    id: item.id,
    avatar: item.image_url,  // 将 image_url 映射为 avatar
    images: item.image_url ? [{ file_path: item.image_url }] : [],
    gender: item.gender,
    age_group: item.age_group,
    status: item.status,
    categories: item.categories || []
  }));

  return { items, total: res?.total || 0 };
};

// ======================== 场景图管理 ========================
export const listScenes = (params) => {
  return request.get('/sys-images/admin/scenes', { params });
};

export const getSceneDetail = (id) => {
  return request.get(`/sys-images/admin/scenes/${id}`);
};

export const createScene = (data) => {
  const form = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'file' && data[key]) {
      form.append('file', data[key]);
    } else if (data[key] !== undefined && data[key] !== null) {
      form.append(key, data[key]);
    }
  });
  return request.post('/sys-images/admin/scenes', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateScene = (id, data) => {
  const form = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'file' && data[key]) {
      form.append('file', data[key]);
    } else if (data[key] !== undefined && data[key] !== null) {
      form.append(key, data[key]);
    }
  });
  return request.put(`/sys-images/admin/scenes/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteScene = (id) => {
  return request.delete(`/sys-images/admin/scenes/${id}`);
};

export const batchDeleteScenes = (ids) => {
  return request.post('/sys-images/admin/scenes/batch-delete', ids);
};

export const changeSceneStatus = (id, status) => {
  return request.post(`/sys-images/admin/scenes/${id}/status`, null, { params: { status } });
};

export const batchChangeSceneStatus = (ids, status) => {
  return request.post('/sys-images/admin/scenes/batch-status', ids, { params: { status } });
};

export const uploadSceneImage = (id, file) => {
  const form = new FormData();
  form.append('file', file);
  return request.post(`/sys-images/admin/scenes/${id}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 公开API
export const getPublicScenes = (params) => {
  return request.get('/sys-images/scenes', { params });
};

// ======================== 姿势图管理 ========================
export const listPoses = (params) => {
  return request.get('/sys-images/admin/poses', { params });
};

export const getPoseDetail = (id) => {
  return request.get(`/sys-images/admin/poses/${id}`);
};

export const createPose = (data) => {
  const form = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'image_file' && data[key]) {
      form.append('image_file', data[key]);
    } else if (key === 'skeleton_file' && data[key]) {
      form.append('skeleton_file', data[key]);
    } else if (data[key] !== undefined && data[key] !== null) {
      form.append(key, data[key]);
    }
  });
  return request.post('/sys-images/admin/poses', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updatePose = (id, data) => {
  const form = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'image_file' && data[key]) {
      form.append('image_file', data[key]);
    } else if (key === 'skeleton_file' && data[key]) {
      form.append('skeleton_file', data[key]);
    } else if (data[key] !== undefined && data[key] !== null) {
      form.append(key, data[key]);
    }
  });
  return request.put(`/sys-images/admin/poses/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deletePose = (id) => {
  return request.delete(`/sys-images/admin/poses/${id}`);
};

export const batchDeletePoses = (ids) => {
  return request.post('/sys-images/admin/poses/batch-delete', ids);
};

export const changePoseStatus = (id, status) => {
  return request.post(`/sys-images/admin/poses/${id}/status`, null, { params: { status } });
};

export const batchChangePoseStatus = (ids, status) => {
  return request.post('/sys-images/admin/poses/batch-status', ids, { params: { status } });
};

export const uploadPoseImage = (id, file) => {
  const form = new FormData();
  form.append('file', file);
  return request.post(`/sys-images/admin/poses/${id}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadPoseSkeleton = (id, file) => {
  const form = new FormData();
  form.append('file', file);
  return request.post(`/sys-images/admin/poses/${id}/skeleton`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 公开API
export const getPublicPoses = (params) => {
  return request.get('/sys-images/poses', { params });
};

// ======================== 背景图管理 ========================
export const listBackgrounds = (params) => {
  return request.get('/sys-images/admin/backgrounds', { params });
};

export const getBackgroundDetail = (id) => {
  return request.get(`/sys-images/admin/backgrounds/${id}`);
};

export const createBackground = (data) => {
  const form = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'file' && data[key]) {
      form.append('file', data[key]);
    } else if (data[key] !== undefined && data[key] !== null) {
      form.append(key, data[key]);
    }
  });
  return request.post('/sys-images/admin/backgrounds', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateBackground = (id, data) => {
  const form = new FormData();
  Object.keys(data).forEach(key => {
    if (key === 'file' && data[key]) {
      form.append('file', data[key]);
    } else if (data[key] !== undefined && data[key] !== null) {
      form.append(key, data[key]);
    }
  });
  return request.put(`/sys-images/admin/backgrounds/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteBackground = (id) => {
  return request.delete(`/sys-images/admin/backgrounds/${id}`);
};

export const batchDeleteBackgrounds = (ids) => {
  return request.post('/sys-images/admin/backgrounds/batch-delete', ids);
};

export const changeBackgroundStatus = (id, status) => {
  return request.post(`/sys-images/admin/backgrounds/${id}/status`, null, { params: { status } });
};

export const batchChangeBackgroundStatus = (ids, status) => {
  return request.post('/sys-images/admin/backgrounds/batch-status', ids, { params: { status } });
};

export const uploadBackgroundImage = (id, file) => {
  const form = new FormData();
  form.append('file', file);
  return request.post(`/sys-images/admin/backgrounds/${id}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 公开API
export const getPublicBackgrounds = (params) => {
  return request.get('/sys-images/backgrounds', { params });
};
