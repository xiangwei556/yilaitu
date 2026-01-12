"""
执行支付系统数据库迁移脚本
"""
import sys
import os

# 添加项目根目录到路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from sqlalchemy import create_engine, text
from backend.passport.app.core.config import settings
from backend.passport.app.core.logging import logger

def run_migration():
    """执行数据库迁移"""
    try:
        # 创建数据库连接
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
        
        # 读取SQL文件
        sql_file_path = os.path.join(os.path.dirname(__file__), "database_migration.sql")
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # 分割SQL语句（按分号分割，但保留注释）
        statements = []
        current_statement = []
        for line in sql_content.split('\n'):
            line = line.strip()
            if not line or line.startswith('--'):
                continue
            current_statement.append(line)
            if line.endswith(';'):
                statements.append(' '.join(current_statement))
                current_statement = []
        
        # 执行SQL语句
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                for i, statement in enumerate(statements, 1):
                    if statement.strip():
                        logger.info(f"执行SQL语句 {i}/{len(statements)}")
                        logger.debug(f"SQL: {statement[:100]}...")
                        conn.execute(text(statement))
                
                trans.commit()
                logger.info("数据库迁移成功完成！")
                print("[成功] 数据库迁移成功完成！")
                return True
            except Exception as e:
                trans.rollback()
                logger.error(f"数据库迁移失败: {str(e)}")
                print(f"[失败] 数据库迁移失败: {str(e)}")
                return False
                
    except Exception as e:
        logger.error(f"数据库迁移异常: {str(e)}")
        print(f"[异常] 数据库迁移异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("开始执行支付系统数据库迁移...")
    success = run_migration()
    sys.exit(0 if success else 1)