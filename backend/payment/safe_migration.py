"""
安全的支付系统数据库迁移脚本 - 检查字段是否存在再执行
"""
import sys
import os

# 添加项目根目录到路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from sqlalchemy import create_engine, text, inspect
from backend.passport.app.core.config import settings
from backend.passport.app.core.logging import logger

def column_exists(inspector, table_name, column_name):
    """检查表中字段是否存在"""
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def table_exists(engine, table_name):
    """检查表是否存在"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def run_safe_migration():
    """执行安全的数据库迁移"""
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
        inspector = inspect(engine)
        
        print("开始执行支付系统数据库迁移...")
        
        # 检查orders表的字段
        if not table_exists(engine, 'orders'):
            print("[错误] orders表不存在！")
            return False
        
        print("\n1. 检查并添加订单表字段...")
        orders_columns_to_add = [
            ('payment_no', "VARCHAR(100) COMMENT '支付平台订单号' AFTER payment_time"),
            ('qr_code_url', "TEXT COMMENT '支付二维码URL'"),
            ('qr_code_expire_at', "DATETIME COMMENT '二维码过期时间'"),
            ('callback_data', "TEXT COMMENT '支付回调原始数据(JSON)'"),
            ('notify_url', "VARCHAR(255) COMMENT '支付回调通知地址'"),
            ('expire_at', "DATETIME COMMENT '订单过期时间'"),
            ('retry_count', "INT DEFAULT 0 COMMENT '支付状态查询重试次数'")
        ]
        
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                for col_name, col_def in orders_columns_to_add:
                    if not column_exists(inspector, 'orders', col_name):
                        sql = f"ALTER TABLE orders ADD COLUMN {col_name} {col_def}"
                        print(f"  添加字段: {col_name}")
                        conn.execute(text(sql))
                    else:
                        print(f"  字段已存在，跳过: {col_name}")
                
                # 检查并添加索引
                print("\n2. 检查并添加索引...")
                
                # 检查payment_no索引
                indexes = [idx['name'] for idx in inspector.get_indexes('orders')]
                if 'idx_payment_no' not in indexes:
                    print("  添加索引: idx_payment_no")
                    conn.execute(text("ALTER TABLE orders ADD INDEX idx_payment_no (payment_no)"))
                else:
                    print("  索引已存在，跳过: idx_payment_no")
                
                # 检查status_created索引
                if 'idx_status_created' not in indexes:
                    print("  添加索引: idx_status_created")
                    conn.execute(text("ALTER TABLE orders ADD INDEX idx_status_created (status, created_at)"))
                else:
                    print("  索引已存在，跳过: idx_status_created")
                
                trans.commit()
                print("\n订单表迁移完成！")
                
            except Exception as e:
                trans.rollback()
                print(f"\n[错误] 订单表迁移失败: {str(e)}")
                return False
        
        # 检查并创建payment_records表
        print("\n3. 检查并创建支付记录表...")
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                if not table_exists(engine, 'payment_records'):
                    print("  创建表: payment_records")
                    create_table_sql = """
                    CREATE TABLE payment_records (
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
                    """
                    conn.execute(text(create_table_sql))
                    print("  支付记录表创建成功！")
                else:
                    print("  表已存在，跳过: payment_records")
                    # 检查是否需要添加索引
                    if not table_exists(engine, 'payment_records'):
                        indexes = [idx['name'] for idx in inspector.get_indexes('payment_records')]
                        if 'idx_order_no' not in indexes:
                            conn.execute(text("ALTER TABLE payment_records ADD INDEX idx_order_no (order_no)"))
                        if 'idx_payment_no' not in indexes:
                            conn.execute(text("ALTER TABLE payment_records ADD INDEX idx_payment_no (payment_no)"))
                        if 'idx_created_at' not in indexes:
                            conn.execute(text("ALTER TABLE payment_records ADD INDEX idx_created_at (created_at)"))
                
                trans.commit()
                
            except Exception as e:
                trans.rollback()
                print(f"\n[错误] 支付记录表迁移失败: {str(e)}")
                return False
        
        print("\n" + "="*50)
        print("[成功] 数据库迁移成功完成！")
        print("="*50)
        return True
                
    except Exception as e:
        print(f"\n[异常] 数据库迁移异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_safe_migration()
    sys.exit(0 if success else 1)