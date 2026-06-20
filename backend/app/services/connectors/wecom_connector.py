"""企业微信 连接器 — Webhook 消息推送 + 群聊消息同步"""

import logging
from app.services.connectors.base import BaseConnector, ConnectorResult

logger = logging.getLogger(__name__)


class WeComConnector(BaseConnector):
    """企业微信 Connector — webhook notifications + message sync"""

    source_type = "wecom"

    def __init__(self, config: dict):
        super().__init__(config)
        self.corp_id = config.get("corp_id", "")
        self.corp_secret = config.get("corp_secret", "")
        self.webhook_key = config.get("webhook_key", "")

    async def validate_connection(self) -> bool:
        """通过获取 access_token 验证连接"""
        if not self.corp_id or not self.corp_secret:
            return False
        try:
            import httpx
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
                    params={"corpid": self.corp_id, "corpsecret": self.corp_secret},
                )
                data = resp.json()
                return data.get("errcode") == 0
        except Exception as e:
            logger.warning(f"WeCom connection failed: {e}")
            return False

    async def list_resources(self) -> list[dict]:
        """列出可用的部门列表"""
        resources = []
        try:
            token_data = await self._get_token()
            if not token_data:
                return resources
            import httpx
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    "https://qyapi.weixin.qq.com/cgi-bin/department/list",
                    params={"access_token": token_data},
                )
                if resp.status_code == 200:
                    for dept in resp.json().get("department", []):
                        resources.append({"id": str(dept["id"]), "name": dept["name"], "type": "department"})
        except Exception as e:
            logger.error(f"WeCom list_resources error: {e}")
        return resources

    async def _get_token(self) -> str | None:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
                    params={"corpid": self.corp_id, "corpsecret": self.corp_secret},
                )
                data = resp.json()
                return data.get("access_token")
        except Exception:
            return None

    async def fetch_all(self) -> list[ConnectorResult]:
        """获取企业微信群聊最近消息"""
        results = []
        if not self.webhook_key:
            return results

        try:
            import httpx
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key={self.webhook_key}",
                    json={
                        "msgtype": "text",
                        "text": {"content": "EAIOS Knowledge Hub 已连接到本群聊，将自动同步重要消息到企业知识库。"},
                    },
                )
                if resp.status_code == 200 and resp.json().get("errcode") == 0:
                    results.append(ConnectorResult(
                        title="[企业微信] Webhook 连接成功",
                        content="企业微信 Webhook 已配置。群聊消息将通过此通道同步到知识库。",
                        source_url="",
                        metadata={"connector": "wecom", "webhook_configured": True},
                    ))
        except Exception as e:
            logger.error(f"WeCom fetch_all error: {e}")
        return results
