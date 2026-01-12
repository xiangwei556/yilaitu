#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
查询微信用户是否已绑定手机号
"""

from urllib.parse import quote_plus
from sqlalchemy import create_engine, text

# 数据库配置（与config.py中保持一致）
MYSQL_USER = "root"
MYSQL_PASSWORD = "!QAZ@WSX"  # 密码包含特殊字符
MYSQL_SERVER = "127.0.0.1"
MYSQL_PORT = "3306"
MYSQL_DB = "image_edit_db"

# 使用quote_plus处理密码中的特殊字符
DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{quote_plus(MYSQL_PASSWORD)}@{MYSQL_SERVER}:{MYSQL_PORT}/{MYSQL_DB}"

def query_wechat_user_binding():
    """
    查询微信用户是否已绑定手机号
    """
    openid = "o8b5M3KNHSVTruV-mOuJpNLM0uEs"
    
    print("=" * 60)
    print(f"查询微信用户绑定状态")
    print("=" * 60)
    print(f"微信openid: {openid}")
    print()
    
    try:
        # 创建数据库引擎
        engine = create_engine(DATABASE_URL, echo=True)
        
        with engine.connect() as conn:
            # 1. 查询该openid对应的用户凭证
            print("-" * 60)
            print("步骤1: 查询openid对应的用户凭证")
            print("-" * 60)
            
            query1 = text("""
                SELECT id, user_id, identifier, credential_type, verified, created_at
                FROM user_credentials
                WHERE identifier = :openid 
                AND credential_type = 'wechat_openid'
            """)
            
            result = conn.execute(query1, {"openid": openid})
            credential = result.fetchone()
            
            if credential:
                print(f"✅ 找到用户凭证:")
                print(f"  - 凭证ID: {credential.id}")
                print(f"  - 用户ID: {credential.user_id}")
                print(f"  - 标识符: {credential.identifier}")
                print(f"  - 凭证类型: {credential.credential_type}")
                print(f"  - 是否验证: {credential.verified}")
                print(f"  - 创建时间: {credential.created_at}")
                print()
                
                user_id = credential.user_id
                
                # 2. 查询该用户是否绑定了手机号
                print("-" * 60)
                print("步骤2: 查询该用户是否绑定了手机号")
                print("-" * 60)
                
                query2 = text("""
                    SELECT id, user_id, identifier, credential_type, verified, created_at
                    FROM user_credentials
                    WHERE user_id = :user_id 
                    AND credential_type = 'phone'
                """)
                
                result2 = conn.execute(query2, {"user_id": user_id})
                phone_credential = result2.fetchone()
                
                if phone_credential:
                    print(f"✅ 用户已绑定手机号!")
                    print(f"  - 凭证ID: {phone_credential.id}")
                    print(f"  - 用户ID: {phone_credential.user_id}")
                    phone = phone_credential.identifier
                    masked_phone = phone[:3] + "****" + phone[-4:] if len(phone) == 11 else "****"
                    print(f"  - 手机号: {masked_phone}")
                    print(f"  - 凭证类型: {phone_credential.credential_type}")
                    print(f"  - 是否验证: {phone_credential.verified}")
                    print(f"  - 创建时间: {phone_credential.created_at}")
                else:
                    print(f"❌ 用户未绑定手机号")
                    
                # 3. 查询该用户的所有凭证
                print()
                print("-" * 60)
                print("步骤3: 查询该用户的所有凭证")
                print("-" * 60)
                
                query3 = text("""
                    SELECT id, user_id, identifier, credential_type, verified, created_at
                    FROM user_credentials
                    WHERE user_id = :user_id
                    ORDER BY created_at DESC
                """)
                
                result3 = conn.execute(query3, {"user_id": user_id})
                all_credentials = result3.fetchall()
                
                print(f"用户 {user_id} 共有 {len(all_credentials)} 个凭证:")
                for cred in all_credentials:
                    cred_type = cred.credential_type
                    identifier = cred.identifier
                    
                    # 脱敏显示
                    if cred_type == 'phone':
                        identifier = identifier[:3] + "****" + identifier[-4:] if len(identifier) == 11 else "****"
                    elif cred_type == 'wechat_openid':
                        identifier = identifier[:10] + "***"
                    elif cred_type == 'wechat_unionid':
                        identifier = identifier[:10] + "***"
                    
                    print(f"  - [{cred_type}] {identifier} (验证: {cred.verified})")
                
                # 4. 查询用户基本信息
                print()
                print("-" * 60)
                print("步骤4: 查询用户基本信息")
                print("-" * 60)
                
                query4 = text("""
                    SELECT id, username, nickname, avatar, phone as phone_field, 
                           gender, status, role, created_at
                    FROM users
                    WHERE id = :user_id
                """)
                
                result4 = conn.execute(query4, {"user_id": user_id})
                user = result4.fetchone()
                
                if user:
                    print(f"用户信息:")
                    print(f"  - 用户ID: {user.id}")
                    print(f"  - 用户名: {user.username}")
                    print(f"  - 昵称: {user.nickname}")
                    print(f"  - 性别: {user.gender}")
                    print(f"  - 状态: {user.status}")
                    print(f"  - 角色: {user.role}")
                    print(f"  - 创建时间: {user.created_at}")
                    print(f"  - users.phone字段: {user.phone_field if user.phone_field else '为空'}")
                        
            else:
                print(f"❌ 未找到该openid的用户凭证")
                print(f"   可能的原因为:")
                print(f"   1. openid不正确")
                print(f"   2. 用户还未通过微信扫码登录过")
                print(f"   3. 数据库中没有该用户的数据")
                
                # 尝试查询是否有相似的openid
                print()
                print("-" * 60)
                print("尝试查找相似的openid:")
                print("-" * 60)
                
                query_similar = text("""
                    SELECT id, user_id, identifier, credential_type, verified
                    FROM user_credentials
                    WHERE credential_type = 'wechat_openid'
                    ORDER BY created_at DESC
                    LIMIT 10
                """)
                
                result_similar = conn.execute(query_similar)
                similar = result_similar.fetchall()
                
                if similar:
                    print(f"数据库中共有 {len(similar)} 个微信用户:")
                    for cred in similar:
                        print(f"  - {cred.identifier[:30]}... (user_id: {cred.user_id})")
                else:
                    print("  数据库中没有微信用户")
        
        print()
        print("=" * 60)
        print("查询完成")
        print("=" * 60)
        
    except Exception as e:
        print(f"查询异常: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    query_wechat_user_binding()
