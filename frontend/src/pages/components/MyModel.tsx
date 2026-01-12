import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Info, Trash2, Edit2, Check, X, ChevronRight, User, Tag, AlertCircle
} from 'lucide-react';
import { 
  Modal, Form, Input, Select, Upload, message, Button, Spin, Empty, Popconfirm 
} from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import { 
  getMyModels, getSystemModels, createMyModel, updateMyModel, deleteMyModel, addSystemModelToMy
} from '../../api/yilaitumodel';
import { useAuthStore } from '../../stores/useAuthStore';

const { Option } = Select;

const MyModel = () => {
  const { user, isLoggedIn, openAuthModal } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'my' | 'system'>('my');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  
  // Filters for System Models
  const [filters, setFilters] = useState({
    gender: 'all',
    age_group: 'all'
  });

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [systemDetailModalVisible, setSystemDetailModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentModel, setCurrentModel] = useState<any>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  // 新增状态管理文件值，避免直接从form实例获取
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  
  // Track previous login state
  const wasLoggedIn = useRef(isLoggedIn);
  
  // 使用Form.useWatch替代直接调用form.getFieldValue，避免未连接警告
  const ageGroupValue = Form.useWatch('age_group', form);
  const genderValue = Form.useWatch('gender', form);
  const bodyTypeValue = Form.useWatch('body_type', form);
  const styleValue = Form.useWatch('style', form);
  
  // 为编辑表单添加Form.useWatch变量
  const editAgeGroupValue = Form.useWatch('age_group', editForm);
  const editGenderValue = Form.useWatch('gender', editForm);
  const editBodyTypeValue = Form.useWatch('body_type', editForm);
  const editStyleValue = Form.useWatch('style', editForm);

  // Initial fetch when tab or filters change
  useEffect(() => {
    fetchModels(true);
  }, [activeTab, filters]);

  // Reset editing state when edit modal closes/opens
  useEffect(() => {
    if (!editModalVisible) {
        setIsEditing(false);
    }
  }, [editModalVisible]);

  // 当添加模态框关闭时，重置上传文件状态
  useEffect(() => {
    if (!addModalVisible) {
        setUploadedFile(null);
    }
  }, [addModalVisible]);

  // 当isEditing变为true且editModalVisible为true时，设置表单的初始值
  useEffect(() => {
    if (isEditing && editModalVisible && currentModel) {
      try {
        editForm.setFieldsValue(currentModel);
      } catch (error) {
        console.error('Failed to set form values:', error);
      }
    }
  }, [isEditing, editModalVisible, currentModel, editForm]);

  // Clear my models data when user logs out
  useEffect(() => {
    if (!isLoggedIn) {
      setModels([]);
      setHasMore(true);
    }
  }, [isLoggedIn]);

  // Fetch models when user logs in
  useEffect(() => {
    if (isLoggedIn && wasLoggedIn.current === false) {
      fetchModels(true);
    }
    wasLoggedIn.current = isLoggedIn;
  }, [isLoggedIn, activeTab, filters]);

  const fetchModels = async (isInit: boolean = false) => {
    if (loading) return;
    
    // Check login status for "我的模特" tab
    if (activeTab === 'my' && !isLoggedIn) {
      return;
    }
    
    setLoading(true);
    try {
      // Calculate skip and limit based on current state and isInit flag
      // Note: We use a functional update approach or ref if needed, but here we can rely on models.length
      // strictly if we are sure no other fetch is pending. 'loading' guard helps.
      
      const currentSkip = isInit ? 0 : models.length;
      let limit = 18;
      
      if (isInit) {
        // Init logic
        if (activeTab === 'my') {
            limit = 17;
        } else {
            limit = 18;
        }
      } else {
        // Load more logic
        limit = 18;
      }

      let res;
      if (activeTab === 'my') {
        res = await getMyModels({ 
          skip: currentSkip, 
          page_size: limit 
        });
      } else {
        const params: any = { 
          skip: currentSkip, 
          page_size: limit 
        };
        if (filters.gender !== 'all') params.gender = filters.gender;
        if (filters.age_group !== 'all') params.age_group = filters.age_group;
        res = await getSystemModels(params);
      }
      
      if (isInit) {
        setModels(res.items);
      } else {
        setModels(prev => [...prev, ...res.items]);
      }
      
      setHasMore(res.items.length >= limit);

    } catch (error) {
      console.error(error);
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Threshold of 50px from bottom
    if (scrollHeight - scrollTop - clientHeight < 50) {
      if (!loading && hasMore) {
        fetchModels(false);
      }
    }
  };

  const handleAddSubmit = async (values: any) => {
    try {
      const formData = new FormData();
      formData.append('gender', values.gender);
      formData.append('age_group', values.age_group);
      formData.append('body_type', values.body_type);
      formData.append('style', values.style);
      if (values.file && values.file[0]) {
        formData.append('file', values.file[0].originFileObj);
      } else {
        message.error('请上传图片');
        return;
      }

      await createMyModel(formData);
      
      setAddModalVisible(false);
      form.resetFields();
      
      // Show success message in center (custom)
      message.success({
        content: '添加模特成功',
        style: { marginTop: '40vh' },
        duration: 2
      });
      
      fetchModels(true);
    } catch (error) {
      console.error(error);
      message.error('添加失败');
    }
  };

  const handleEditSubmit = async (values: any) => {
    if (!currentModel) return;
    try {
      const formData = new FormData();
      // 移除条件判断，确保所有字段都被添加到FormData中
      formData.append('gender', values.gender);
      formData.append('age_group', values.age_group);
      formData.append('body_type', values.body_type);
      formData.append('style', values.style);

      await updateMyModel(currentModel.id, formData);
      
      setEditModalVisible(false);
      editForm.resetFields();
      message.success('修改成功');
      fetchModels(true);
    } catch (error) {
      console.error(error);
      message.error('修改失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMyModel(id);
      message.success('删除成功');
      setDeleteConfirmVisible(false);
      setEditModalVisible(false); // Close edit modal if open (though delete is usually from edit modal)
      fetchModels(true);
    } catch (error) {
      console.error(error);
      message.error('删除失败');
    }
  };

  const handleAddSystemModelToMy = async () => {
    if (!currentModel) return;
    try {
      await addSystemModelToMy(currentModel.id);
      message.success({
        content: '添加到我的模特成功',
        style: { marginTop: '40vh' },
        duration: 2
      });
      setSystemDetailModalVisible(false);
      // 如果当前在"我的模特"标签页，刷新数据
      if (activeTab === 'my') {
        fetchModels(true);
      }
    } catch (error) {
      console.error(error);
      message.error('添加失败');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Helper to get labels
  const getLabel = (type: string, value: string) => {
    const maps: any = {
      gender: { male: '男', female: '女' },
      age_group: { child: '儿童', youth: '青年', middle: '中年', senior: '老年' },
      body_type: { standard: '标准', chubby: '微胖', thin: '偏瘦', muscular: '健硕' },
      style: { euro: '时尚', korean: '休闲', japanese: '商务', casual: '街头' }
    };
    return maps[type]?.[value] || value;
  };

  const normFile = (e: any) => {
    let fileList = [];
    if (Array.isArray(e)) {
      fileList = e;
    } else {
      fileList = e?.fileList || [];
    }
    // 更新uploadedFile状态，用于显示预览
    setUploadedFile(fileList[0] || null);
    return fileList;
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F8FC]">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col gap-4 mb-4 p-6 pb-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">模特管理</h2>
          <div className="flex bg-white rounded-full p-1 shadow-sm border border-gray-200">
            <button 
              onClick={() => {
                if (!isLoggedIn) {
                  openAuthModal();
                  return;
                }
                setActiveTab('my');
              }}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all focus:outline-none ${
                activeTab === 'my' 
                  ? 'bg-[#4C3BFF] text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              我的模特
            </button>
            <button 
              onClick={() => setActiveTab('system')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all focus:outline-none ${
                activeTab === 'system' 
                  ? 'bg-[#4C3BFF] text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              系统模特
            </button>
          </div>
        </div>

        {/* Info Box */}
        {activeTab === 'my' ? (
          <div className="flex items-center justify-between px-4 py-3 bg-[#4C3BFF]/5 border border-[#4C3BFF]/10 rounded-xl">
            <div className="flex items-center text-sm text-gray-600">
              <Info className="w-5 h-5 text-[#4C3BFF] mr-2.5" />
              <span>管理您的专属模特资源库，支持上传自定义模特或使用系统模特，为商品图生成提供丰富素材。</span>
            </div>
            <a className="text-sm font-medium text-[#4C3BFF] hover:text-[#4C3BFF]/80 flex items-center transition-colors cursor-pointer group ml-4 whitespace-nowrap" href="#">
              查看详细介绍
              <ChevronRight className="w-4 h-4 ml-0.5 transform group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-3 bg-[#4C3BFF]/5 border border-[#4C3BFF]/10 rounded-xl">
            <div className="flex items-center text-sm text-gray-600">
              <Info className="w-5 h-5 text-[#4C3BFF] mr-2.5" />
              <span>浏览并选择系统提供的精选模特，添加到您的模特库以便在生图时使用。</span>
            </div>
          </div>
        )}
        
        {/* System Filters */}
        {activeTab === 'system' && (
           <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm">
             <div className="flex items-center gap-4">
               <span className="text-sm text-gray-500 font-medium">性别:</span>
               <div className="flex gap-2">
                 {['all', 'female', 'male'].map(v => (
                   <button
                     key={v}
                     onClick={() => handleFilterChange('gender', v)}
                     className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                       filters.gender === v 
                         ? 'bg-[#4C3BFF]/10 text-[#4C3BFF] border-[#4C3BFF]' 
                         : 'bg-white text-gray-600 border-gray-200 hover:border-[#4C3BFF]/50'
                     }`}
                   >
                     {v === 'all' ? '全部' : (v === 'female' ? '女' : '男')}
                   </button>
                 ))}
               </div>
               
               <div className="w-px h-4 bg-gray-200 mx-2" />
               
               <span className="text-sm text-gray-500 font-medium">年龄分段:</span>
               <div className="flex gap-2">
                 {['all', 'child', 'youth', 'middle', 'senior'].map(v => (
                   <button
                     key={v}
                     onClick={() => handleFilterChange('age_group', v)}
                     className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                       filters.age_group === v 
                         ? 'bg-[#4C3BFF]/10 text-[#4C3BFF] border-[#4C3BFF]' 
                         : 'bg-white text-gray-600 border-gray-200 hover:border-[#4C3BFF]/50'
                     }`}
                   >
                     {getLabel('age_group', v) === v && v === 'all' ? '全部' : getLabel('age_group', v)}
                   </button>
                 ))}
               </div>
             </div>
           </div>
        )}
      </div>

      {/* Content Grid */}
      <div 
        className="p-6 pt-0 overflow-y-auto custom-scrollbar"
        onScroll={handleScroll}
        style={{ height: 'calc(100vh - 320px)' }}
      >
        <style>{`
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(107, 114, 128, 0.5) transparent;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 5px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #9CA3AF;
            border-radius: 5px;
            border: 2px solid transparent;
            background-clip: content-box;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #6B7280;
          }
        `}</style>

        {loading && models.length === 0 && <div className="flex justify-center py-10"><Spin size="large" /></div>}
        
        {(models.length > 0 || (!loading && models.length === 0)) && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-6">
            {/* Add Button (Only for My Models) */}
            {activeTab === 'my' && (
              <div 
                onClick={() => {
                  if (!isLoggedIn) {
                    openAuthModal();
                    return;
                  }
                  setAddModalVisible(true);
                }}
                className="group border-2 border-dashed border-[#4C3BFF]/30 rounded-2xl aspect-[3/4] flex flex-col items-center justify-center cursor-pointer hover:bg-[#4C3BFF]/5 transition-colors relative"
              >
                <div className="h-14 w-14 rounded-full bg-[#4C3BFF]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <Plus className="text-[#4C3BFF] w-8 h-8" />
                </div>
                <span className="text-[#4C3BFF] font-medium text-sm">添加我的模特</span>
              </div>
            )}

            {models.map((model) => (
              <div 
                key={model.id}
                onClick={() => {
                  if (activeTab === 'my' && !isLoggedIn) {
                    openAuthModal();
                    return;
                  }
                  setCurrentModel(model);
                  if (activeTab === 'my') {
                    // Open Edit/Delete Modal
                    // 不再在打开模态框前调用setFieldsValue，避免Form未渲染时的警告
                    // 而是在isEditing变为true且Form渲染后通过useEffect设置
                    setEditModalVisible(true);
                  } else {
                    // Open System Detail Modal
                    setSystemDetailModalVisible(true);
                  }
                }}
                className="relative rounded-2xl overflow-hidden group aspect-[3/4] shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white"
              >
                <img 
                  alt={model.name} 
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                  src={model.avatar || (model.images && model.images[0]?.file_path)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                
                {/* Info Overlay */}
                <div className="absolute bottom-4 left-4 text-white">
                  <div className="flex items-center space-x-2 text-xs opacity-90 mb-1">
                    <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px]">
                      体型 {getLabel('body_type', model.body_type)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs opacity-90">
                    <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px]">
                      风格 {getLabel('style', model.style)}
                    </span>
                  </div>
                </div>

                {/* System Model Hover Effect */}
                {activeTab === 'system' && (
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isLoggedIn) {
                          openAuthModal();
                          return;
                        }
                        handleAddSystemModelToMy();
                      }}
                      className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-[#4C3BFF] hover:bg-white"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                )}
                
                {/* Hidden Field for copy_system_model */}
                <input 
                  type="hidden" 
                  className="copy-system-model" 
                  value={model.copy_system_model || 0} 
                  data-model-id={model.id} 
                />
              </div>
            ))}
          </div>
        )}
        
        {loading && models.length > 0 && (
            <div className="flex justify-center py-6 w-full">
                <Spin />
            </div>
        )}
        
        {!loading && models.length === 0 && activeTab !== 'my' && (
           <Empty description="暂无系统模特" className="mt-20" />
        )}
      </div>

      {/* Add Modal */}
      <Modal
        title="添加模特"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        footer={null}
        width={750}
        centered
        destroyOnHidden
        className="rounded-[24px] overflow-hidden"
        closeIcon={<X className="text-gray-400 hover:text-gray-600" />}
        styles={{ body: { padding: 0 } }}
      >
        <Form form={form} onFinish={handleAddSubmit} layout="vertical">
          <div className="flex flex-col md:flex-row h-[500px]">
             {/* Upload Area */}
             <div className="w-full md:w-[40%] p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50 flex flex-col justify-center">
               <Form.Item
                 name="file"
                 valuePropName="fileList"
                 getValueFromEvent={normFile}
                 rules={[{ required: true, message: '请上传图片' }]}
               >
                 <Upload.Dragger
                   name="file"
                   maxCount={1}
                   listType="picture-card"
                   showUploadList={false}
                   beforeUpload={() => false}
                   className="w-full aspect-[3/4] max-h-[360px] mx-auto border-2 border-dashed border-gray-300 hover:border-[#4C3BFF] rounded-3xl flex flex-col items-center justify-center bg-white cursor-pointer transition-all group hover:bg-[#4C3BFF]/5 relative overflow-hidden mb-4"
                 >
                   {/* 使用uploadedFile状态显示预览，避免直接从form实例获取 */}
                   {uploadedFile ? (
                     <div className="w-full h-full">
                       <img 
                         src={URL.createObjectURL(uploadedFile.originFileObj)} 
                         alt="preview" 
                         className="w-full h-full object-cover rounded-3xl" 
                       />
                     </div>
                   ) : (
                     <div className="flex flex-col items-center justify-center z-10 transition-transform group-hover:scale-105 duration-300">
                       <div className="h-20 w-20 rounded-full bg-[#4C3BFF]/10 flex items-center justify-center mb-4 group-hover:bg-[#4C3BFF]/20 transition-colors">
                         <Plus className="w-10 h-10 text-[#4C3BFF]" />
                       </div>
                       <span className="text-base font-medium text-gray-700 mb-1">点击上传模特图</span>
                       <span className="text-xs text-gray-400">支持 JPG, PNG 格式</span>
                     </div>
                   )}
                 </Upload.Dragger>
               </Form.Item>
               
               {/* 示例参考区域，按照参考HTML样式实现 */}
               <div className="w-full max-w-[320px] mx-auto">
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-xs text-gray-500 font-medium">示例参考</span>
                 </div>
                 <div className="grid grid-cols-4 gap-2">
                   {/* 清晰正面 - 正确示例 */}
                   <div className="relative group cursor-pointer">
                     <div className="aspect-square bg-white rounded-lg border-2 border-green-500/30 overflow-hidden relative">
                       <img 
                         alt="清晰正面" 
                         className="w-full h-full object-cover" 
                         src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBBWee5XJU3NfGHSrlQMvTy_wQiHz3hiKYRU__m0_2YdDto-Udsmhg7OreW1ggLP36NHjnOeiqxUC3lIg1-6FfgCh5U9nydgK_m9GlUD-ozH8RbcDaHXorPkmeO1qINfiBA5wkMunBEKVSPxcttUKQU7N_5LP1-9xc17AoSXumxl5mewBD6SnpNuXgffBoZ9uz7C5sQgly2KvHBJZ9tsFMVIuxRCr94ymZYcTL6VAcSaBKnNCCuRyI6kAfYv_KYNnrynmVAXaa3aSf" 
                       />
                       <div className="absolute bottom-0 right-0 bg-green-500 text-white rounded-tl-lg px-1 py-0.5">
                     <Check className="w-3.5 h-3.5" />
                   </div>
                     </div>
                     <span className="text-[10px] text-gray-400 mt-1 block text-center">清晰正面</span>
                   </div>
                   
                   {/* 侧身遮挡 - 错误示例 */}
                   <div className="relative group cursor-pointer">
                     <div className="aspect-square bg-white rounded-lg border border-red-200 overflow-hidden relative">
                       <img 
                         alt="侧身遮挡" 
                         className="w-full h-full object-cover" 
                         src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXQ4WKCL9u82oUmzL03r-1D81Xm2NZ5abWXlIWo5YtE0xzHVck4a_fd59tzaCjbI9SFap8RRhY69vT94FJr0gJH7xSABRzObrtVYl7lboi0omei-64qLusxqf8Swz4uhwt2INSrw7LXbUZ2xI3kgg-6g6sXbYWGIfHgyjQlU3CWgV0C67Ni9PKEOD2Doubm8gW0exfwaMcNdrfosTcMAom0YEPTtLLB20t4fd3_VICUkTpukDRaepbZAxWJI2JJiypY9oBmTmaqR2u" 
                       />
                       <div className="absolute bottom-0 right-0 bg-red-500 text-white rounded-tl-lg px-1 py-0.5">
                         <X className="w-3.5 h-3.5" />
                       </div>
                     </div>
                     <span className="text-[10px] text-gray-400 mt-1 block text-center">侧身遮挡</span>
                   </div>
                   
                   {/* 模糊不清 - 错误示例 */}
                   <div className="relative group cursor-pointer">
                     <div className="aspect-square bg-white rounded-lg border border-red-200 overflow-hidden relative">
                       <img 
                         alt="模糊不清" 
                         className="w-full h-full object-cover blur-[1px]" 
                         src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiTuau-KSX7rZn3GkNMp9JGj5DPTjKjXrroKrvSevZ2X9jt3vgrsZWA9kRWcfkXfn3UCrBVm8aI6dCH013_nbMMqnue5zczWBaZMnzdA1V86XsBBEYJqQVsY90qYCKlRYp0gyrYgSqx6gW9oBw9hM5NUTbniQwAsYb-IbDO4U_iQZohteHWRroTi4WmK5sxzl03-rUimslcBdfceboTNIdM0CBtvh9pbZZBQEOSoXTcNKsipPVAI042u1kY4rbJx3P-gcVGRXA_6q4" 
                       />
                       <div className="absolute bottom-0 right-0 bg-red-500 text-white rounded-tl-lg px-1 py-0.5">
                         <span className="text-[10px] font-bold">✗</span>
                       </div>
                     </div>
                     <span className="text-[10px] text-gray-400 mt-1 block text-center">模糊不清</span>
                   </div>
                   
                   {/* 光线昏暗 - 错误示例 */}
                   <div className="relative group cursor-pointer">
                     <div className="aspect-square bg-white rounded-lg border border-red-200 overflow-hidden relative">
                       <img 
                         alt="光线昏暗" 
                         className="w-full h-full object-cover contrast-50" 
                         src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmFx42Z3dUvpkrX5GFR0ndn4qcJ24cYSJO4yFa0LblWvA-Fcdi7IXSArSaqS4T6lpQugEjGYowMs-eRlouG3OuWXCJzVmEsiZeSyl6ae5XNDMRnhP-pS22t7mybWzugk1rrPcLOJxP89Tqi3X1eTa65y7T0j-XnwEEcOxYR-Kv3w9v7Y8wZZVTotoZEj0NyNkoXtDKAEjbYdwjxTmz-W0SDEEOwlU52oaCc-1gs6-AnteAGrRpK9YMJY0xINPGgGGHQCSA8H0hM-AV" 
                       />
                       <div className="absolute bottom-0 right-0 bg-red-500 text-white rounded-tl-lg px-1 py-0.5">
                         <span className="text-[10px] font-bold">✗</span>
                       </div>
                     </div>
                     <span className="text-[10px] text-gray-400 mt-1 block text-center">光线昏暗</span>
                   </div>
                 </div>
               </div>
             </div>

             {/* Form Fields */}
             <div className="w-full md:w-[60%] flex flex-col h-full bg-white">
               <div className="flex-1 overflow-y-hidden p-6 md:p-8 space-y-6">
                  <div>
                    <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center">
                      <span className="w-1 h-4 bg-[#4C3BFF] rounded-full mr-2"></span>
                      年龄分段
                    </h4>
                    <Form.Item name="age_group" initialValue="youth" noStyle>
                      <div className="flex flex-wrap gap-2 mb-4">
                         {['child','youth', 'middle', 'senior'].map(v => (
                           <div
                             key={v}
                             onClick={() => {
                               form.setFieldValue('age_group', v);
                             }}
                             className={`px-4 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${
                               ageGroupValue === v 
                                 ? 'border-[#4C3BFF] bg-[#4C3BFF]/10 text-[#4C3BFF] font-medium' 
                                 : 'border-gray-200 bg-white text-gray-600 hover:border-[#4C3BFF]/40 hover:text-[#4C3BFF]'
                             }`}
                           >
                             {getLabel('age_group', v)}
                           </div>
                         ))}
                      </div>
                    </Form.Item>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center">
                      <span className="w-1 h-4 bg-[#4C3BFF] rounded-full mr-2"></span>
                      性别
                    </h4>
                    <Form.Item name="gender" initialValue="female" noStyle>
                      <div className="flex flex-wrap gap-2 mb-4">
                         {['female', 'male'].map(v => (
                           <div
                             key={v}
                             onClick={() => {
                               form.setFieldValue('gender', v);
                             }}
                             className={`px-4 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${
                               genderValue === v 
                                 ? 'border-[#4C3BFF] bg-[#4C3BFF]/10 text-[#4C3BFF] font-medium' 
                                 : 'border-gray-200 bg-white text-gray-600 hover:border-[#4C3BFF]/40 hover:text-[#4C3BFF]'
                             }`}
                           >
                             {getLabel('gender', v)}
                           </div>
                         ))}
                      </div>
                    </Form.Item>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center">
                      <span className="w-1 h-4 bg-[#4C3BFF] rounded-full mr-2"></span>
                      体型
                    </h4>
                    <Form.Item name="body_type" initialValue="standard" noStyle>
                      <div className="flex flex-wrap gap-2 mb-4">
                         {['thin', 'standard', 'chubby', 'muscular'].map(v => (
                           <div
                             key={v}
                             onClick={() => {
                               form.setFieldValue('body_type', v);
                             }}
                             className={`px-4 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${
                               bodyTypeValue === v 
                                 ? 'border-[#4C3BFF] bg-[#4C3BFF]/10 text-[#4C3BFF] font-medium' 
                                 : 'border-gray-200 bg-white text-gray-600 hover:border-[#4C3BFF]/40 hover:text-[#4C3BFF]'
                             }`}
                           >
                             {getLabel('body_type', v)}
                           </div>
                         ))}
                      </div>
                    </Form.Item>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center">
                      <span className="w-1 h-4 bg-[#4C3BFF] rounded-full mr-2"></span>
                      风格
                    </h4>
                    <Form.Item name="style" initialValue="euro" noStyle>
                      <div className="flex flex-wrap gap-2 mb-4">
                         {['euro', 'korean', 'japanese', 'casual'].map(v => (
                           <div
                             key={v}
                             onClick={() => {
                               form.setFieldValue('style', v);
                             }}
                             className={`px-4 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${
                               styleValue === v 
                                 ? 'border-[#4C3BFF] bg-[#4C3BFF]/10 text-[#4C3BFF] font-medium' 
                                 : 'border-gray-200 bg-white text-gray-600 hover:border-[#4C3BFF]/40 hover:text-[#4C3BFF]'
                             }`}
                           >
                             {getLabel('style', v)}
                           </div>
                         ))}
                      </div>
                    </Form.Item>
                  </div>
               </div>
               <div className="p-6 border-t border-gray-100 mt-auto bg-white z-10">
                 <button 
                   type="submit"
                   className="w-full bg-[rgb(55_19_236_/_0.9)] hover:bg-[rgb(55_19_236_/_0.81)] text-white font-bold py-3.5 rounded-full shadow-lg shadow-[#4C3BFF]/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                 >
                   <Check className="w-5 h-5" />
                   添加模特
                 </button>
               </div>
             </div>
          </div>
        </Form>
      </Modal>

      {/* Edit/Delete Modal */}
      <Modal
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={750}
        centered
        destroyOnHidden
        className="rounded-[24px] overflow-hidden"
        closeIcon={<X className="text-gray-400 hover:text-gray-600" />}
        styles={{ body: { padding: 0 } }}
      >
        <div className="flex flex-col md:flex-row h-[500px]">
           {/* Image Preview */}
           <div className="w-full md:w-[40%] bg-gray-50 relative overflow-hidden rounded-3xl">
             <img 
               src={currentModel?.avatar || (currentModel?.images && currentModel?.images[0]?.file_path)} 
               alt="Model" 
               className="w-full h-full object-cover absolute inset-0 rounded-3xl"
             />
           </div>

           {/* Edit Form */}
           <div className="w-full md:w-[55%] p-8 md:pl-10 flex flex-col h-full relative">
             <h3 className="text-xl font-bold text-gray-900 mb-6 mt-0">
               {isEditing ? '编辑模特' : '模特信息'}
             </h3>
             
             <div className="flex-1 overflow-y-hidden pr-0">
                {isEditing ? (
                    /* Edit Mode Fields */
                    <Form 
                      form={editForm} 
                      onFinish={handleEditSubmit} 
                      layout="vertical"
                      initialValues={currentModel}
                    >
                       {/* Same field groups as Add Modal */}
                       {['age_group', 'gender', 'body_type', 'style'].map(field => (
                         <div key={field}>
                           <div className="flex items-center gap-2 mb-2">
                             <div className="w-1 h-4 bg-[#4C3BFF] rounded-full mr-2"></div>
                             <span className="font-bold text-gray-800">
                               {{age_group:'年龄分段', gender:'性别', body_type:'体型', style:'风格'}[field]}
                             </span>
                           </div>
                           <Form.Item name={field} noStyle>
                            <div className="flex flex-wrap gap-2 mb-4">
                               {/* Options... */}
                               {(field === 'gender' ? ['female', 'male'] : 
                                 field === 'age_group' ? ['child', 'youth', 'middle', 'senior'] :
                                 field === 'body_type' ? ['thin', 'standard', 'chubby', 'muscular'] :
                                 ['euro', 'korean', 'japanese', 'casual']
                               ).map(v => (
                                 <div key={v} onClick={() => editForm.setFieldValue(field, v)} className="cursor-pointer">
                                    {/* 简化实现，避免嵌套Form.Item导致循环引用 */}
                                    {/* 使用当前字段名而不是硬编码的age_group */}
                                    <div className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                                      // 仅使用Form.useWatch变量检查当前选中状态，确保选项互斥
                                      ((field === 'age_group' && editAgeGroupValue === v) ||
                                       (field === 'gender' && editGenderValue === v) ||
                                       (field === 'body_type' && editBodyTypeValue === v) ||
                                       (field === 'style' && editStyleValue === v))
                                        ? 'border-[#4C3BFF] bg-[#4C3BFF]/10 text-[#4C3BFF] font-medium' 
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-[#4C3BFF]/40 hover:text-[#4C3BFF]'
                                    }`}>
                                      {getLabel(field, v)}
                                    </div>
                                 </div>
                               ))}
                            </div>
                           </Form.Item>
                         </div>
                       ))}
                    </Form>
                  ) : (
                      /* View Mode Fields */
                      <div className="space-y-6">
                          {[
                            { label: '性别', value: getLabel('gender', currentModel?.gender) },
                            { label: '年龄分段', value: getLabel('age_group', currentModel?.age_group) },
                            { label: '体型', value: getLabel('body_type', currentModel?.body_type) },
                            { label: '风格', value: getLabel('style', currentModel?.style) },
                          ].map((item, idx) => (
                            <div key={idx} className="flex flex-col group">
                              <p className="text-xs text-gray-400 font-normal mb-1">{item.label}</p>
                              <p className="text-base font-bold text-gray-900">{item.value}</p>
                            </div>
                          ))}
                      </div>
                  )}
             </div>

             <div className="mt-6 pt-0 flex gap-3">
               {isEditing ? (
                 <button 
                   onClick={() => editForm.submit()}
                   className="flex-1 bg-[rgb(55_19_236_/_0.9)] hover:bg-[rgb(55_19_236_/_0.81)] text-white font-bold py-3.5 rounded-full shadow-lg shadow-[#4C3BFF]/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                 >
                   <Check className="w-5 h-5" />
                   确认修改
                 </button>
               ) : (
                 <>
                   <button 
                     onClick={() => setDeleteConfirmVisible(true)}
                     className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2.5 rounded-full transition-colors flex items-center justify-center gap-2"
                   >
                     删除模特
                   </button>
                   <button 
                     onClick={() => setIsEditing(true)}
                     className="flex-1 bg-[rgb(55_19_236_/_0.9)] hover:bg-[rgb(55_19_236_/_0.81)] text-white font-bold py-3.5 rounded-full shadow-lg shadow-[#4C3BFF]/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                   >
                     编辑模特信息
                   </button>
                 </>
               )}
             </div>
           </div>
        </div>
      </Modal>

      {/* System Detail Modal */}
      <Modal
        open={systemDetailModalVisible}
        onCancel={() => setSystemDetailModalVisible(false)}
        footer={null}
        width={{ xs: '90%', sm: '85%', md: '80%', lg: 800, xl: 800 }}
        centered
        destroyOnHidden
        className="rounded-[24px] overflow-hidden"
        closeIcon={<X className="text-gray-400 hover:text-gray-600" />}
        styles={{ body: { padding: 0 } }}
      >
        {currentModel && (
          <div className="flex flex-col md:flex-row" style={{ minHeight: '500px' }}>
             <div className="w-full md:w-[40%] bg-gray-100 relative overflow-hidden rounded-[24px]">
               <img 
                 src={currentModel.avatar || (currentModel.images && currentModel.images[0]?.file_path)} 
                 alt="Model" 
                 className="w-full h-full object-cover absolute inset-0 rounded-[24px]"
               />
             </div>
             <div className="w-full md:w-8/12 p-8 flex flex-col h-full justify-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">模特信息</h3>
                <div className="space-y-6">
                    {[
                        { label: '性别', value: getLabel('gender', currentModel.gender) },
                        { label: '年龄分段', value: getLabel('age_group', currentModel.age_group) },
                        { label: '体型', value: getLabel('body_type', currentModel.body_type) },
                        { label: '风格', value: getLabel('style', currentModel.style) },
                    ].map((item, idx) => (
                        <div key={idx} className="flex items-center group">
                            <div>
                                <p className="text-xs text-gray-500 font-medium mb-0.5">{item.label}</p>
                                <p className="text-base font-semibold text-gray-800">{item.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
                    <button 
                        onClick={handleAddSystemModelToMy}
                        className="flex-1 bg-[rgb(55_19_236_/_0.9)] hover:bg-[rgb(55_19_236_/_0.81)] text-white font-bold py-3.5 rounded-full shadow-lg shadow-[#4C3BFF]/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        添加到我的模特
                    </button>
                </div>
                {/* Hidden Field for copy_system_model */}
                <input 
                  type="hidden" 
                  className="copy-system-model" 
                  value={currentModel.copy_system_model || 0} 
                />
             </div>
          </div>
        )}
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
            <span className="text-base text-gray-700 font-medium">确定要删除吗？</span>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirmVisible(false)}
              className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => handleDelete(currentModel?.id)}
              className="px-5 py-2 rounded-lg bg-[rgb(55_19_236_/_0.9)] hover:bg-[rgb(55_19_236_/_0.8)] text-white font-medium transition-colors shadow-sm"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyModel;
