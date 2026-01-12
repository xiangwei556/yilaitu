# 支付系统使用说明

## 一、安装依赖

### 1.1 Python依赖
```bash
pip install httpx cryptography
```

### 1.2 微信支付SDK（可选，推荐使用官方SDK）
```bash
pip install wechatpay-python
```

### 1.3 支付宝SDK（可选，推荐使用官方SDK）
```bash
pip install python-alipay-sdk
```

## 二、数据库迁移

执行数据库迁移脚本：
```bash
mysql -u root -p image_edit_db < backend/payment/database_migration.sql
```

或者手动执行SQL文件中的语句。

## 三、配置支付参数

在 `backend/.env` 文件中添加以下配置：

### 3.1 微信支付配置
```env
# 微信支付配置
WECHAT_PAY_APP_ID=your_wechat_app_id
WECHAT_PAY_MCH_ID=your_merchant_id
WECHAT_PAY_API_KEY=your_api_key
WECHAT_PAY_API_V3_KEY=your_api_v3_key
WECHAT_PAY_CERT_PATH=/path/to/cert.pem
WECHAT_PAY_NOTIFY_URL=https://your-domain.com/api/v1/payment/wechat/callback
```

### 3.2 支付宝配置
```env
# 支付宝配置
ALIPAY_APP_ID=your_alipay_app_id
ALIPAY_PRIVATE_KEY=your_private_key
ALIPAY_PUBLIC_KEY=your_alipay_public_key
ALIPAY_NOTIFY_URL=https://your-domain.com/api/v1/payment/alipay/callback
ALIPAY_RETURN_URL=https://your-domain.com/payment/return
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
```

### 3.3 订单配置
```env
# 订单配置
ORDER_EXPIRE_MINUTES=30
QR_CODE_EXPIRE_MINUTES=15
PAYMENT_QUERY_RETRY_MAX=5
```

## 四、API接口说明

### 4.1 创建支付订单
```
POST /api/v1/payment/create-order
Authorization: Bearer {token}

Request Body:
{
    "product_type": "membership",  // membership 或 points
    "product_id": 1,
    "payment_method": "wechat",    // wechat 或 alipay
    "is_upgrade": false             // 仅会员订单有效
}

Response:
{
    "order_no": "ORD202501011200001",
    "amount": 99.00,
    "qr_code_url": "weixin://wxpay/bizpayurl?pr=xxx",
    "qr_code_expire_at": "2025-01-01T12:15:00",
    "expire_at": "2025-01-01T12:30:00"
}
```

### 4.2 查询订单状态
```
GET /api/v1/payment/order-status?order_no=ORD202501011200001
Authorization: Bearer {token}

Response:
{
    "order_no": "ORD202501011200001",
    "status": "paid",
    "amount": 99.00,
    "payment_time": "2025-01-01T12:05:00"
}
```

### 4.3 取消订单
```
POST /api/v1/payment/cancel-order
Authorization: Bearer {token}

Request Body:
{
    "order_no": "ORD202501011200001"
}

Response:
{
    "code": 200,
    "msg": "订单已取消",
    "data": null
}
```

## 五、支付回调配置

### 5.1 微信支付回调
- 在微信商户平台配置回调地址：`https://your-domain.com/api/v1/payment/wechat/callback`
- 确保回调地址使用HTTPS（生产环境）

### 5.2 支付宝回调
- 在支付宝开放平台配置回调地址：`https://your-domain.com/api/v1/payment/alipay/callback`
- 确保回调地址使用HTTPS（生产环境）

## 六、前端集成

### 6.1 创建支付订单
```typescript
const createOrder = async (productType: string, productId: number, paymentMethod: string) => {
  const response = await request.post('/payment/create-order', {
    product_type: productType,
    product_id: productId,
    payment_method: paymentMethod,
    is_upgrade: false
  });
  
  return response.data;
};
```

### 6.2 显示支付二维码
```typescript
import QRCode from 'qrcode';

const showQRCode = async (qrCodeUrl: string) => {
  // 生成二维码图片
  const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);
  // 显示二维码
  // ...
};
```

### 6.3 轮询订单状态
```typescript
const pollOrderStatus = async (orderNo: string) => {
  const interval = setInterval(async () => {
    const response = await request.get(`/payment/order-status?order_no=${orderNo}`);
    const { status } = response.data;
    
    if (status === 'paid') {
      clearInterval(interval);
      // 处理支付成功
    } else if (status === 'cancelled') {
      clearInterval(interval);
      // 处理订单取消
    }
  }, 3000); // 每3秒查询一次
  
  // 30秒后停止轮询
  setTimeout(() => clearInterval(interval), 30000);
};
```

### 6.4 WebSocket监听支付成功
```typescript
// 如果已建立WebSocket连接
websocket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'payment_success' && data.order_no === orderNo) {
    // 处理支付成功
  }
};
```

## 七、订单状态说明

- `pending`: 待支付
- `paid`: 已支付
- `cancelled`: 已取消
- `refunded`: 已退款

## 八、定时任务

系统会自动运行以下定时任务：

1. **取消过期订单任务**：每分钟执行一次，自动取消超过30分钟未支付的订单
2. **查询待支付订单状态任务**：每5分钟执行一次，主动查询pending状态的订单支付状态

## 九、注意事项

1. **签名验证**：微信支付和支付宝的回调都必须验证签名，确保安全性
2. **幂等性**：支付回调可能重复，系统已实现幂等性处理
3. **金额校验**：支付回调中的金额必须与订单金额一致
4. **HTTPS**：生产环境必须使用HTTPS
5. **证书管理**：微信支付证书需要安全存储
6. **日志记录**：所有支付操作都会记录到 `payment_records` 表

## 十、测试

### 10.1 沙箱环境测试
- 微信支付：使用微信支付沙箱环境
- 支付宝：使用支付宝沙箱环境（修改 `ALIPAY_GATEWAY` 为沙箱地址）

### 10.2 测试流程
1. 创建测试订单
2. 使用沙箱环境扫码支付
3. 验证回调处理
4. 验证业务逻辑（会员开通/积分充值）

## 十一、常见问题

### 11.1 支付回调未收到
- 检查回调地址配置是否正确
- 检查服务器是否可访问（防火墙、Nginx配置）
- 查看支付平台的回调日志

### 11.2 签名验证失败
- 检查密钥配置是否正确
- 检查签名算法实现是否正确
- 查看支付平台的签名文档

### 11.3 订单状态未更新
- 检查定时任务是否正常运行
- 检查数据库连接是否正常
- 查看系统日志排查问题

## 十二、安全建议

1. **密钥管理**：使用环境变量或密钥管理服务存储敏感信息
2. **HTTPS**：生产环境必须使用HTTPS
3. **IP白名单**：建议配置支付平台回调IP白名单
4. **日志审计**：定期检查支付记录，发现异常及时处理
5. **金额限制**：设置单笔订单金额上限，防止异常订单