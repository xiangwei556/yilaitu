import React from 'react';
import { Button, Upload, message, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { ProForm, ProFormSelect, ProFormText } from '@ant-design/pro-components';
import { createModel, updateModel, uploadModelImage, getModelDetail } from '../../../api/yilaitumodel';
import { useNavigate, useParams } from 'react-router-dom';

const options = {
  genders: [{ label: '男', value: 'male' }, { label: '女', value: 'female' }],
  age_groups: [
    { label: '儿童', value: 'child' }, { label: '青年', value: 'youth' }, { label: '中年', value: 'middle' }, { label: '老年', value: 'senior' }
  ],
  body_types: [{ label: '标准', value: 'standard' }, { label: '微胖', value: 'chubby' }, { label: '偏瘦', value: 'thin' }],
  styles: [{ label: '欧美', value: 'euro' }, { label: '韩系', value: 'korean' }, { label: '日系', value: 'japanese' }],
  status: [{ label: '启用', value: 'enabled' }, { label: '禁用', value: 'disabled' }]
};

const ModelForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [images, setImages] = React.useState([]);
  const [hovered, setHovered] = React.useState(false);

  React.useEffect(() => {
    if (isEdit) {
      getModelDetail(id).then((data) => {
        if (data.images && data.images.length > 0) {
          setImages(data.images);
        }
      });
    }
  }, [id]);

  const onFinish = async (values) => {
    try {
      if (isEdit) {
        await updateModel(id, values);
        message.success('修改成功，用户端将立即更新');
      } else {
        const res = await createModel(values);
        message.success('新增成功');
        navigate(`/admin/yilaitumodel/models/${res.id}/edit`);
      }
    } catch (e) {
      message.error('提交失败，请重试');
    }
  };

  const customUpload = async ({ file }) => {
    try {
      const targetId = id;
      if (!targetId) {
        message.error('请先提交基础信息，之后再上传图片');
        return;
      }
      await uploadModelImage(targetId, file, { is_cover: false });
      message.success('上传成功');
    } catch {
      message.error('上传失败，请重试');
    }
  };

  return (
    <div style={{ 
      padding: '0px 0px', 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      transition: 'all 0.3s ease'
    }}>
      <Card 
        title={isEdit ? '编辑模特' : '新增模特'} 
        style={{ 
          marginBottom: 16, 
          boxShadow: 'none',
          border: 'none',
          transition: 'all 0.3s ease'
        }}
      >
        <ProForm
          onFinish={onFinish}
          submitter={{
            render: (_, dom) => (
              <div style={{ marginLeft: 'auto' }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large" 
                  style={{ 
                    marginRight: 12, 
                    boxShadow: '0 2px 8px rgba(24, 144, 255, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.2)'}
                >
                  {isEdit ? '保存修改' : '提交新增'}
                </Button>
                <Button 
                  size="large" 
                  onClick={() => navigate('/admin/yilaitumodel/models')}
                  style={{ transition: 'all 0.3s ease' }}
                >
                  返回列表
                </Button>
              </div>
            ),
          }}
          layout="inline"
          style={{ width: '100%', flexWrap: 'wrap', gap: '16px' }}
        >
          <ProFormText
            name="type"
            initialValue="system"
            hidden
          />
          
          <ProFormSelect
            name="gender"
            label="性别"
            options={options.genders}
            rules={[{ required: true, message: '请选择性别' }]}
            style={{ width: 120, transition: 'all 0.3s ease' }}
          />

          <ProFormSelect
            name="age_group"
            label="年龄分段"
            options={options.age_groups}
            rules={[{ required: true, message: '请选择年龄分段' }]}
            style={{ width: 140, transition: 'all 0.3s ease' }}
          />

          <ProFormSelect
            name="body_type"
            label="体型"
            options={options.body_types}
            rules={[{ required: true, message: '请选择体型' }]}
            style={{ width: 120, transition: 'all 0.3s ease' }}
          />

          <ProFormSelect
            name="style"
            label="风格"
            options={options.styles}
            rules={[{ required: true, message: '请选择风格' }]}
            style={{ width: 140, transition: 'all 0.3s ease' }}
          />

          <ProFormSelect
            name="status"
            label="状态"
            options={options.status}
            initialValue="enabled"
            style={{ width: 120, transition: 'all 0.3s ease' }}
          />
        </ProForm>
      </Card>

      <Card 
        title="素材上传" 
        style={{ 
          boxShadow: 'none',
          border: 'none',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ marginTop: 12 }}>

        {images.length > 0 && (
          <div 
            style={{ 
              position: 'relative', 
              display: 'inline-block', 
              marginTop: 12,
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <img 
              src={images.find(img => img.is_cover)?.file_path || images[0].file_path} 
              alt="模特图片"
              style={{ 
                display: 'block', 
                maxWidth: '100%', 
                height: 'auto',
                borderRadius: 8,
                transition: 'all 0.3s ease'
              }}
            />
            <div 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                background: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.3s ease'
              }}
            >
              <Upload 
                customRequest={async ({ file }) => {
                  try {
                    const targetId = id;
                    if (!targetId) {
                      message.error('请先提交基础信息，之后再上传图片');
                      return;
                    }
                    await uploadModelImage(targetId, file, { is_cover: true });
                    message.success('上传成功');
                    const data = await getModelDetail(id);
                    if (data.images && data.images.length > 0) {
                      setImages([...data.images]);
                    }
                  } catch (error) {
                    message.error('上传失败，请重试');
                    console.error('图片上传失败:', error);
                  }
                }}
                showUploadList={false}
                style={{ width: '100%', height: '100%' }}
              >
                <Button type="primary" size="large" style={{ opacity: 1 }}>
                  重新上传图片
                </Button>
              </Upload>
            </div>
          </div>
        )}

        {images.length === 0 && (
          <div style={{ padding: '32px', backgroundColor: '#fafafa', borderRadius: 8, border: '2px dashed #d9d9d9', textAlign: 'center', transition: 'all 0.3s ease' }}>
            <Upload 
              customRequest={async ({ file }) => {
                try {
                  const targetId = id;
                  if (!targetId) {
                    message.error('请先提交基础信息，之后再上传图片');
                    return;
                  }
                  await uploadModelImage(targetId, file, { is_cover: true });
                  message.success('上传成功');
                  const data = await getModelDetail(id);
                  if (data.images && data.images.length > 0) {
                    setImages([...data.images]);
                  }
                } catch (error) {
                  message.error('上传失败，请重试');
                  console.error('图片上传失败:', error);
                }
              }}
              showUploadList={false}
              style={{ width: '100%' }}
            >
              <Button type="primary" icon={<UploadOutlined />} size="large">
                上传模特图片
              </Button>
            </Upload>
            <p style={{ margin: '16px 0 0 0', color: '#999', fontSize: '14px' }}>
              支持 JPG、PNG 等格式，建议尺寸不小于 500 x 500 像素
            </p>
          </div>
        )}
        </div>
      </Card>
    </div>
  );
};

export default ModelForm;

