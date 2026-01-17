# 会员订阅系统自动扣款技术方案

## 一、方案概述

### 1.1 目标
基于现有订阅状态机方案，实现支持微信和支付宝自动扣款的会员订阅系统，包括：
- 签约管理（用户授权自动扣款）
- 自动续费扣款
- 订阅生效链管理
- 高并发、高可用保障

### 1.2 现有项目基础
| 模块 | 文件路径 | 说明 |
|------|---------|------|
| 会员套餐 | `backend/membership/models/membership.py` | MembershipPackage |
| 用户会员 | `backend/membership/models/membership.py` | UserMembership |
| 订阅表 | `backend/membership/models/subscription.py` | Subscription (已有基础结构) |
| 订单系统 | `backend/order/models/order.py` | Order, OrderPaid, OrderHistory |
| 支付服务 | `backend/payment/services/` | WeChatPayService, AlipayService |

---

## 二、数据库设计

### 2.1 签约协议表（新增）
```sql
CREATE TABLE `payment_contract` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `contract_sn` VARCHAR(32) NOT NULL UNIQUE COMMENT '协议流水号',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',

  -- 支付平台信息
  `payment_method` VARCHAR(20) NOT NULL COMMENT 'wechat/alipay',
  `contract_id` VARCHAR(64) COMMENT '支付平台返回的协议ID',
  `contract_code` VARCHAR(64) COMMENT '商户侧协议号',
  `plan_id` VARCHAR(32) COMMENT '微信签约模板ID/支付宝签约场景码',

  -- 协议状态
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0-签约中 1-已签约 2-已解约 3-签约失败',
  `signed_time` DATETIME COMMENT '签约成功时间',
  `unsigned_time` DATETIME COMMENT '解约时间',
  `unsigned_reason` VARCHAR(255) COMMENT '解约原因',

  -- 签约场景
  `product_type` VARCHAR(20) NOT NULL COMMENT 'membership/points',
  `product_id` BIGINT COMMENT '关联商品ID',
  `display_account` VARCHAR(64) COMMENT '签约展示账号',

  -- 扣款配置
  `deduct_amount` DECIMAL(10,2) COMMENT '扣款金额',
  `deduct_cycle` INT DEFAULT 30 COMMENT '扣款周期(天)',
  `next_deduct_date` DATE COMMENT '下次扣款日期',
  `last_deduct_time` DATETIME COMMENT '上次扣款时间',
  `deduct_fail_count` INT DEFAULT 0 COMMENT '连续扣款失败次数',

  -- 用户标识
  `openid` VARCHAR(64) COMMENT '微信openid',
  `alipay_user_id` VARCHAR(64) COMMENT '支付宝用户ID',

  -- 元数据
  `extra_data` TEXT COMMENT '扩展数据JSON',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_contract_id` (`contract_id`),
  KEY `idx_next_deduct` (`status`, `next_deduct_date`)
) COMMENT='自动扣款签约协议表';
```

### 2.2 扣款记录表（新增）
```sql
CREATE TABLE `auto_deduct_record` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `record_sn` VARCHAR(32) NOT NULL UNIQUE COMMENT '记录流水号',
  `contract_id` BIGINT NOT NULL COMMENT '关联签约协议ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `subscription_id` BIGINT COMMENT '关联订阅ID',
  `order_id` BIGINT COMMENT '关联订单ID',

  -- 扣款信息
  `amount` DECIMAL(10,2) NOT NULL COMMENT '扣款金额',
  `payment_method` VARCHAR(20) NOT NULL COMMENT 'wechat/alipay',
  `out_trade_no` VARCHAR(64) COMMENT '商户订单号',
  `transaction_id` VARCHAR(64) COMMENT '支付平台交易号',

  -- 状态
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0-待扣款 1-预通知已发 2-扣款中 3-成功 4-失败',
  `notify_time` DATETIME COMMENT '预通知发送时间',
  `deduct_time` DATETIME COMMENT '扣款时间',
  `complete_time` DATETIME COMMENT '完成时间',

  -- 失败信息
  `fail_reason` VARCHAR(255) COMMENT '失败原因',
  `fail_code` VARCHAR(32) COMMENT '失败错误码',
  `retry_count` INT DEFAULT 0 COMMENT '重试次数',

  -- 回调数据
  `callback_data` TEXT COMMENT '回调原始数据JSON',

  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY `idx_contract` (`contract_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status_time` (`status`, `create_time`),
  KEY `idx_out_trade` (`out_trade_no`)
) COMMENT='自动扣款记录表';
```

### 2.3 订阅表扩展（修改现有表）
在现有 `subscription` 表基础上补充字段：
```sql
ALTER TABLE `subscription` ADD COLUMN `contract_id` BIGINT COMMENT '关联签约协议ID';
ALTER TABLE `subscription` ADD KEY `idx_contract` (`contract_id`);
```

### 2.4 订单表扩展
```sql
ALTER TABLE `order_reservation` ADD COLUMN `is_auto_deduct` TINYINT DEFAULT 0 COMMENT '是否自动扣款订单';
ALTER TABLE `order_reservation` ADD COLUMN `contract_id` BIGINT COMMENT '关联签约协议ID';
ALTER TABLE `order` ADD COLUMN `is_auto_deduct` TINYINT DEFAULT 0 COMMENT '是否自动扣款订单';
ALTER TABLE `order` ADD COLUMN `contract_id` BIGINT COMMENT '关联签约协议ID';
```

---

## 三、签约流程设计

### 3.1 微信签约流程

```
用户选择开通自动续费
        ↓
