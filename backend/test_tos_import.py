try:
    from volcengine.tos import TosClientV2
    print('TOS模块导入成功')
except Exception as e:
    print(f'导入失败: {e}')
