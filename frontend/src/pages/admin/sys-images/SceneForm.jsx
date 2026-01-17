import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Select, Button, Space, Upload, message, Image } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { createScene, getSceneDetail, updateScene, uploadSceneImage } from '../../../api/sysImages';

const SceneForm = () => {
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
      const res = await getSceneDetail(id);
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
        await updateScene(id, submitData);
        message.success('更新成功');
        navigate('/admin/sys-images/scenes');
      } else {
        await createScene(submitData);
        message.success('创建成功');
        navigate('/admin/sys-images/scenes');
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

  return (
    <Card title={isEdit ? '编辑场景图' : '新增场景图'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ status: 'enabled', style: 1 }}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          name="name"
          label="场景名称"
          rules={[{ required: true, message: '请输入场景名称' }]}
        >
          <Input placeholder="请输入场景名称" />
        </Form.Item>

        <Form.Item
          name="style"
          label="风格"
          rules={[{ required: true, message: '请选择风格' }]}
        >
          <Select placeholder="请选择风格">
            <Select.Option value={1}>日常生活风</Select.Option>
            <Select.Option value={2}>时尚杂志风</Select.Option>
            <Select.Option value={3}>运动活力风</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="status" label="状态">
          <Select>
            <Select.Option value="enabled">启用</Select.Option>
            <Select.Option value="disabled">禁用</Select.Option>
          </Select>
        </Form.Item>
      </Form>

      <Card title="场景图片" style={{ marginTop: 16 }}>
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
        <Button onClick={() => navigate('/admin/sys-images/scenes')}>
          取消
        </Button>
      </Space>
    </Card>
  );
};

export default SceneForm;
