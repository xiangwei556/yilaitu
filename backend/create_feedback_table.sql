-- 创建 feedback 表
CREATE TABLE IF NOT EXISTS `feedback` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '唯一的ID，主键',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `feedback_type` INT NOT NULL COMMENT '反馈类型的枚举（1、背景不符，2、人物变形，3、服装失真，4、色彩偏差，5、细节模糊，6、其他问题）',
  `content` TEXT COMMENT '反馈内容',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '反馈时间',
  `reply_content` TEXT COMMENT '处理回复内容',
  `reply_time` DATETIME COMMENT '处理回复时间',
  `original_image_record_id` BIGINT COMMENT '关联的生图记录ID',
  `model_id` INT COMMENT '模型ID(1、模特图生成，2、白底图生成)',
  `status` VARCHAR(50) NOT NULL DEFAULT '未处理' COMMENT '反馈状态（已处理已返还积分、已处理不返还积分、未处理）',
  `points_transactions_id` BIGINT COMMENT '对应积分明细表主键id，如果已处理已返还积分，则记录返还的积分明细id，否则为空',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_original_image_record_id` (`original_image_record_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='反馈表';

-- 修改 original_image_record 表，添加 feedback_id 字段
ALTER TABLE `original_image_record` 
ADD COLUMN `feedback_id` BIGINT COMMENT '关联的反馈记录ID' AFTER `points_transactions_id`,
ADD KEY `idx_feedback_id` (`feedback_id`);
