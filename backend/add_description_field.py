import pymysql

# 数据库连接参数
db_config = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': '!QAZ@WSX',
    'database': 'image_edit_db',
    'charset': 'utf8mb4'
}

# 创建数据库连接
connection = pymysql.connect(**db_config)

# 创建游标对象
cursor = connection.cursor()

# 执行SQL命令
sql_command = "ALTER TABLE points_rules ADD COLUMN description VARCHAR(255) NULL;"

print("Executing SQL command:", sql_command)

try:
    cursor.execute(sql_command)
    connection.commit()
    print("Column 'description' added successfully to points_rules table.")
except Exception as e:
    print("Error executing SQL command:", e)
    connection.rollback()
finally:
    # 关闭游标和连接
    cursor.close()
    connection.close()
