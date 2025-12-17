# 项目API接口规范文档

**版本号**: v1.0  
**最后更新时间**: 2025-12-13  
**文档维护者**: Trae AI Assistant

---

## 1. 接口分类

### 2.1 后端页面依赖接口 (Admin APIs)

此类接口主要供后台管理系统使用，需要管理员权限 (Admin/Super Admin/Growth Hacker)。

#### 1. 会员管理 (Membership)

**1.1 创建会员套餐**
*   **接口路径**: `/api/v1/membership/admin/packages`
*   **请求方法**: `POST`
*   **权限要求**: Admin, Super Admin, Growth Hacker
*   **请求头**: `Authorization: Bearer <token>`
*   **请求参数**:
    *   `name` (string, 必填): 套餐名称 (如: "基础会员")
    *   `price` (decimal, 必填): 价格
    *   `original_price` (decimal, 选填): 原价
    *   `rights` (list, 选填): 权益列表
    *   `channels` (list, 选填): 销售渠道
    *   `is_active` (boolean, 选填, 默认True): 是否启用
*   **响应格式**: JSON
*   **响应示例**:
    ```json
    {
      "name": "基础会员",
      "price": 29.0,
      "original_price": 39.0,
      "rights": [],
      "channels": [],
      "is_active": true,
      "id": 1,
      "created_at": "2025-12-13T10:00:00",
      "updated_at": "2025-12-13T10:00:00"
    }
    ```

**1.2 获取会员套餐列表**
*   **接口路径**: `/api/v1/membership/admin/packages`
*   **请求方法**: `GET`
*   **权限要求**: Admin, Super Admin, Growth Hacker, Developer
*   **请求参数**:
    *   `skip` (int, 选填, 默认0): 跳过数量
    *   `limit` (int, 选填, 默认100): 返回数量
*   **响应示例**: `[ { ...package_object... } ]`

**1.3 更新会员套餐**
*   **接口路径**: `/api/v1/membership/admin/packages/{package_id}`
*   **请求方法**: `PUT`
*   **权限要求**: Admin, Super Admin, Growth Hacker
*   **请求参数**: 同创建接口，仅需提供需更新字段。

#### 2. 积分管理 (Points)

**2.1 创建积分包**
*   **接口路径**: `/api/v1/points/admin/packages`
*   **请求方法**: `POST`
*   **权限要求**: Admin, Super Admin, Growth Hacker
*   **请求参数**:
    *   `points` (int, 必填): 积分数量
    *   `price` (decimal, 必填): 价格
    *   `original_price` (decimal, 选填): 原价
    *   `gift_rule` (dict, 选填): 赠送规则
*   **响应示例**:
    ```json
    {
      "points": 100,
      "price": 1.0,
      "id": 1,
      ...
    }
    ```

**2.2 获取积分包列表**
*   **接口路径**: `/api/v1/points/admin/packages`
*   **请求方法**: `GET`
*   **权限要求**: Admin, Super Admin, Growth Hacker, Developer

**2.3 创建积分规则**
*   **接口路径**: `/api/v1/points/admin/rules`
*   **请求方法**: `POST`
*   **权限要求**: Admin, Super Admin, Growth Hacker
*   **请求参数**:
    *   `code` (string, 必填): 规则代码 (唯一)
    *   `name` (string, 必填): 规则名称
    *   `type` (string, 必填): 类型 (task, monthly, event)
    *   `amount` (int, 必填): 积分数量
    *   `frequency` (string, 选填, 默认"unlimited"): 频率
*   **响应示例**:
    ```json
    {
      "code": "daily_sign_in",
      "name": "每日签到",
      "amount": 10,
      ...
    }
    ```

**2.4 获取积分规则列表**
*   **接口路径**: `/api/v1/points/admin/rules`
*   **请求方法**: `GET`
*   **权限要求**: Admin, Super Admin, Growth Hacker, Developer

**2.5 积分人工调整 (充值/扣减)**
*   **接口路径**: `/api/v1/points/admin/adjust`
*   **请求方法**: `POST`
*   **权限要求**: Admin, Super Admin, Growth Hacker
*   **请求参数**:
    *   `user_id` (int, 必填): 用户ID
    *   `amount` (decimal, 必填): 数量
    *   `type` (string, 必填): 类型 ("earn" - 增加, "burn" - 扣减)
    *   `remark` (string, 必填): 备注
*   **响应示例**:
    ```json
    {
      "user_id": 10,
      "balance_permanent": 500.0,
      "balance_limited": 0.0
    }
    ```

**2.6 获取积分台账**
*   **接口路径**: `/api/v1/points/admin/ledger`
*   **请求方法**: `GET`
*   **权限要求**: Admin, Super Admin, Growth Hacker, Call Center
*   **请求参数**:
    *   `skip` (int, 选填): 默认0
    *   `limit` (int, 选填): 默认100

#### 3. 订单管理 (Order)

**3.1 获取所有订单**
*   **接口路径**: `/api/v1/order/admin/orders`
*   **请求方法**: `GET`
*   **权限要求**: Admin, Super Admin, Growth Hacker, Call Center
*   **请求参数**:
    *   `skip` (int, 选填): 默认0
    *   `limit` (int, 选填): 默认100

#### 4. 通知管理 (Notification)

