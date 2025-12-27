#!/usr/bin/env python3
"""
服务自动化管理脚本
根据《前后端服务启动操作规范》自动执行服务启动、重启等操作
"""

import os
import subprocess
import sys
import time
import signal
import psutil

# 项目配置
CONFIG = {
    "backend": {
        "path": "d:/trae_projects/image-edit/backend",
        "port": 8001,
        "command": "python -m uvicorn main:app --reload --port 8001",
        "name": "后端服务"
    },
    "frontend": {
        "path": "d:/trae_projects/image-edit/frontend",
        "port": 80,
        "command": "npm run dev",
        "name": "前端服务"
    }
}

# 颜色输出
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_color(message, color):
    """打印带颜色的消息"""
    print(f"{color}{message}{Colors.ENDC}")

def check_port_in_use(port):
    """检查端口是否被占用"""
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            for conns in proc.net_connections(kind='inet'):
                if conns.laddr.port == port:
                    return True, proc
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    return False, None

def kill_process_on_port(port):
    """终止占用指定端口的进程"""
    in_use, proc = check_port_in_use(port)
    if in_use:
        print_color(f"端口 {port} 被进程 {proc.name()} (PID: {proc.pid}) 占用，正在终止...", Colors.WARNING)
        try:
            proc.terminate()
            time.sleep(1)
            if proc.is_running():
                proc.kill()
            print_color(f"已终止占用端口 {port} 的进程", Colors.OKGREEN)
        except Exception as e:
            print_color(f"终止进程失败: {e}", Colors.FAIL)
            return False
    return True

def start_service(service_type):
    """启动指定类型的服务"""
    config = CONFIG.get(service_type)
    if not config:
        print_color(f"未知服务类型: {service_type}", Colors.FAIL)
        return False
    
    # 检查端口
    if not kill_process_on_port(config["port"]):
        return False
    
    # 切换目录并启动服务
    print_color(f"正在启动 {config['name']}...", Colors.OKBLUE)
    print_color(f"路径: {config['path']}", Colors.OKBLUE)
    print_color(f"命令: {config['command']}", Colors.OKBLUE)
    
    try:
        # 使用start命令在新窗口中启动服务
        if service_type == "frontend":
            # 前端需要管理员权限
            cmd = f'start "{config["name"]}" cmd /k "cd /d {config["path"]} && {config["command"]}"'
        else:
            cmd = f'start "{config["name"]}" cmd /k "cd /d {config["path"]} && {config["command"]}"'
        
        subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        time.sleep(2)  # 等待服务启动
        
        # 检查服务是否启动成功
        if check_port_in_use(config["port"])[0]:
            print_color(f"{config['name']} 已成功启动在端口 {config['port']}", Colors.OKGREEN)
            return True
        else:
            print_color(f"{config['name']} 启动失败，端口 {config['port']} 未被占用", Colors.FAIL)
            return False
            
    except Exception as e:
        print_color(f"启动 {config['name']} 失败: {e}", Colors.FAIL)
        return False

def restart_service(service_type):
    """重启指定类型的服务"""
    print_color(f"正在重启 {CONFIG[service_type]['name']}...", Colors.WARNING)
    return start_service(service_type)  # 启动会自动终止旧进程

def start_all():
    """启动所有服务"""
    print_color("="*50, Colors.HEADER)
    print_color("启动所有服务".center(50), Colors.HEADER)
    print_color("="*50, Colors.HEADER)
    
    # 先启动后端
    if start_service("backend"):
        time.sleep(1)
        # 再启动前端
        start_service("frontend")
    
    print_color("\n服务启动完成！", Colors.OKGREEN)
    print_color("前端访问: http://yilaitu.com", Colors.BOLD)
    print_color("后端访问: http://localhost:8001", Colors.BOLD)

def restart_all():
    """重启所有服务"""
    print_color("="*50, Colors.HEADER)
    print_color("重启所有服务".center(50), Colors.HEADER)
    print_color("="*50, Colors.HEADER)
    
    restart_service("backend")
    time.sleep(1)
    restart_service("frontend")
    
    print_color("\n服务重启完成！", Colors.OKGREEN)
    print_color("前端访问: http://yilaitu.com", Colors.BOLD)
    print_color("后端访问: http://localhost:8001", Colors.BOLD)

def show_status():
    """显示所有服务状态"""
    print_color("="*50, Colors.HEADER)
    print_color("服务状态监控".center(50), Colors.HEADER)
    print_color("="*50, Colors.HEADER)
    
    for service_type, config in CONFIG.items():
        in_use, proc = check_port_in_use(config["port"])
        if in_use:
            status = f"{Colors.OKGREEN}运行中{Colors.ENDC} (PID: {proc.pid})"
        else:
            status = f"{Colors.FAIL}未运行{Colors.ENDC}"
        
        print(f"{config['name']} ({service_type}): {status}")
        print(f"  端口: {config['port']}")
        print(f"  路径: {config['path']}")
        if in_use:
            print(f"  进程: {proc.name()}")
        print()
    
    # 检查连通性
    print_color("连通性检查:", Colors.WARNING)
    try:
        result = subprocess.run(
            [sys.executable, "-c", "import requests; r = requests.get('http://localhost:8001/docs', timeout=3); print(f'后端API文档: {r.status_code}')"],
            capture_output=True, text=True
        )
        print(result.stdout.strip())
    except Exception as e:
        print(f"后端API文档: {Colors.FAIL}无法访问{Colors.ENDC} - {e}")
    
    try:
        result = subprocess.run(
            [sys.executable, "-c", "import requests; r = requests.get('http://yilaitu.com', timeout=3); print(f'前端页面: {r.status_code}')"],
            capture_output=True, text=True
        )
        print(result.stdout.strip())
    except Exception as e:
        print(f"前端页面: {Colors.FAIL}无法访问{Colors.ENDC} - {e}")

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print_color("服务自动化管理脚本", Colors.HEADER)
        print_color("Usage:", Colors.BOLD)
        print(f"  {sys.argv[0]} start <service>      # 启动指定服务 (frontend/backend/all)")
        print(f"  {sys.argv[0]} restart <service>    # 重启指定服务 (frontend/backend/all)")
        print(f"  {sys.argv[0]} status               # 显示服务状态")
        print()
        print_color("Examples:", Colors.BOLD)
        print(f"  {sys.argv[0]} start all           # 启动前后端服务")
        print(f"  {sys.argv[0]} restart backend     # 重启后端服务")
        print(f"  {sys.argv[0]} status             # 查看所有服务状态")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "start":
        if len(sys.argv) < 3:
            print_color("请指定服务类型: frontend/backend/all", Colors.FAIL)
            sys.exit(1)
        
        service = sys.argv[2]
        if service == "all":
            start_all()
        else:
            start_service(service)
    
    elif command == "restart":
        if len(sys.argv) < 3:
            print_color("请指定服务类型: frontend/backend/all", Colors.FAIL)
            sys.exit(1)
        
        service = sys.argv[2]
        if service == "all":
            restart_all()
        else:
            restart_service(service)
    
    elif command == "status":
        show_status()
    
    else:
        print_color(f"未知命令: {command}", Colors.FAIL)
        sys.exit(1)

if __name__ == "__main__":
    # 确保在Windows上也能正常输出颜色
    if os.name == 'nt':
        os.system('color')
    
    main()