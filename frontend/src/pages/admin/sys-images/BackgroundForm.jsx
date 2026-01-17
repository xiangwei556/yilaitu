import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Select, Button, Space, Upload, message, Image } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { createBackground, getBackgroundDetail, updateBackground } from '../../../api/sysImages';

const BackgroundForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(null);
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
      const res = await getBackgroundDetail(id);
      form.setFieldsValue(res);
      setImageUrl(res.image_url);
    } catch (error) {
      message.error('获取详情失败');
    }
    setLoading(false);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const submitData = {
        ...values,
        file: uploadingFile
      };
      if (isEdit) {
        await updateBackground(id, submitData);
        message.success('更新成功');
        navigate('/admin/sys-images/backgrounds');
      } else {
        await createBackground(submitData);
        message.success('创建成功');
        navigate('/admin/sys-images/backgrounds');
      }
    } catch (error) {
      message.error(isEdit ? '更新失败' : '创建失败');
    }
    setLoading(false);
  };

  const handleUpload = ({ file }) => {
    setUploadingFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传图片</div>
    </div>
  );

  return (
    <Card title={isEdit ? '编辑背景图' : '新增背景图'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ status: 'enabled' }}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          name="name"
          label="背景名称"
          rules={[{ required: true, message: '请输入背景名称' }]}
        >
          <Input placeholder="请输入背景名称" />
        </Form.Item>

        <Form.Item name="status" label="状态">
          <Select>
            <Select.Option value="enabled">启用</Select.Option>
            <Select.Option value="disabled">禁用</Select.Option>
          </Select>
        </Form.Item>
      </Form>

      <Card title="背景图片" style={{ marginTop: 16 }}>
        <Space direction="vertical" size="middle">
          {imageUrl && (
            <Image
              src={imageUrl}
              width={200}
              style={{ borderRadius: 8 }}
            />
          )}
          <Upload
            showUploadList={false}
            customRequest={handleUpload}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>
              {imageUrl ? '重新上传' : '上传图片'}
            </Button>
          </Upload>
        </Space>
      </Card>

      <Space style={{ marginTop: 16 }}>
        <Button type="primary" htmlType="submit" loading={loading} onClick={() => form.submit()}>
          {isEdit ? '保存' : '创建'}
        </Button>
        <Button onClick={() => navigate('/admin/sys-images/backgrounds')}>
          取消
        </Button>
      </Space>
    </Card>
  );
};

export default BackgroundForm;
