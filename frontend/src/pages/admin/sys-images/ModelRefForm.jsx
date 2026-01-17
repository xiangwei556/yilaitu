import React, { useState, useEffect, useRef } from 'react';
import { Button, message, Image } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ProForm, ProFormSelect, ProFormUploadButton } from '@ant-design/pro-components';
import { createModelRef, getModelRefDetail, updateModelRef, listCategories } from '../../../api/sysImages';

const ModelRefForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [categories, setCategories] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(null);
  const isEdit = !!id;
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      fetchCategories();
      if (isEdit) {
        fetchDetail();
      }
      hasMounted.current = true;
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await listCategories({ page: 1, page_size: 500, status: 'enabled' });
      setCategories(res.items || []);
    } catch (error) {
      message.error('获取类目列表失败');
    }
  };

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await getModelRefDetail(id);
      const data = res;
      return {
        ...data,
        category_ids: data.categories?.map(c => c.id) || []
      };
    } catch (error) {
      message.error('获取详情失败');
      return {};
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const submitData = {
        ...values,
        file: uploadingFile
      };
      if (isEdit) {
        await updateModelRef(id, submitData);
        message.success('更新成功');
        navigate('/admin/sys-images/model-refs');
      } else {
        await createModelRef(submitData);
        message.success('创建成功');
        navigate('/admin/sys-images/model-refs');
      }
    } catch (error) {
      message.error(isEdit ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = ({ file }) => {
    setUploadingFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <ProForm
      title={isEdit ? '编辑模特参考图' : '新增模特参考图'}
      onFinish={handleSubmit}
      request={isEdit ? fetchDetail : undefined}
      initialValues={{ status: 'enabled', category_ids: [] }}
      submitter={{
        render: (_, dom) => (
          <div style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '保存' : '创建'}
            </Button>
            <Button onClick={() => navigate('/admin/sys-images/model-refs')} style={{ marginLeft: 8 }}>
              取消
            </Button>
          </div>
        ),
      }}
      onFinishFailed={(errorInfo) => {
        console.log('Failed:', errorInfo);
      }}
    >
      <ProFormSelect
        name="gender"
        label="性别"
        placeholder="请选择性别"
        options={[
          { label: '男', value: 'male' },
          { label: '女', value: 'female' },
        ]}
        rules={[{ required: true, message: '请选择性别' }]}
      />

      <ProFormSelect
        name="age_group"
        label="年龄分段"
        placeholder="请选择年龄分段"
        options={[
          { label: '儿童', value: 'child' },
          { label: '青年', value: 'youth' },
          { label: '中年', value: 'middle' },
          { label: '老年', value: 'senior' },
        ]}
        rules={[{ required: true, message: '请选择年龄分段' }]}
      />

      <ProFormSelect
        name="category_ids"
        label="服装类目"
        placeholder="请选择服装类目（可多选）"
        mode="multiple"
        options={categories.map(c => ({ label: c.name, value: c.id }))}
      />

      <ProFormSelect
        name="status"
        label="状态"
        options={[
          { label: '启用', value: 'enabled' },
          { label: '禁用', value: 'disabled' },
        ]}
      />

      <ProFormUploadButton
        name="file"
        label="模特参考图片"
        max={1}
        fieldProps={{
          listType: 'picture-card',
          showUploadList: false,
          customRequest: handleUpload,
          accept: 'image/*',
        }}
        extra={imageUrl ? (
          <div style={{ marginTop: 16 }}>
            <Image
              src={imageUrl}
              width={200}
              style={{ borderRadius: 8 }}
            />
          </div>
        ) : null}
      />
    </ProForm>
  );
};

export default ModelRefForm;
