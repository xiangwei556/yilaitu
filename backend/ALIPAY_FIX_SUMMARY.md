# 支付宝根证书序列号计算修复总结

## 问题分析

支付宝根证书文件包含4个证书，但支付宝官方只认可其中3个根证书：
1. Ant Financial Certification Authority R1: `687b59193f3f462dd5336e5abf83c5d8`
2. Ant Financial Certification Authority E1: `8af620707e5ddd8c7e76747e86a604dc`
3. iTrusChina Class 2 Root CA - G3: `02941eef3187dddf3d3b83462e1dfcf6`

根证书文件中包含一个额外的非官方证书（ROOTCA: `9e64d67d36446de33aae13a33a89e5a7`），导致支付宝返回"无效支付宝根证书序列号"错误。

## 修复方案

修改了 [alipay_service.py](file:///d:/trae_projects/image-edit/backend/payment/services/alipay_service.py#L125-L224) 中的 `_get_alipay_root_cert_sn` 方法：

### 主要修改内容

1. **添加官方根证书CN列表过滤**：
   ```python
   official_root_cert_cns = [
       "Ant Financial Certification Authority R1",
       "Ant Financial Certification Authority E1",
       "iTrusChina Class 2 Root CA - G3"
   ]
   ```

2. **在解析每个证书时检查CN**：
   ```python
   # 获取证书的 Common Name (CN)
   cert_cn = None
   for attr in cert.subject:
       if attr.oid == x509.oid.NameOID.COMMON_NAME:
           cert_cn = attr.value
           break

   # 只处理支付宝官方认可的根证书
   if cert_cn not in official_root_cert_cns:
       logger.info(f"[支付宝] 跳过非官方根证书: {cert_cn}")
       continue
   ```

3. **只计算官方根证书的SN并拼接**：
   ```python
   # 拼接所有根证书SN（用下划线分隔）
   self._alipay_root_cert_sn = "_".join(cert_sns)
   ```

## 测试结果

### 测试1：根证书SN计算
```
跳过非官方根证书: ROOTCA
根证书 [Ant Financial Certification Authority R1] SN: 687b59193f3f462dd5336e5abf83c5d8
根证书 [Ant Financial Certification Authority E1] SN: 8af620707e5ddd8c7e76747e86a604dc
根证书 [iTrusChina Class 2 Root CA - G3] SN: 02941eef3187dddf3d3b83462e1dfcf6

最终根证书SN: 687b59193f3f462dd5336e5abf83c5d8_8af620707e5ddd8c7e76747e86a604dc_02941eef3187dddf3d3b83462e1dfcf6
✓ 根证书SN计算正确
```

### 测试2：完整支付流程
```
应用证书SN: e131b05741200b0585b2038c23782398
根证书SN: 687b59193f3f462dd5336e5abf83c5d8_8af620707e5ddd8c7e76747e86a604dc_02941eef3187dddf3d3b83462e1dfcf6
✓ 支付URL创建成功
```

## 验证结果

- ✓ 成功跳过非官方根证书（ROOTCA）
- ✓ 正确计算所有官方根证书的SN
- ✓ 根证书SN格式正确（用下划线分隔）
- ✓ 签名生成成功
- ✓ 支付URL创建成功

## 预期效果

修复后，支付宝API调用应该不再返回"无效支付宝根证书序列号"错误，因为现在只发送支付宝官方认可的三个根证书的序列号。

## 相关文件

- [alipay_service.py](file:///d:/trae_projects/image-edit/backend/payment/services/alipay_service.py#L125-L224) - 主要修改的文件
- [test_fixed_root_cert_direct.py](file:///d:/trae_projects/image-edit/backend/test_fixed_root_cert_direct.py) - 根证书SN计算测试
- [test_full_payment_flow.py](file:///d:/trae_projects/image-edit/backend/test_full_payment_flow.py) - 完整支付流程测试
