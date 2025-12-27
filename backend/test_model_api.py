import requests

# 测试yilaitumodel API端点
def test_model_api():
    url = "http://localhost:8001/api/v1/yilaitumodel/admin/models?page=1&page_size=10"
    print(f"发送请求到 {url}")
    
    try:
        response = requests.get(url)
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("响应内容:", response.json())
        else:
            print("响应内容:", response.text)
            print("错误信息:", response.reason)
            
    except Exception as e:
        print(f"请求失败: {e}")

if __name__ == "__main__":
    test_model_api()