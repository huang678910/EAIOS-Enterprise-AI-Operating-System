"""Embedding 服务 — 基于 sentence-transformers 的本地向量化"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# 全局单例
_embed_model = None
_executor = ThreadPoolExecutor(max_workers=2)


def _load_model():
    """在后台线程中加载模型（避免阻塞事件循环）"""
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer

        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        _embed_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info("Embedding model loaded successfully")


async def warmup_embedding_model():
    """FastAPI 启动时预热：加载模型到内存"""
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(_executor, _load_model)


def _encode_sync(texts: list[str]) -> list[list[float]]:
    """同步编码文本（运行在线程池中）"""
    if _embed_model is None:
        _load_model()
    embeddings = _embed_model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return embeddings.tolist()


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """异步批量编码文本"""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _encode_sync, texts)


async def embed_single(text: str) -> list[float]:
    """异步编码单个文本"""
    results = await embed_texts([text])
    return results[0]
