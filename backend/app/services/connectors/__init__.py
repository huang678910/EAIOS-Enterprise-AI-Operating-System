"""Enterprise Knowledge Connectors — external data source integrations"""

from app.services.connectors.base import BaseConnector, ConnectorResult
from app.services.connectors.github_connector import GitHubConnector
from app.services.connectors.notion_connector import NotionConnector
from app.services.connectors.jira_connector import JiraConnector
from app.services.connectors.confluence_connector import ConfluenceConnector
from app.services.connectors.slack_connector import SlackConnector
from app.services.connectors.wecom_connector import WeComConnector

# Registry of available connectors
CONNECTOR_REGISTRY = {
    "github": GitHubConnector,
    "notion": NotionConnector,
    "jira": JiraConnector,
    "confluence": ConfluenceConnector,
    "slack": SlackConnector,
    "wecom": WeComConnector,
}

__all__ = [
    "BaseConnector", "ConnectorResult",
    "GitHubConnector", "NotionConnector", "JiraConnector", "ConfluenceConnector",
    "SlackConnector", "WeComConnector",
    "CONNECTOR_REGISTRY",
]
