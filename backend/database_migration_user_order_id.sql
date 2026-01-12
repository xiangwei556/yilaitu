-- ============================================
-- 数据库迁移脚本
-- 用户ID和订单号生成规则变更
-- ============================================

-- 说明：
-- 1. 用户ID: 从数据库自增改为应用层生成（17位时间戳+随机数）
-- 2. 订单号: 从ORD前缀改为10开头（15位）
--
-- 新格式示例：
-- - 用户ID: 20251111132440023 (YYYYMMDDHHmmss + 3位随机)
-- - 订单号: 102501111324023 (10 + YYMMDDHHmm + 秒十位 + 2位随机)

-- ============================================
-- 1. 修改users表的id字段（去掉自增）
-- ============================================

-- 注意: MySQL中不能直接去掉AUTO_INCREMENT，需要修改列定义
-- 备份数据前请确保已做完整备份！

-- 方法1: 如果表中没有数据或数据量小，可以直接修改
ALTER TABLE users MODIFY COLUMN id BIGINT NOT NULL;

-- 方法2: 如果担心数据丢失，可以分步骤操作
-- 步骤1: 创建新表
-- CREATE TABLE users_new (
--     id BIGINT NOT NULL PRIMARY KEY,
--     username VARCHAR(50) UNIQUE,
--     nickname VARCHAR(50),
--     avatar VARCHAR(255),
--     gender INTEGER DEFAULT 0,
--     hashed_password VARCHAR(255),
--     status INTEGER DEFAULT 1,
--     role VARCHAR(20) DEFAULT 'user',
--     cancel_at DATETIME,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--     INDEX idx_username (username)
-- );

-- 步骤2: 迁移数据
-- INSERT INTO users_new SELECT * FROM users;

-- 步骤3: 重命名表
-- RENAME TABLE users TO users_old, users_new TO users;

-- 步骤4: 验证后删除旧表
-- DROP TABLE users_old;

-- ============================================
-- 2. 订单表不需要修改结构
-- ============================================
-- order_no字段已经是VARCHAR(50)类型，足够存储新的15位订单号
-- 新订单将使用新格式，旧订单保持原格式

-- ============================================
-- 3. 相关外键表无需修改
-- ============================================
-- user_credentials.user_id: BIGINT，无需修改
-- login_sessions.user_id: BIGINT，无需修改
-- user_memberships.user_id: BIGINT，无需修改
-- points_account.user_id: BIGINT，无需修改
-- order_reservation.user_id: BIGINT，无需修改

-- ============================================
-- 4. 验证查询
-- ============================================

-- 检查users表结构
-- DESCRIBE users;

-- 检查是否还有AUTO_INCREMENT
-- SHOW CREATE TABLE users;

-- 检查外键约束
-- SELECT
--     TABLE_NAME,
--     COLUMN_NAME,
--     CONSTRAINT_NAME,
--     REFERENCED_TABLE_NAME,
--     REFERENCED_COLUMN_NAME
-- FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
-- WHERE REFERENCED_TABLE_NAME = 'users';

-- ============================================
-- 回滚脚本（如需要）
-- ============================================
-- ALTER TABLE users MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT;
