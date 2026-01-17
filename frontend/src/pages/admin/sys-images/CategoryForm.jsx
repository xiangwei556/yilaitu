import React, { useState, useEffect, useRef } from 'react';
import { Button, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ProForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { createCategory, getCategoryDetail, updateCategory } from '../../../api/sysImages';

const CategoryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const isEdit = !!id;
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      if (isEdit) {
        fetchDetail();
      }
      hasMounted.current = true;
    }
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await getCategoryDetail(id);
      return res;
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
      if (isEdit) {
        await updateCategory(id, values);
        message.success('更新成功');
      } else {
        await createCategory(values);
        message.success('创建成功');
      }
      navigate('/admin/sys-images/categories');
    } catch (error) {
      message.error(isEdit ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProForm
      title={isEdit ? '编辑类目' : '新增类目'}
      onFinish={handleSubmit}
      request={isEdit ? fetchDetail : undefined}
      initialValues={{ status: 'enabled' }}
      submitter={{
        render: (_, dom) => (
          <div style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '保存' : '创建'}
            </Button>
            <Button onClick={() => navigate('/admin/sys-images/categories')} style={{ marginLeft: 8 }}>
              取消
            </Button>
          </div>
        ),
      }}
    >
      <ProFormText
        name="name"
        label="类目名称"
        placeholder="请输入类目名称"
        rules={[{ required: true, message: '请输入类目名称' }]}
      />

      <ProFormSelect
        name="status"
        label="状态"
        options={[
          { label: '启用', value: 'enabled' },
          { label: '禁用', value: 'disabled' },
        ]}
      />
    </ProForm>
  );
};

export default CategoryForm;
