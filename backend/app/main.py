"""AI Multi-Agent Enterprise Workspace — FastAPI 应用入口"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api.v1.router import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时加载模型，关闭时清理资源"""
    # 启动时：预热 Embedding 模型
    try:
        from app.services.embedding_service import warmup_embedding_model
        await warmup_embedding_model()
    except Exception:
        # 模型预热失败不阻止启动（首次请求时会重试）
        pass
    yield
    # 关闭时：清理（如有需要）


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="Enterprise AI Knowledge Work Platform with Multi-Agent Collaboration",
    lifespan=lifespan,
)

# CORS — MVP 允许所有来源
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理 — 不覆盖 HTTPException 的状态码"""
    from fastapi.exceptions import HTTPException
    if isinstance(exc, HTTPException):
        from starlette.responses import Response
        # 让 FastAPI 内置的 HTTPException handler 处理
        raise exc
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


# 挂载路由
app.include_router(api_router)


@app.get("/", tags=["Health"])
async def root():
    return {"name": settings.APP_NAME, "version": "0.1.0", "status": "running"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "database": "pending", "embedding_model": settings.EMBEDDING_MODEL}