后端生成签约参数
POST /api/v1/contract/wechat/sign
        ↓
生成签约链接（/papay/partner/entrustweb）
- plan_id: 微信后台配置的签约模板
- contract_code: 商户侧协议号
- notify_url: 签约结果回调地址
        ↓
前端跳转签约页面
(window.location.href = redirect_url)
        ↓
用户确认签约
        ↓
微信回调通知 POST /api/v1/contract/wechat/callback
- 验证签名
- 更新签约状态为已签约
- 记录contract_id
        ↓
创建首次订阅记录
```

**关键代码路径**：`backend/payment/services/wechat_contract_service.py`（新建）

### 3.2 支付宝签约流程

```
用户选择开通自动续费
        ↓
后端调用签约接口
alipay.user.agreement.page.sign
- personal_product_code: CYCLE_PAY_AUTH
- sign_scene: INDUSTRY|CYCLE_PAY
- external_agreement_no: 商户协议号
        ↓
返回签约页面URL
        ↓
前端跳转/用户扫码签约
        ↓
支付宝异步通知 POST /api/v1/contract/alipay/callback
- 验证签名
- 更新签约状态
- 记录agreement_no
        ↓
创建首次订阅记录
```

**关键代码路径**：`backend/payment/services/alipay_contract_service.py`（新建）

### 3.3 签约API设计

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/contract/create` | POST | 创建签约申请 |
| `/api/v1/contract/wechat/callback` | POST | 微信签约回调 |
| `/api/v1/contract/alipay/callback` | POST | 支付宝签约回调 |
| `/api/v1/contract/query` | GET | 查询签约状态 |
| `/api/v1/contract/cancel` | POST | 用户主动解约 |
| `/api/v1/contract/my-contracts` | GET | 查询我的签约列表 |

---

## 四、自动扣款流程设计

### 4.1 微信自动扣款流程（需预通知）

```
定时任务：每天凌晨2点执行
        ↓
查询需要发送预通知的订阅
- status = 2(生效中) 且 is_auto_renewal = 1
- expiration_time - now <= 3天（可配置）
- 有有效签约协议
        ↓
发送预扣款通知 (每个订阅)
POST /v3/partner-papay/contracts/{contract_id}/notify
- estimated_amount: 预计扣款金额
- deduct_duration: 扣款周期(1-3天)
        ↓
创建扣款记录 status=1(预通知已发)
        ↓
等待扣款窗口期
(预通知后第3-9天可扣款)
        ↓
定时任务：检查可扣款的记录
        ↓
发起扣款请求
POST /pay/partner/pappayapply
- contract_id: 签约协议ID
- out_trade_no: 商户订单号
- total_fee: 扣款金额(分)
- trade_type: PAP
        ↓
等待扣款结果回调
POST /api/v1/deduct/wechat/callback
        ↓
扣款成功：
- 更新扣款记录status=3
- 创建订阅记录
- 插入生效链
- 更新用户会员信息
        ↓
扣款失败：
- 记录失败原因
- 判断是否重试
- 超过重试次数则关闭自动续费
```

