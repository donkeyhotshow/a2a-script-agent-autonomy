"""
Network Utilities Module
Common network-related helper functions
"""
import socket
import logging

# Setup logger
logger = logging.getLogger(__name__)


def check_port_occupied(host: str, port: int) -> bool:
    """Проверяет занят ли порт"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.connect((host, port))
        sock.close()
        return True
    except Exception as e:
        logger.warning("Port check failed for %s:%s: %s", host, port, e)
        return False
