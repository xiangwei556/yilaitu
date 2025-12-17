import pymysql
from app.config import app_config

# MySQL连接信息
MYSQL_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': '!QAZ@WSX',
    'charset': 'utf8mb4'
}

def create_database():
    """创建数据库（如果不存在）"""
    try:
        # 连接到MySQL服务器
        conn = pymysql.connect(**MYSQL_CONFIG)
        conn.autocommit(True)
        cursor = conn.cursor()
        
        # 检查数据库是否存在
        cursor.execute("SHOW DATABASES LIKE 'image_edit_db'")
        result = cursor.fetchone()
        
        if not result:
            # 创建数据库
            cursor.execute("CREATE DATABASE image_edit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print("数据库 'image_edit_db' 创建成功！")
        else:
            print("数据库 'image_edit_db' 已存在！")
        
        # 关闭连接
        cursor.close()
        conn.close()
        
        return True
    except Exception as e:
        print(f"创建数据库失败: {str(e)}")
        return False

if __name__ == "__main__":
    create_database()
