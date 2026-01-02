-- 添加复合索引以优化按用户ID查询并按创建时间排序的性能
CREATE INDEX idx_user_id_create_time ON original_image_record(user_id, create_time);