**4.1 创建通知模板**
*   **接口路径**: `/api/v1/notification/admin/templates`
*   **请求方法**: `POST`
*   **权限要求**: Admin, Super Admin, Growth Hacker
*   **请求参数**:
    *   `code` (string, 必填): 模板代码 (唯一)
    *   `title_template` (string, 必填): 标题模板
    *   `content_template` (string, 必填): 内容模板
    *   `channels` (string, 选填): 发送渠道

**4.2 获取通知模板列表**
*   **接口路径**: `/api/v1/notification/admin/templates`
*   **请求方法**: `GET`
*   **权限要求**: Admin, Super Admin, Growth Hacker, Developer

#### 5. 配置中心 (Config Center)

**5.1 创建系统配置**
*   **接口路径**: `/api/v1/config/admin/configs`
*   **请求方法**: `POST`
*   **权限要求**: Admin, Super Admin, Growth Hacker
*   **请求参数**:
    *   `key` (string, 必填): 配置键 (唯一)
    *   `value` (string, 选填): 配置值
    *   `description` (string, 选填): 描述
    *   `group` (string, 选填): 分组

**5.2 获取系统配置列表**
*   **接口路径**: `/api/v1/config/admin/configs`
*   **请求方法**: `GET`
*   **权限要求**: Admin, Super Admin, Growth Hacker, Developer

---

### 2.2 前端系统调用接口 (User APIs)

此类接口供普通用户在前端 App/Web 使用，需登录认证。

#### 1. 会员服务

**1.1 获取在售会员套餐**
*   **接口路径**: `/api/v1/membership/packages`
*   **请求方法**: `GET`
*   **权限要求**: Authenticated User
*   **说明**: 仅返回 `is_active=true` 的套餐。

**1.2 获取我的订阅**
*   **接口路径**: `/api/v1/membership/my-membership`
*   **请求方法**: `GET`
*   **权限要求**: Authenticated User
*   **响应示例**:
    ```json
    [
      {
        "user_id": 10,
        "package_id": 1,
        "start_time": "...",
        "end_time": "...",
        "status": 1,
        ...
      }
    ]
    ```

**1.3 计算升级差价**
*   **接口路径**: `/api/v1/membership/calculate-upgrade`
*   **请求方法**: `POST`
*   **权限要求**: Authenticated User
*   **请求参数**:
    *   `target_package_id` (int, 必填): 目标套餐ID
*   **响应示例**:
    ```json
    {
      "original_price": 89.0,
      "deducted_amount": 0,
      "final_price": 30.0,
      "remaining_days": 15,
      "formula": "(89 - 29) * (15/30)"
    }
    ```

**1.4 创建会员订单**
*   **接口路径**: `/api/v1/membership/orders`
*   **请求方法**: `POST`
*   **权限要求**: Authenticated User
*   **请求参数**:
    *   `package_id` (int, 必填): 套餐ID
    *   `payment_method` (string, 选填): "wechat" 或 "alipay"
    *   `is_upgrade` (bool, 选填): 是否为升级订单
*   **响应**: 返回订单号字符串 (如 "ORD2025...")

#### 2. 积分服务

**2.1 获取积分套餐**
*   **接口路径**: `/api/v1/points/packages`
*   **请求方法**: `GET`
*   **权限要求**: Authenticated User

**2.2 获取我的积分账户**
*   **接口路径**: `/api/v1/points/my-account`
*   **请求方法**: `GET`
*   **权限要求**: Authenticated User
*   **响应示例**:
    ```json
    {
      "user_id": 10,
      "balance_permanent": 100.0,
      "balance_limited": 0.0
    }
    ```

**2.3 获取我的积分明细**
*   **接口路径**: `/api/v1/points/my-transactions`
*   **请求方法**: `GET`
*   **权限要求**: Authenticated User
*   **说明**: 返回最近 50 条交易记录。

#### 3. 订单服务

**3.1 获取我的订单**
*   **接口路径**: `/api/v1/order/my-orders`
*   **请求方法**: `GET`
*   **权限要求**: Authenticated User

---

## 3. 使用说明

### 3.1 如何调用 API
所有 API 均基于 HTTP 协议，基础 URL 为服务器部署地址 (本地开发通常为 `http://127.0.0.1:8001`)。
建议使用 Postman 或类似工具进行调试。

### 3.2 认证方式
项目使用 **Bearer Token** 认证。
1.  用户登录后获取 `access_token`。
2.  在后续请求头中添加: `Authorization: Bearer <access_token>`。
3.  Token 过期需重新登录或刷新。

### 3.3 常见问题
*   **401 Unauthorized**: Token 缺失、无效或已过期。请重新登录。
*   **403 Forbidden**: 权限不足。例如普通用户尝试访问 `/admin` 接口。
*   **422 Validation Error**: 请求参数格式错误，请检查 JSON 字段类型和必填项。

### 3.4 最佳实践
*   前端应统一封装 HTTP 请求库 (如 Axios)，自动处理 Token 注入和 401 跳转。
*   对于列表接口，虽然目前部分接口未强制分页，但建议预留分页参数处理。
*   金额相关字段建议前端使用高精度库处理，虽然 API 返回的是数字或字符串。

### 3.5 调试技巧
*   查看后端日志 (`backend/logs/passport.log` 或控制台输出) 获取详细错误堆栈。
*   使用 `/health` 接口检查服务存活状态。

---

## 4. 变更日志

| 日期 | 版本 | 变更内容 | 作者 |
| :--- | :--- | :--- | :--- |
| 2025-12-13 | v1.0 | 初始版本，包含会员、积分、订单、通知、配置中心模块 | Trae AI |
