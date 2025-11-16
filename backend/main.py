import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, protected, apikeys, codereview
from app.utils.database import connect_to_mongo, close_mongo_connection
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时连接数据库
    await connect_to_mongo()
    yield
    # 关闭时断开数据库连接
    await close_mongo_connection()

app = FastAPI(
    title="智能代码审查系统API",
    description="智能代码审查系统API",
    version="1.0.0",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 前端地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(protected.router, prefix="/api", tags=["受保护的路由"])
app.include_router(apikeys.router, prefix="/api/apikeys", tags=["API密钥管理"])
app.include_router(codereview.router, prefix="/api/codereview", tags=["代码审查"])

@app.get("/")
def read_root():
    return {"message": "智能代码审查系统API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


