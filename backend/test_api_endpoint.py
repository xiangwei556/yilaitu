import requests
import os

def test_process_image_api():
    url = "http://localhost:8001/api/process-image"
    file_path = "uploads/products/test.jpg"
    
    # 检查文件是否存在
    if not os.path.exists(file_path):
        print(f"错误：测试文件 {file_path} 不存在")
        return
    
    # 准备表单数据
    files = {
        'file': open(file_path, 'rb')
    }
    data = {
        'width': 800,
        'height': 600,
        'background_type': 'white'
    }
    
    print(f"发送请求到 {url}...")
    try:
        # 发送POST请求
        response = requests.post(url, files=files, data=data)
        
        # 打印响应状态码和内容
        print(f"响应状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        # 尝试解析JSON响应
        try:
            json_response = response.json()
            print("JSON响应:")
            for key, value in json_response.items():
                print(f"  {key}: {value}")
        except ValueError:
            print("无法解析JSON响应")
    
    except Exception as e:
        print(f"请求失败: {str(e)}")
    finally:
        # 确保文件被关闭
        if 'files' in locals() and 'file' in files:
            files['file'].close()

if __name__ == "__main__":
    test_process_image_api()