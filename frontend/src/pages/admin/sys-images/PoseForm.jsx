import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Select, Button, Space, Upload, message, Image, Row, Col } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { createPose, getPoseDetail, updatePose } from '../../../api/sysImages';

const PoseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [skeletonUrl, setSkeletonUrl] = useState(null);
  const [uploadingImageFile, setUploadingImageFile] = useState(null);
  const [uploadingSkeletonFile, setUploadingSkeletonFile] = useState(null);
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
      const res = await getPoseDetail(id);
      form.setFieldsValue(res);
      setImageUrl(res.image_url);
      setSkeletonUrl(res.skeleton_url);
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
        image_file: uploadingImageFile,
        skeleton_file: uploadingSkeletonFile
      };
      if (isEdit) {
        await updatePose(id, submitData);
        message.success('更新成功');
        navigate('/admin/sys-images/poses');
      } else {
        await createPose(submitData);
        message.success('创建成功');
        navigate('/admin/sys-images/poses');
      }
    } catch (error) {
      message.error(isEdit ? '更新失败' : '创建失败');
    }
    setLoading(false);
  };

  const handleUploadImage = ({ file }) => {
    setUploadingImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSkeleton = ({ file }) => {
    setUploadingSkeletonFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSkeletonUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card title={isEdit ? '编辑姿势图' : '新增姿势图'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ status: 'enabled', gender: 'all' }}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          name="name"
          label="姿势名称"
          rules={[{ required: true, message: '请输入姿势名称' }]}
        >
          <Input placeholder="请输入姿势名称" />
        </Form.Item>

        <Form.Item
          name="gender"
          label="性别"
          rules={[{ required: true, message: '请选择性别' }]}
        >
          <Select placeholder="请选择性别">
            <Select.Option value="male">男</Select.Option>
            <Select.Option value="female">女</Select.Option>
            <Select.Option value="all">通用</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="status" label="状态">
          <Select>
            <Select.Option value="enabled">启用</Select.Option>
            <Select.Option value="disabled">禁用</Select.Option>
          </Select>
        </Form.Item>
      </Form>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="姿势图片">
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
                customRequest={handleUploadImage}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />}>
                  {imageUrl ? '重新上传' : '上传姿势图'}
                </Button>
              </Upload>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="骨架图">
            <Space direction="vertical" size="middle">
              {skeletonUrl && (
                <Image
                  src={skeletonUrl}
                  width={200}
                  style={{ borderRadius: 8 }}
                />
              )}
              <Upload
                showUploadList={false}
                customRequest={handleUploadSkeleton}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />}>
                  {skeletonUrl ? '重新上传' : '上传骨架图'}
                </Button>
              </Upload>
            </Space>
          </Card>
        </Col>
      </Row>

      <Space style={{ marginTop: 16 }}>
        <Button type="primary" htmlType="submit" loading={loading} onClick={() => form.submit()}>
          {isEdit ? '保存' : '创建'}
        </Button>
        <Button onClick={() => navigate('/admin/sys-images/poses')}>
          取消
        </Button>
      </Space>
    </Card>
  );
};

export default PoseForm;
