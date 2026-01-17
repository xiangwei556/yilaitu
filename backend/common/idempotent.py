"""
幂等性检查工具
用于确保回调等操作的幂等性处理
"""
import asyncio
import hashlib
import json
from typing import Optional, Any
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class IdempotentChecker:
    """
    幂等性检查器
    基于Redis实现，用于防止重复处理

    使用示例:
        checker = IdempotentChecker(redis_client)

        # 检查是否已处理
        if await checker.is_processed("callback", order_no):
            return {"status": "already_processed"}

        # 标记为处理中
        if not await checker.mark_processing("callback", order_no):
            return {"status": "processing_by_other"}

        try:
            # 执行业务逻辑
            result = await process_order(order_no)

            # 标记为已完成
            await checker.mark_completed("callback", order_no, result)

        except Exception as e:
            # 处理失败，清除标记
            await checker.clear("callback", order_no)
            raise
    """

    def __init__(
        self,
        redis_client,
        prefix: str = "idempotent",
        processing_expire: int = 300,  # 处理中状态过期时间(秒)
        completed_expire: int = 86400 * 7  # 已完成状态保留时间(秒)，默认7天
    ):
        """
        初始化幂等性检查器

        Args:
            redis_client: Redis客户端实例
            prefix: 键前缀
            processing_expire: 处理中状态的过期时间(秒)
            completed_expire: 已完成状态的保留时间(秒)
        """
        self.redis = redis_client
        self.prefix = prefix
        self.processing_expire = processing_expire
        self.completed_expire = completed_expire

    def _get_key(self, business_type: str, business_id: str) -> str:
        """生成Redis键"""
        return f"{self.prefix}:{business_type}:{business_id}"

    async def is_processed(self, business_type: str, business_id: str) -> bool:
        """
        检查是否已处理完成

        Args:
            business_type: 业务类型，如 "deduct_callback", "sign_callback"
            business_id: 业务标识，如订单号

        Returns:
            bool: 是否已处理完成
        """
        key = self._get_key(business_type, business_id)
        try:
            value = await self.redis.get(key)
            if value:
                data = json.loads(value)
                return data.get("status") == "completed"
            return False
        except Exception as e:
            logger.error(f"[IdempotentChecker] 检查状态异常: {key}, error: {e}")
            return False

    async def is_processing(self, business_type: str, business_id: str) -> bool:
        """
        检查是否正在处理中

        Args:
            business_type: 业务类型
            business_id: 业务标识

        Returns:
            bool: 是否正在处理中
        """
        key = self._get_key(business_type, business_id)
        try:
            value = await self.redis.get(key)
            if value:
                data = json.loads(value)
                return data.get("status") == "processing"
            return False
        except Exception as e:
            logger.error(f"[IdempotentChecker] 检查处理状态异常: {key}, error: {e}")
            return False

    async def get_status(self, business_type: str, business_id: str) -> Optional[dict]:
        """
        获取处理状态详情

        Returns:
            dict or None: 状态信息，包含status, result, timestamp等
        """
        key = self._get_key(business_type, business_id)
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"[IdempotentChecker] 获取状态异常: {key}, error: {e}")
            return None

    async def mark_processing(self, business_type: str, business_id: str) -> bool:
        """
        标记为处理中
        使用NX保证原子性，只有第一个调用者能成功

        Args:
            business_type: 业务类型
            business_id: 业务标识

        Returns:
            bool: 是否成功标记（False表示已被其他实例处理）
        """
        key = self._get_key(business_type, business_id)
        import time
        data = json.dumps({
            "status": "processing",
            "timestamp": time.time()
        })

        try:
            result = await self.redis.set(
                key,
                data,
                nx=True,
                ex=self.processing_expire
            )
            if result:
                logger.debug(f"[IdempotentChecker] 标记处理中成功: {key}")
            return bool(result)
        except Exception as e:
            logger.error(f"[IdempotentChecker] 标记处理中异常: {key}, error: {e}")
            return False

    async def mark_completed(
        self,
        business_type: str,
        business_id: str,
        result: Any = None
    ) -> bool:
        """
        标记为已完成

        Args:
            business_type: 业务类型
            business_id: 业务标识
            result: 处理结果（可选）

        Returns:
            bool: 是否成功标记
        """
        key = self._get_key(business_type, business_id)
        import time
        data = json.dumps({
            "status": "completed",
            "result": result,
            "timestamp": time.time()
        })

        try:
            await self.redis.set(key, data, ex=self.completed_expire)
            logger.debug(f"[IdempotentChecker] 标记完成成功: {key}")
            return True
        except Exception as e:
            logger.error(f"[IdempotentChecker] 标记完成异常: {key}, error: {e}")
            return False

    async def mark_failed(
        self,
        business_type: str,
        business_id: str,
        error: str = None
    ) -> bool:
        """
        标记为失败（允许重试）

        Args:
            business_type: 业务类型
            business_id: 业务标识
            error: 错误信息

        Returns:
            bool: 是否成功标记
        """
        key = self._get_key(business_type, business_id)
        import time
        data = json.dumps({
            "status": "failed",
            "error": error,
            "timestamp": time.time()
        })

        try:
            # 失败状态保留较短时间，允许重试
            await self.redis.set(key, data, ex=60)
            logger.debug(f"[IdempotentChecker] 标记失败: {key}, error: {error}")
            return True
        except Exception as e:
            logger.error(f"[IdempotentChecker] 标记失败异常: {key}, error: {e}")
            return False

    async def clear(self, business_type: str, business_id: str) -> bool:
        """
        清除状态标记

        Args:
            business_type: 业务类型
            business_id: 业务标识

        Returns:
            bool: 是否成功清除
        """
        key = self._get_key(business_type, business_id)
        try:
            await self.redis.delete(key)
            logger.debug(f"[IdempotentChecker] 清除标记: {key}")
            return True
        except Exception as e:
            logger.error(f"[IdempotentChecker] 清除标记异常: {key}, error: {e}")
            return False


def generate_idempotent_key(*args) -> str:
    """
    根据参数生成幂等键
    用于生成唯一的业务标识

    Args:
        *args: 用于生成键的参数

    Returns:
        str: MD5哈希值
    """
    content = ":".join(str(arg) for arg in args)
    return hashlib.md5(content.encode()).hexdigest()


async def get_redis_client():
    """
    获取Redis客户端实例
    复用项目中已有的Redis连接
    """
    from backend.passport.app.db.redis import get_redis
    return await get_redis()
