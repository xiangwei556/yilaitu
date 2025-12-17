# ARK API Key 环境变量配置指南

本文档提供了如何在不同环境中正确配置和使用 `ARK_API_KEY` 环境变量的详细说明，以确保应用程序能够安全地访问火山引擎 ARK API。

## 环境变量设置方法

### Windows 系统

#### 临时设置（仅当前会话有效）
```powershell
# 在 PowerShell 中运行
$Env:ARK_API_KEY = "a9f93f53-05ea-40ca-a605-3e0601e6aaff"
```

#### 永久设置（用户级别）
```powershell
# 在 PowerShell 中运行
[Environment]::SetEnvironmentVariable("ARK_API_KEY", "a9f93f53-05ea-40ca-a605-3e0601e6aaff", "User")
```

#### 永久设置（系统级别）
```powershell
# 以管理员身份运行 PowerShell
[Environment]::SetEnvironmentVariable("ARK_API_KEY", "a9f93f53-05ea-40ca-a605-3e0601e6aaff", "Machine")
```

### Linux/macOS 系统

#### 临时设置（仅当前终端会话有效）
```bash
# 在终端中运行
export ARK_API_KEY="a9f93f53-05ea-40ca-a605-3e0601e6aaff"
```

#### 永久设置（用户级别）
```bash
# 将以下行添加到 ~/.bashrc 或 ~/.bash_profile 或 ~/.zshrc

# 使用 bash
echo 'export ARK_API_KEY="a9f93f53-05ea-40ca-a605-3e0601e6aaff"' >> ~/.bashrc
source ~/.bashrc

# 或使用 zsh
echo 'export ARK_API_KEY="a9f93f53-05ea-40ca-a605-3e0601e6aaff"' >> ~/.zshrc
source ~/.zshrc
```

## 开发环境配置

在开发环境中：

1. 可以使用上述临时设置方法快速配置
2. 确保开发环境的 IDE 或编辑器能够正确读取系统环境变量
3. 重启 IDE 或终端以确保环境变量生效
4. 不要在本地开发机器上使用与生产环境相同的 API Key

## 生产环境配置

在生产环境中：

1. 使用系统级别的永久环境变量设置
2. 对于容器化部署，使用容器平台的密钥管理功能：
   - Docker: 使用环境变量或 Docker Secrets
   - Kubernetes: 使用 ConfigMaps 和 Secrets
3. 定期轮换 API Key 以增强安全性
4. 限制 API Key 的访问权限和使用范围

## 配置验证

使用以下方法验证环境变量配置是否生效：

### Windows PowerShell
```powershell
Get-ChildItem Env:ARK_API_KEY
```

### Linux/macOS 终端
```bash
echo $ARK_API_KEY
```

### Python 验证
使用项目中的验证脚本：
```bash
python verify_ark_api_key.py
```

## 安全最佳实践

1. **不要硬编码 API Key**：避免在源代码、配置文件或版本控制系统中存储 API Key
2. **使用环境变量**：所有敏感凭据都应该通过环境变量提供
3. **最小权限原则**：为 API Key 分配最小必要的权限
4. **定期轮换**：定期更新和轮换 API Key
5. **监控使用**：监控 API Key 的使用情况，及时发现异常访问
6. **加密存储**：在必要时使用密钥管理服务或加密存储解决方案

## 代码配置说明

项目中的配置已经优化，通过以下方式使用环境变量：

```python
# 在 app/config.py 中已配置
ARK_API_KEY = os.getenv("ARK_API_KEY", "")
```

应用程序将优先从环境变量读取 API Key，确保了凭据的安全性和可配置性。

---

**注意：** 请妥善保管您的 API Key，不要分享给未授权的人员或在公共场合泄露。
