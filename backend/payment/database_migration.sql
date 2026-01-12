-- 支付系统数据库迁移脚本

-- 1. 扩展订单表，添加支付相关字段
ALTER TABLE orders 
ADD COLUMN payment_no VARCHAR(100) COMMENT '支付平台订单号' AFTER payment_time,
ADD COLUMN qr_code_url TEXT COMMENT '支付二维码URL' AFTER payment_no,
ADD COLUMN qr_code_expire_at DATETIME COMMENT '二维码过期时间' AFTER qr_code_url,
ADD COLUMN callback_data TEXT COMMENT '支付回调原始数据(JSON)' AFTER qr_code_expire_at,
ADD COLUMN notify_url VARCHAR(255) COMMENT '支付回调通知地址' AFTER callback_data,
ADD COLUMN expire_at DATETIME COMMENT '订单过期时间' AFTER notify_url,
ADD COLUMN retry_count INT DEFAULT 0 COMMENT '支付状态查询重试次数' AFTER expire_at;

-- 添加索引
ALTER TABLE orders 
ADD INDEX idx_payment_no (payment_no),
ADD INDEX idx_status_created (status, created_at);

-- 2. 创建支付记录表
CREATE TABLE IF NOT EXISTS payment_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(50) NOT NULL COMMENT '订单号',
    payment_no VARCHAR(100) COMMENT '支付平台订单号',
    payment_method VARCHAR(20) NOT NULL COMMENT '支付方式: wechat, alipay',
    action_type VARCHAR(50) NOT NULL COMMENT '操作类型: create, callback, query, refund',
    amount DECIMAL(10, 2) NOT NULL COMMENT '金额',
    status VARCHAR(20) NOT NULL COMMENT '状态: success, failed, pending',
    request_data TEXT COMMENT '请求数据(JSON)',
    response_data TEXT COMMENT '响应数据(JSON)',
    error_message TEXT COMMENT '错误信息',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_no (order_no),
    INDEX idx_payment_no (payment_no),
    INDEX idx_created_at (created_at)
) COMMENT='支付记录表' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;