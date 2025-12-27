import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { Modal, Form, Upload, message } from 'antd';
import { createMyModel } from '../api/yilaitumodel';

const AddModelModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}> = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  
  const ageGroupValue = Form.useWatch('age_group', form);
  const genderValue = Form.useWatch('gender', form);
  const bodyTypeValue = Form.useWatch('body_type', form);
  const styleValue = Form.useWatch('style', form);

  const normFile = (e: any) => {
    let fileList = [];
    if (Array.isArray(e)) {
      fileList = e;
    } else {
      fileList = e?.fileList || [];
    }
    setUploadedFile(fileList[0] || null);
    return fileList;
  };

  const getLabel = (type: string, value: string) => {
    const maps: any = {
      gender: { male: '男', female: '女' },
      age_group: { child: '儿童', youth: '青年', middle: '中年', senior: '老年' },
      body_type: { standard: '标准', chubby: '微胖', thin: '偏瘦', muscular: '健硕' },
      style: { euro: '时尚', korean: '休闲', japanese: '商务', casual: '街头' }
    };
    return maps[type]?.[value] || value;
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
      
      form.resetFields();
      setUploadedFile(null);
      
      message.success({
        content: '添加模特成功',
        style: { marginTop: '40vh' },
        duration: 2
      });
      
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      message.error('添加失败');
    }
  };

  return (
    <Modal
      title="添加模特"
      open={visible}
      onCancel={onClose}
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
             
             <div className="w-full max-w-[320px] mx-auto">
               <div className="flex items-center justify-between mb-2">
                 <span className="text-xs text-gray-500 font-medium">示例参考</span>
               </div>
               <div className="grid grid-cols-4 gap-2">
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
  );
};

export default AddModelModal;