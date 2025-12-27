@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title 服务自动化管理

:menu
echo ============================================================
echo                前后端服务自动化管理
echo ============================================================
echo.
echo [1] 启动所有服务
echo [2] 重启所有服务
echo [3] 启动前端服务
echo [4] 重启前端服务
echo [5] 启动后端服务
echo [6] 重启后端服务
echo [7] 查看服务状态
echo [0] 退出
echo.

set /p choice=请输入选项: 

if "%choice%"=="1" (
    echo 正在启动所有服务...
    python automate_serve.py start all
    echo 按任意键返回菜单...
    pause >nul
    goto menu
)

if "%choice%"=="2" (
    echo 正在重启所有服务...
    python automate_serve.py restart all
    echo 按任意键返回菜单...
    pause >nul
    goto menu
)

if "%choice%"=="3" (
    echo 正在启动前端服务...
    python automate_serve.py start frontend
    echo 按任意键返回菜单...
    pause >nul
    goto menu
)

if "%choice%"=="4" (
    echo 正在重启前端服务...
    python automate_serve.py restart frontend
    echo 按任意键返回菜单...
    pause >nul
    goto menu
)

if "%choice%"=="5" (
    echo 正在启动后端服务...
    python automate_serve.py start backend
    echo 按任意键返回菜单...
    pause >nul
    goto menu
)

if "%choice%"=="6" (
    echo 正在重启后端服务...
    python automate_serve.py restart backend
    echo 按任意键返回菜单...
    pause >nul
    goto menu
)

if "%choice%"=="7" (
    echo 正在检查服务状态...
    python automate_serve.py status
    echo 按任意键返回菜单...
    pause >nul
    goto menu
)

if "%choice%"=="0" (
    echo 退出程序...
    exit
)

echo 无效的选项，请重新输入
echo 按任意键返回菜单...
pause >nul
goto menu