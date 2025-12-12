import React, { useState } from 'react';
import { Button, Upload, message, Modal, Form, Input, Select } from 'antd';
import { UploadOutlined, EditOutlined, DownloadOutlined, HistoryOutlined, ClockCircleOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/useAuthStore';
import './ImageEdit.css';

const { Option } = Select;

interface EditHistoryItem {
  id: string;
  type: string;
  params: Record<string, any>;
  timestamp: Date;
}

const ImageEdit: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('crop');
  const [editHistory, setEditHistory] = useState<EditHistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const { user } = useAuthStore();

  // Mock image processing function
  const processImage = (tool: string, params: Record<string, any>) => {
    setIsProcessing(true);
    setProcessingStep(0);

    // Simulate processing steps
    const interval = setInterval(() => {
      setProcessingStep(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          
          // Add to history
          const newHistory: EditHistoryItem = {
            id: Date.now().toString(),
            type: tool,
            params,
            timestamp: new Date()
          };
          setEditHistory(prev => [newHistory, ...prev]);
          
          message.success('Image processed successfully!');
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleUpload = (info: any) => {
    if (info.file.status === 'done') {
      // In a real app, this would be the uploaded image URL
      const mockImageUrl = 'https://via.placeholder.com/800x600/3498db/ffffff?text=Uploaded+Image';
      setImageUrl(mockImageUrl);
      message.success('Image uploaded successfully!');
    } else if (info.file.status === 'error') {
      message.error('Image upload failed!');
    }
  };

  const handleDownload = () => {
    if (!imageUrl) {
      message.warning('Please upload an image first!');
      return;
    }
    // In a real app, this would download the processed image
    message.info('Image download started!');
  };

  const handleToolChange = (tool: string) => {
    setSelectedTool(tool);
  };

  const handleApply = () => {
    if (!imageUrl) {
      message.warning('Please upload an image first!');
      return;
    }
    processImage(selectedTool, { tool: selectedTool });
  };

  return (
    <div className="image-edit-container">
      <div className="edit-header">
        <div className="edit-tools">
          <Button 
            type={selectedTool === 'crop' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => handleToolChange('crop')}
            className="tool-button"
          >
            裁剪
          </Button>
          <Button 
            type={selectedTool === 'filter' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => handleToolChange('filter')}
            className="tool-button"
          >
            滤镜
          </Button>
          <Button 
            type={selectedTool === 'resize' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => handleToolChange('resize')}
            className="tool-button"
          >
            调整尺寸
          </Button>
          <Button 
            type={selectedTool === 'text' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => handleToolChange('text')}
            className="tool-button"
          >
            添加文字
          </Button>
          <Button 
            type={selectedTool === 'watermark' ? 'primary' : 'default'}
            icon={<EditOutlined />}
            onClick={() => handleToolChange('watermark')}
            className="tool-button"
          >
            水印
          </Button>
        </div>
        <div className="edit-actions">
          <Upload
            name="file"
            accept="image/*"
            showUploadList={false}
            customRequest={({ file, onSuccess }) => {
              // Simulate upload
              setTimeout(() => {
                onSuccess({}, file);
              }, 1000);
            }}
            onChange={handleUpload}
          >
            <Button icon={<UploadOutlined />}>上传图片</Button>
          </Upload>
          <Button 
            type="primary" 
            onClick={handleApply} 
            icon={<EditOutlined />}
            loading={isProcessing}
            disabled={!imageUrl || isProcessing}
            className="apply-button"
          >
            {isProcessing ? '处理中...' : '应用'}
          </Button>
          <Button 
            onClick={handleDownload} 
            icon={<DownloadOutlined />}
            disabled={!imageUrl}
          >
            下载
          </Button>
          <Button 
            onClick={() => setShowHistoryModal(true)} 
            icon={<HistoryOutlined />}
          >
            历史记录
          </Button>
        </div>
      </div>

      <div className="edit-content">
        <div className="image-preview">
          {imageUrl ? (
            <div className="preview-wrapper">
              <img src={imageUrl} alt="Preview" className="preview-image" />
              {isProcessing && (
                <div className="processing-overlay">
                  <div className="processing-content">
                    <ClockCircleOutlined className="processing-icon" spin />
                    <div className="processing-text">
                      <p>正在处理图片...</p>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${processingStep}%` }}
                        ></div>
                      </div>
                      <p>{processingStep}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-preview">
              <UploadOutlined className="empty-icon" />
              <p>点击上方上传图片开始编辑</p>
            </div>
          )}
        </div>

        <div className="tool-panel">
          <h3>工具设置</h3>
          {selectedTool === 'crop' && (
            <div className="tool-settings">
              <Form layout="vertical">
                <Form.Item label="裁剪比例">
                  <Select defaultValue="1:1">
                    <Option value="1:1">1:1</Option>
                    <Option value="4:3">4:3</Option>
                    <Option value="16:9">16:9</Option>
                    <Option value="3:4">3:4</Option>
                    <Option value="custom">自定义</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="自定义尺寸">
                  <div className="custom-size">
                    <Input placeholder="宽度" type="number" />
                    <span className="size-separator">x</span>
                    <Input placeholder="高度" type="number" />
                  </div>
                </Form.Item>
              </Form>
            </div>
          )}

          {selectedTool === 'filter' && (
            <div className="tool-settings">
              <Form layout="vertical">
                <Form.Item label="滤镜类型">
                  <Select defaultValue="none">
                    <Option value="none">无</Option>
                    <Option value="grayscale">黑白</Option>
                    <Option value="sepia">复古</Option>
                    <Option value="warm">暖色</Option>
                    <Option value="cool">冷色</Option>
                    <Option value="vintage">老照片</Option>
                    <Option value="cyberpunk">赛博朋克</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="强度">
                  <Input type="range" min="0" max="100" defaultValue="50" />
                </Form.Item>
              </Form>
            </div>
          )}

          {selectedTool === 'resize' && (
            <div className="tool-settings">
              <Form layout="vertical">
                <Form.Item label="新尺寸">
                  <div className="custom-size">
                    <Input placeholder="宽度" type="number" />
                    <span className="size-separator">x</span>
                    <Input placeholder="高度" type="number" />
                  </div>
                </Form.Item>
                <Form.Item label="保持比例">
                  <input type="checkbox" defaultChecked />
                </Form.Item>
              </Form>
            </div>
          )}

          {selectedTool === 'text' && (
            <div className="tool-settings">
              <Form layout="vertical">
                <Form.Item label="文字内容">
                  <Input placeholder="输入文字" />
                </Form.Item>
                <Form.Item label="字体大小">
                  <Select defaultValue="16">
                    <Option value="12">12px</Option>
                    <Option value="16">16px</Option>
                    <Option value="20">20px</Option>
                    <Option value="24">24px</Option>
                    <Option value="32">32px</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="颜色">
                  <Input type="color" defaultValue="#000000" />
                </Form.Item>
              </Form>
            </div>
          )}

          {selectedTool === 'watermark' && (
            <div className="tool-settings">
              <Form layout="vertical">
                <Form.Item label="水印类型">
                  <Select defaultValue="text">
                    <Option value="text">文字水印</Option>
                    <Option value="image">图片水印</Option>
                    <Option value="logo">logo水印</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="透明度">
                  <Input type="range" min="0" max="100" defaultValue="50" />
                </Form.Item>
                <Form.Item label="位置">
                  <Select defaultValue="bottom-right">
                    <Option value="top-left">左上角</Option>
                    <Option value="top-right">右上角</Option>
                    <Option value="bottom-left">左下角</Option>
                    <Option value="bottom-right">右下角</Option>
                    <Option value="center">居中</Option>
                  </Select>
                </Form.Item>
              </Form>
            </div>
          )}
        </div>
      </div>

      {/* Edit History Modal */}
      <Modal
        title="编辑历史"
        open={showHistoryModal}
        onCancel={() => setShowHistoryModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowHistoryModal(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <div className="history-list">
          {editHistory.length === 0 ? (
            <div className="empty-history">
              <HistoryOutlined className="empty-history-icon" />
              <p>暂无编辑历史</p>
            </div>
          ) : (
            editHistory.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-icon">
                  <EditOutlined />
                </div>
                <div className="history-info">
                  <div className="history-type">
                    {item.type === 'crop' && '裁剪'}
                    {item.type === 'filter' && '滤镜'}
                    {item.type === 'resize' && '调整尺寸'}
                    {item.type === 'text' && '添加文字'}
                    {item.type === 'watermark' && '水印'}
                  </div>
                  <div className="history-time">
                    {item.timestamp.toLocaleString()}
                  </div>
                  <div className="history-params">
                    {Object.entries(item.params).map(([key, value]) => (
                      <span key={key} className="param-tag">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="history-actions">
                  <Button 
                    type="text" 
                    icon={<ClockCircleOutlined />}
                    size="small"
                  >
                    恢复此状态
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Processing Status Modal */}
      <Modal
        title="处理进度"
        open={isProcessing}
        footer={null}
        closable={false}
        maskClosable={false}
      >
        <div className="processing-modal-content">
          <div className="processing-step">
            <CheckOutlined className={`step-icon ${processingStep >= 25 ? 'completed' : ''}`} />
            <span>图像加载完成</span>
          </div>
          <div className="processing-step">
            <CheckOutlined className={`step-icon ${processingStep >= 50 ? 'completed' : ''}`} />
            <span>应用编辑效果</span>
          </div>
          <div className="processing-step">
            <CheckOutlined className={`step-icon ${processingStep >= 75 ? 'completed' : ''}`} />
            <span>图像渲染</span>
          </div>
          <div className="processing-step">
            <CheckOutlined className={`step-icon ${processingStep >= 100 ? 'completed' : ''}`} />
            <span>处理完成</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ImageEdit;