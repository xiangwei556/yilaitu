import uvicorn
import os
import sys
# 添加当前目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 使用importlib来导入main.py文件
import importlib.util

if __name__ == "__main__":
    # 获取main.py文件的完整路径
    main_py_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "main.py")
    
    # 创建一个模块规范
    spec = importlib.util.spec_from_file_location("main_module", main_py_path)
    
    # 创建模块对象
    main_module = importlib.util.module_from_spec(spec)
    
    # 将模块添加到sys.modules中，这样其他导入也能找到它
    sys.modules["main_module"] = main_module
    
    # 执行模块
    spec.loader.exec_module(main_module)
    
    # 运行FastAPI应用
    uvicorn.run(main_module.app, host="0.0.0.0", port=8001)