### 4.2 支付宝自动扣款流程

```
定时任务：每天凌晨2点执行
        ↓
查询需要扣款的订阅
- 即将到期(3天内)
- is_auto_renewal = 1
- 有有效签约协议
        ↓
发起扣款请求
alipay.trade.pay
- agreement_no: 签约协议号
- out_trade_no: 商户订单号
- total_amount: 扣款金额
        ↓
处理扣款结果
- 10000: 扣款成功
- 10003: 等待用户付款
- 40004: 扣款失败
        ↓
异步通知 POST /api/v1/deduct/alipay/callback
        ↓
后续处理同微信
```

### 4.3 扣款重试策略

```python
DEDUCT_RETRY_CONFIG = {
    'max_retry_count': 3,           # 最大重试次数
    'retry_intervals': [1, 3, 7],   # 重试间隔(天)
    'fail_actions': {
        'NOTENOUGH': 'retry',       # 余额不足-重试
        'CONTRACT_NOT_EXIST': 'stop', # 协议不存在-停止
        'ACCOUNTERROR': 'stop',     # 账户异常-停止
        'FREQUENCY_LIMITED': 'retry', # 频率限制-重试
    }
}
```

---

## 五、订阅生效链实现

### 5.1 核心服务类

**文件路径**：`backend/subscription/services/`

```
subscription/
├── services/
│   ├── __init__.py
│   ├── subscription_service.py      # 订阅主服务
│   ├── chain_manager.py             # 生效链管理器
│   ├── priority_calculator.py       # 优先级计算器
│   ├── expiration_handler.py        # 到期处理器
│   ├── auto_renewal_service.py      # 自动续费服务
│   ├── cancellation_service.py      # 取消服务
│   ├── upgrade_service.py           # 升级服务
│   └── compensation_service.py      # 补偿订阅服务
├── models/
│   └── subscription.py              # 订阅模型(已存在，需扩展)
├── schemas/
│   └── subscription.py              # 订阅Schema
└── api/
    └── subscription.py              # 订阅API
```

### 5.2 生效链管理器核心逻辑

```python
# chain_manager.py 核心方法
class ChainManager:
    def get_user_chain(user_id) -> UserChain
    def insert_subscription(subscription, chain) -> InsertResult
    def recalculate_chain_times(user_id)
    def remove_from_chain(subscription_id)
    def get_chain_visualization(user_id) -> str  # 调试用
```

### 5.3 优先级算法实现

按照方案文档中的规则：
1. 等级权重（level_weight）降序
2. 是否补偿订阅（正式订阅优先）
3. 创建时间升序

---

## 六、定时任务设计

### 6.1 任务列表

| 任务名称 | 执行频率 | 说明 |
|----------|----------|------|
| `send_wechat_pre_notify` | 每天02:00 | 发送微信预扣款通知 |
| `process_wechat_deduct` | 每天10:00 | 处理微信扣款（预通知后第3天） |
| `process_alipay_deduct` | 每天02:30 | 处理支付宝扣款 |
| `check_expiring_subscriptions` | 每小时 | 检查即将到期订阅，发送提醒 |
| `process_expired_subscriptions` | 每5分钟 | 处理到期订阅，激活后序订阅 |
| `sync_contract_status` | 每天03:00 | 同步签约状态（防止回调丢失） |
| `chain_health_check` | 每天04:00 | 生效链健康检查 |
| `retry_failed_deduct` | 每天11:00 | 重试失败的扣款 |

### 6.2 任务实现

**文件路径**：`backend/subscription/tasks/`

