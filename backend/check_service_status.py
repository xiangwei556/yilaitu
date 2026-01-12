"""
检查服务运行状态
"""
import sys
import os
import socket
import requests

def check_port(host, port):
    """检查端口是否可访问"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except:
        return False

def check_backend_health():
    """检查后端健康状态"""
    try:
        response = requests.get("http://localhost:8001/health", timeout=2)
        if response.status_code == 200:
            return True, response.json()
        return False, f"状态码: {response.status_code}"
    except requests.exceptions.RequestException as e:
        return False, str(e)

def main():
    print("=" * 60)
    print("服务状态检查")
    print("=" * 60)
    
    # 检查后端服务（8001端口）
    print("\n[后端服务]")
    backend_port_ok = check_port("localhost", 8001)
    if backend_port_ok:
        print("  [OK] 端口 8001 正在监听")
        health_ok, health_info = check_backend_health()
        if health_ok:
            print(f"  [OK] 健康检查通过: {health_info}")
            print("  [OK] 后端服务运行正常")
        else:
            print(f"  [失败] 健康检查失败: {health_info}")
    else:
        print("  [失败] 端口 8001 未监听")
        print("  [失败] 后端服务未启动")
    
    # 检查前端服务（80端口）
    print("\n[前端服务]")
    frontend_port_ok = check_port("localhost", 80)
    if frontend_port_ok:
        print("  [OK] 端口 80 正在监听")
        print("  [OK] 前端服务运行正常")
    else:
        print("  [失败] 端口 80 未监听")
        print("  [失败] 前端服务未启动")
    
    print("\n" + "=" * 60)
    if backend_port_ok and frontend_port_ok:
        print("[成功] 前后端服务都在运行")
        print("=" * 60)
        print("\n访问地址：")
        print("  前端: http://yilaitu.com 或 http://localhost")
        print("  后端: http://localhost:8001")
        print("  健康检查: http://localhost:8001/health")
        print("  API文档: http://localhost:8001/docs")
    else:
        print("[警告] 部分服务未运行，请检查")
        print("=" * 60)
    
    return backend_port_ok and frontend_port_ok

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except ImportError:
        print("需要安装 requests 库: pip install requests")
        sys.exit(1)