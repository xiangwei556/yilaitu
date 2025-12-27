-- 更新模特表，添加type和user_id字段
ALTER TABLE yilaitu_models ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'system'; -- system, user
ALTER TABLE yilaitu_models ADD COLUMN user_id BIGINT; -- 关联创建者用户ID