```python
# 使用APScheduler或Celery实现
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('cron', hour=2, minute=0)
async def send_wechat_pre_notify():
    """发送微信预扣款通知"""
    pass

@scheduler.scheduled_job('cron', hour=10, minute=0)
async def process_wechat_deduct():
    """处理微信扣款"""
    pass
```

---

## 七、高并发与稳定性设计

### 7.1 并发控制

```python
# 分布式锁实现
class DistributedLock:
    def __init__(self, redis_client, key, expire=30):
        self.redis = redis_client
        self.key = f"lock:{key}"
        self.expire = expire

    async def acquire(self):
        return await self.redis.set(
            self.key, "1",
            nx=True, ex=self.expire
        )

    async def release(self):
        await self.redis.delete(self.key)

# 使用示例
async def process_subscription_expiration(subscription_id):
    lock = DistributedLock(redis, f"sub_expire:{subscription_id}")
    if not await lock.acquire():
        return  # 其他实例正在处理
    try:
        # 业务逻辑
        pass
    finally:
        await lock.release()
```

### 7.2 幂等性保障

```python
# 回调处理幂等性
async def handle_deduct_callback(callback_data):
    out_trade_no = callback_data['out_trade_no']

    # 1. 检查是否已处理
    record = await get_deduct_record(out_trade_no)
    if record and record.status == DeductStatus.SUCCESS:
        return {'return_code': 'SUCCESS'}  # 已处理，直接返回

    # 2. 使用分布式锁
    lock = DistributedLock(redis, f"deduct:{out_trade_no}")
    if not await lock.acquire():
        return {'return_code': 'SUCCESS'}  # 正在处理

    try:
        # 3. 再次检查状态（双重检查）
        record = await get_deduct_record(out_trade_no)
        if record and record.status == DeductStatus.SUCCESS:
            return {'return_code': 'SUCCESS'}

        # 4. 执行业务逻辑
        await process_deduct_success(callback_data)

    finally:
        await lock.release()
```

### 7.3 数据库事务与乐观锁

```python
# 订阅状态变更使用乐观锁
class Subscription(Base):
    version = Column(Integer, default=0)

async def update_subscription_status(sub_id, new_status, version):
    result = await db.execute(
        update(Subscription)
        .where(
            Subscription.id == sub_id,
            Subscription.version == version  # 乐观锁
        )
        .values(
            status=new_status,
            version=version + 1
        )
    )
    if result.rowcount == 0:
        raise ConcurrentModificationError("订阅状态已被修改")
```

### 7.4 消息队列解耦（可选）

```
扣款回调 → Redis消息队列 → 消费者处理
                          ├── 创建订阅
                          ├── 更新会员
                          └── 发送通知
```

---

## 八、异常处理与补偿机制

### 8.1 扣款失败处理

```python
FAIL_HANDLING_STRATEGY = {
    # 微信错误码
    'NOTENOUGH': {
        'action': 'retry',
        'notify_user': True,
        'message': '余额不足，请充值后将自动重试'
    },
    'CONTRACT_NOT_EXIST': {
        'action': 'disable_auto_renewal',
        'notify_user': True,
        'message': '自动续费协议已失效，请重新签约'
    },
    'FREQUENCY_LIMITED': {
        'action': 'retry_later',
        'retry_delay': 3600,  # 1小时后重试
    },

    # 支付宝错误码
    'ACQ.TRADE_HAS_CLOSE': {
        'action': 'create_new_order',
    },
    'ACQ.BUYER_BALANCE_NOT_ENOUGH': {
        'action': 'retry',
        'notify_user': True,
    },
}
```

### 8.2 回调丢失补偿

```python
# 定时任务：同步签约/扣款状态
async def sync_pending_records():
    """查询处于中间状态的记录，主动查询支付平台"""

    # 查询签约中但超时的记录
    pending_contracts = await get_contracts_by_status(
        status=0,  # 签约中
        created_before=datetime.now() - timedelta(hours=1)
    )

    for contract in pending_contracts:
        if contract.payment_method == 'wechat':
            result = await wechat_service.query_contract(contract.contract_code)
        else:
            result = await alipay_service.query_agreement(contract.contract_code)

        await update_contract_status(contract, result)
```

