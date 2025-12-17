# MCP服务器配置与运行指南

## 问题描述
在安装和启动MCP服务时，遇到了以下错误：
```
git.exc.NoSuchPathError: C:\Users\29232\path\to\git\repo
```

这个错误表明MCP服务器无法找到正确的Git仓库路径。

## 解决方案

### 1. 环境配置
- 确保`uv`和`uvx`命令已安装在`C:\Users\29232\.local\bin`目录
- 添加环境变量到系统PATH：`C:\Users\29232\.local\bin`

### 2. 自动启动脚本
我们创建了一个PowerShell脚本`start_mcp_server.ps1`来自动处理以下操作：
- 设置必要的环境变量
- 检查并初始化Git仓库
- 使用正确的参数启动MCP服务器

### 3. 使用方法

#### 启动MCP服务器
```powershell
# 在项目根目录运行
powershell -ExecutionPolicy Bypass -File start_mcp_server.ps1
```

#### 手动启动命令
如果需要手动启动，可以执行以下命令：
```powershell
# 设置环境变量
$env:Path += ";C:\Users\29232\.local\bin"

# 初始化Git仓库（如果尚未初始化）
if(!(Test-Path 'D:\trae_projects\image-edit\.git')) {
    git init 'D:\trae_projects\image-edit'
}

# 启动MCP服务器，指定正确的Git仓库路径
C:\Users\29232\.local\bin\uvx.exe mcp-server-git -r 'D:\trae_projects\image-edit'
```

### 4. 重要参数说明
- `-r, --repository PATH`: 指定Git仓库路径，必须是一个有效的Git仓库（包含.git目录）
- `-v, --verbose`: 启用详细输出模式

### 5. 故障排除

#### 常见问题
1. **找不到uv或uvx命令**
   - 确保这些命令已正确安装在`C:\Users\29232\.local\bin`目录
   - 检查环境变量是否已正确设置

2. **不是有效的Git仓库**
   - 运行脚本会自动初始化Git仓库
   - 或者手动运行`git init`命令初始化

3. **参数错误**
   - 确保使用`-r`参数指定仓库路径，而不是直接作为位置参数传递

## 注意事项
- 确保Git已安装在系统中
- 脚本会自动在当前项目目录初始化Git仓库
- 运行脚本时需要管理员权限以确保环境变量设置正确