import pymysql

# 数据库连接配置
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': '!QAZ@WSX',
    'database': 'image_edit_db'
}

def modify_image_url_nullable():
    """修改sys_model_refs表的image_url字段为允许NULL"""
    try:
        # 连接数据库
        connection = pymysql.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # 修改image_url字段为允许NULL
        alter_sql = """
        ALTER TABLE sys_model_refs 
        MODIFY COLUMN image_url VARCHAR(500) NULL COMMENT '图片路径'
        """
        
        cursor.execute(alter_sql)
        connection.commit()
        
        print("✓ 成功修改sys_model_refs表的image_url字段为允许NULL")
        
    except Exception as e:
        print(f"✗ 修改失败: {e}")
        if connection:
            connection.rollback()
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    modify_image_url_nullable()