---

## 九、监控告警设计

### 9.1 关键指标

| 指标 | 监控频率 | 告警阈值 |
|------|----------|----------|
| 签约成功率 | 实时 | < 95% |
| 自动扣款成功率 | 每小时 | < 90% |
| 回调处理延迟 | 实时 | > 5秒 |
| 生效链断裂数 | 每日 | > 0 |
| 待处理扣款积压 | 每小时 | > 100 |
| 连续扣款失败用户数 | 每日 | > 10 |

### 9.2 日志规范

```python
# 关键操作日志
logger.info(f"[DEDUCT] 发起扣款 user_id={user_id} contract_id={contract_id} amount={amount}")
logger.info(f"[DEDUCT] 扣款成功 user_id={user_id} transaction_id={transaction_id}")
logger.error(f"[DEDUCT] 扣款失败 user_id={user_id} error_code={code} error_msg={msg}")

logger.info(f"[CHAIN] 插入订阅 user_id={user_id} sub_id={sub_id} position={position}")
logger.info(f"[CHAIN] 激活订阅 user_id={user_id} sub_id={sub_id}")
```

---

## 十、API接口汇总

### 10.1 签约相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `POST /api/v1/contract/create` | POST | 创建签约（返回签约页面URL） |
| `POST /api/v1/contract/wechat/callback` | POST | 微信签约回调 |
| `POST /api/v1/contract/alipay/callback` | POST | 支付宝签约回调 |
| `GET /api/v1/contract/status` | GET | 查询签约状态 |
| `POST /api/v1/contract/cancel` | POST | 用户主动解约 |
| `GET /api/v1/contract/list` | GET | 查询用户签约列表 |

### 10.2 扣款相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `POST /api/v1/deduct/wechat/callback` | POST | 微信扣款回调 |
| `POST /api/v1/deduct/alipay/callback` | POST | 支付宝扣款回调 |
| `GET /api/v1/deduct/records` | GET | 查询扣款记录 |

### 10.3 订阅相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `GET /api/v1/subscription/chain` | GET | 查询用户生效链 |
| `GET /api/v1/subscription/current` | GET | 查询当前生效订阅 |
| `POST /api/v1/subscription/cancel` | POST | 取消待生效订阅 |
| `POST /api/v1/subscription/toggle-auto-renewal` | POST | 开关自动续费 |

---

## 十一、文件结构规划

```
backend/
├── subscription/                    # 新增模块
│   ├── __init__.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── subscription.py          # 扩展现有订阅模型
│   │   └── contract.py              # 签约协议模型
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── subscription.py
│   │   └── contract.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── subscription_service.py
│   │   ├── chain_manager.py
│   │   ├── priority_calculator.py
│   │   ├── expiration_handler.py
│   │   ├── auto_renewal_service.py
│   │   ├── cancellation_service.py
│   │   └── upgrade_service.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── subscription.py
│   │   └── contract.py
│   └── tasks/
│       ├── __init__.py
│       ├── deduct_tasks.py          # 扣款定时任务
│       ├── expiration_tasks.py      # 到期处理任务
│       └── health_check_tasks.py    # 健康检查任务
│
├── payment/
│   ├── services/
│   │   ├── wechat_contract_service.py   # 新增：微信签约服务
│   │   ├── alipay_contract_service.py   # 新增：支付宝签约服务
│   │   ├── wechat_deduct_service.py     # 新增：微信扣款服务
│   │   └── alipay_deduct_service.py     # 新增：支付宝扣款服务
│   └── api/
│       └── contract.py                   # 新增：签约API
│
└── common/
    ├── distributed_lock.py               # 新增：分布式锁
    └── idempotent.py                     # 新增：幂等性工具
```

---

## 十二、实施步骤

### 第一阶段：基础设施（3-5天）
1. 创建数据库表（payment_contract, auto_deduct_record）
2. 扩展现有表字段
3. 实现分布式锁工具类
4. 配置微信/支付宝签约模板

