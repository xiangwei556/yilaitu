"""
ID生成器工具 - 支持多服务器部署
通过机器ID区分不同服务器，保证分布式环境下ID唯一性
"""
import threading
from datetime import datetime
from backend.passport.app.core.config import settings


class IdGenerator:
    """
    ID生成器类

    设计原理：
    - 使用时间戳确保时间维度的唯一性
    - 使用机器ID区分不同服务器/进程
    - 使用序列号处理同一时间单位内的并发
    """

    _lock = threading.Lock()
    _last_timestamp = ""
    _sequence = 0

    _order_lock = threading.Lock()
    _last_order_timestamp = ""
    _order_sequence = 0

    # 从配置获取机器ID（00-99）
    _machine_id = settings.MACHINE_ID

    @classmethod
    def generate_user_id(cls) -> int:
        """
        生成用户ID
        格式: YYYYMMDDHHmmss(14位) + 机器ID(2位) + 序列号(1位) = 17位
        示例: 20260112143052015

        并发能力: 每秒每台服务器10个用户

        Returns:
            int: 17位用户ID
        """
        with cls._lock:
            now = datetime.now()
            timestamp = now.strftime('%Y%m%d%H%M%S')  # 14位

            if timestamp == cls._last_timestamp:
                cls._sequence += 1
                if cls._sequence > 9:
                    # 超过9则等待下一秒
                    import time
                    time.sleep(0.001)
                    return cls.generate_user_id()
            else:
                cls._last_timestamp = timestamp
                cls._sequence = 0

            # 机器ID(2位) + 序列号(1位)
            machine_id = f"{cls._machine_id:02d}"
            sequence = f"{cls._sequence:01d}"

            return int(f"{timestamp}{machine_id}{sequence}")

    @classmethod
    def generate_order_no(cls) -> str:
        """
        生成订单号
        格式: 10 + YYMMDDHHmmss(12位) + 毫秒(3位) + 机器ID(2位) + 序列号(2位) = 21位
        示例: 102601121430521230105

        并发能力: 每毫秒每台服务器100个订单

        Returns:
            str: 21位订单号
        """
        with cls._order_lock:
            now = datetime.now()
            timestamp = now.strftime('%y%m%d%H%M%S')  # 12位
            millisecond = now.microsecond // 1000  # 3位

            time_key = f"{timestamp}{millisecond:03d}"

            if time_key == cls._last_order_timestamp:
                cls._order_sequence += 1
                if cls._order_sequence > 99:
                    import time
                    time.sleep(0.001)
                    return cls.generate_order_no()
            else:
                cls._last_order_timestamp = time_key
                cls._order_sequence = 0

            machine_id = f"{cls._machine_id:02d}"
            sequence = f"{cls._order_sequence:02d}"

            return f"10{timestamp}{millisecond:03d}{machine_id}{sequence}"


# 便捷函数
def generate_user_id() -> int:
    """生成用户ID"""
    return IdGenerator.generate_user_id()


def generate_order_no() -> str:
    """生成订单号"""
    return IdGenerator.generate_order_no()
