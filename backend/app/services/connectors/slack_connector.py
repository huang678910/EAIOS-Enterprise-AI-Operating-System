"""Slack 连接器 — 同步频道消息到知识库"""

import logging
from app.services.connectors.base import BaseConnector, ConnectorResult

logger = logging.getLogger(__name__)


class SlackConnector(BaseConnector):
    """Slack Knowledge Connector — sync channel messages"""

    source_type = "slack"

    def __init__(self, config: dict):
        super().__init__(config)
        self.bot_token = config.get("bot_token", "")
        self.channel_id = config.get("channel_id", "")

    async def validate_connection(self) -> bool:
        if not self.bot_token:
            return False
        try:
            import httpx
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    "https://slack.com/api/auth.test",
                    headers={"Authorization": f"Bearer {self.bot_token}"},
                )
                return resp.status_code == 200 and resp.json().get("ok", False)
        except Exception as e:
            logger.warning(f"Slack connection failed: {e}")
            return False

    async def list_resources(self) -> list[dict]:
        resources = []
        try:
            import httpx
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    "https://slack.com/api/conversations.list",
                    headers={"Authorization": f"Bearer {self.bot_token}"},
                    params={"limit": 20, "types": "public_channel,private_channel"},
                )
                if resp.status_code == 200 and resp.json().get("ok"):
                    for ch in resp.json().get("channels", []):
                        resources.append({"id": ch["id"], "name": ch["name"], "type": "channel"})
        except Exception as e:
            logger.error(f"Slack list_resources error: {e}")
        return resources

    async def fetch_all(self) -> list[ConnectorResult]:
        results = []
        try:
            channels = await self.list_resources()
            target = [c for c in channels if c["id"] == self.channel_id] if self.channel_id else channels[:3]
            import httpx
            async with httpx.AsyncClient(timeout=30) as client:
                for ch in target:
                    resp = await client.get(
                        "https://slack.com/api/conversations.history",
                        headers={"Authorization": f"Bearer {self.bot_token}"},
                        params={"channel": ch["id"], "limit": 20},
                    )
                    if resp.status_code == 200 and resp.json().get("ok"):
                        messages = resp.json().get("messages", [])
                        text_parts = []
                        for msg in messages:
                            if msg.get("text") and msg.get("subtype") != "channel_join":
                                text_parts.append(msg["text"])
                        if text_parts:
                            results.append(ConnectorResult(
                                title=f"[Slack] #{ch['name']}",
                                content="\n\n".join(text_parts),
                                source_url=f"https://slack.com/archives/{ch['id']}",
                                metadata={"channel": ch["name"], "message_count": len(text_parts)},
                            ))
        except Exception as e:
            logger.error(f"Slack fetch_all error: {e}")
        return results