### 第二阶段：签约功能（5-7天）
1. 实现微信签约服务（WeChatContractService）
2. 实现支付宝签约服务（AlipayContractService）
3. 实现签约API接口
4. 实现签约回调处理
5. 前端签约页面对接

### 第三阶段：自动扣款（7-10天）
1. 实现微信预通知服务
2. 实现微信扣款服务
3. 实现支付宝扣款服务
4. 实现扣款回调处理
5. 实现扣款重试机制

### 第四阶段：订阅生效链（5-7天）
1. 实现ChainManager生效链管理器
2. 实现优先级计算器
3. 实现到期处理器
4. 实现订阅状态流转
5. 单元测试

### 第五阶段：定时任务与监控（3-5天）
1. 配置APScheduler定时任务
2. 实现各定时任务逻辑
3. 实现监控指标采集
4. 配置告警规则
5. 实现健康检查

### 第六阶段：测试与上线（5-7天）
1. 接口测试
2. 集成测试
3. 压力测试
4. 灰度发布（10%用户）
5. 全量上线

---

## 十三、验证方案

### 13.1 功能测试
- [ ] 微信签约流程测试
- [ ] 支付宝签约流程测试
- [ ] 签约回调处理测试
- [ ] 微信预通知发送测试
- [ ] 微信扣款流程测试
- [ ] 支付宝扣款流程测试
- [ ] 扣款回调处理测试
- [ ] 生效链插入测试（各种场景）
- [ ] 订阅到期流转测试
- [ ] 自动续费关闭测试

### 13.2 异常测试
- [ ] 签约超时测试
- [ ] 扣款失败重试测试
- [ ] 回调重复处理测试
- [ ] 并发扣款测试
- [ ] 生效链断裂修复测试

### 13.3 性能测试
- [ ] 批量扣款性能测试（1000+/分钟）
- [ ] 并发回调处理测试（100+/秒）
- [ ] 生效链查询性能测试

---

## 十四、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 微信签约模板审核不通过 | 无法上线签约功能 | 提前申请，准备备选方案 |
| 扣款回调丢失 | 用户续费失败 | 定时任务主动查询补偿 |
| 高并发扣款导致数据库压力 | 系统响应变慢 | 分批处理、读写分离 |
| 生效链数据不一致 | 用户权益异常 | 健康检查+自动修复 |
| 支付平台接口变更 | 功能不可用 | 关注官方公告，及时适配 |

---

## 十五、配置项汇总

```python
# config/subscription.py

# 自动续费配置
AUTO_RENEWAL_NOTIFY_DAYS = 3          # 到期前N天发送预通知
AUTO_RENEWAL_RETRY_MAX = 3            # 扣款最大重试次数
AUTO_RENEWAL_RETRY_INTERVALS = [1, 3, 7]  # 重试间隔(天)

# 微信委托代扣配置
WECHAT_PAP_PLAN_ID = "xxx"            # 签约模板ID
WECHAT_PAP_NOTIFY_URL = "https://xxx/api/v1/contract/wechat/callback"
WECHAT_PAP_DEDUCT_NOTIFY_URL = "https://xxx/api/v1/deduct/wechat/callback"
WECHAT_PAP_DEDUCT_DURATION = 3        # 扣款周期(1-3天)

# 支付宝周期扣款配置
ALIPAY_CYCLE_PRODUCT_CODE = "CYCLE_PAY_AUTH"
ALIPAY_CYCLE_SIGN_SCENE = "INDUSTRY|CYCLE_PAY"
ALIPAY_CYCLE_NOTIFY_URL = "https://xxx/api/v1/contract/alipay/callback"
ALIPAY_DEDUCT_NOTIFY_URL = "https://xxx/api/v1/deduct/alipay/callback"

# 生效链配置
CHAIN_HEALTH_CHECK_ENABLED = True
CHAIN_AUTO_FIX_ENABLED = True

# 监控配置
MONITOR_SIGN_SUCCESS_THRESHOLD = 0.95
MONITOR_DEDUCT_SUCCESS_THRESHOLD = 0.90
MONITOR_CALLBACK_LATENCY_THRESHOLD = 5  # 秒
```
