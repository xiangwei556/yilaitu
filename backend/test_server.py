from fastapi import FastAPI
import uvicorn

# 直接创建FastAPI实例
app = FastAPI(
    title="易可图 - 测试服务",
    description="简单的测试服务",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"message": "服务正在运行"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("test_server:app", host="127.0.0.1", port=8000, reload=True)
