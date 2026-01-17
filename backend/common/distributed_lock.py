"""
分布式锁实现
基于Redis实现的分布式锁，支持自动过期和可重入
"""
import asyncio
import uuid
import time
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class DistributedLock:
    """
    基于Redis的分布式锁

    使用示例:
        lock = DistributedLock(redis_client, "my_lock_key")
        if await lock.acquire():
            try:
                # 执行业务逻辑
                pass
            finally:
                await lock.release()

    或使用上下文管理器:
        async with DistributedLock(redis_client, "my_lock_key") as locked:
            if locked:
                # 执行业务逻辑
                pass
    """

    def __init__(
        self,
        redis_client,
        key: str,
        expire: int = 30,
        retry_times: int = 3,
        retry_delay: float = 0.1
    ):
        """
        初始化分布式锁

        Args:
            redis_client: Redis客户端实例
            key: 锁的键名
            expire: 锁的过期时间(秒)，默认30秒
            retry_times: 获取锁的重试次数，默认3次
            retry_delay: 重试间隔(秒)，默认0.1秒
        """
        self.redis = redis_client
        self.key = f"lock:{key}"
        self.expire = expire
        self.retry_times = retry_times
        self.retry_delay = retry_delay
        self.token = str(uuid.uuid4())
        self._locked = False

    async def acquire(self) -> bool:
        """
        尝试获取锁

        Returns:
            bool: 是否成功获取锁
        """
        for i in range(self.retry_times):
            try:
                # 使用SET NX EX原子操作
                result = await self.redis.set(
                    self.key,
                    self.token,
                    nx=True,
                    ex=self.expire
                )
                if result:
                    self._locked = True
                    logger.debug(f"[DistributedLock] 获取锁成功: {self.key}")
                    return True

                if i < self.retry_times - 1:
                    await asyncio.sleep(self.retry_delay)

            except Exception as e:
                logger.error(f"[DistributedLock] 获取锁异常: {self.key}, error: {e}")
                if i < self.retry_times - 1:
                    await asyncio.sleep(self.retry_delay)

        logger.warning(f"[DistributedLock] 获取锁失败: {self.key}")
        return False

    async def release(self) -> bool:
        """
        释放锁
        使用Lua脚本确保原子性，只有持有锁的客户端才能释放

        Returns:
            bool: 是否成功释放锁
        """
        if not self._locked:
            return True

        # Lua脚本：只有token匹配时才删除
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """

        try:
            result = await self.redis.eval(lua_script, 1, self.key, self.token)
            self._locked = False
            if result:
                logger.debug(f"[DistributedLock] 释放锁成功: {self.key}")
            else:
                logger.warning(f"[DistributedLock] 锁已被其他客户端持有或已过期: {self.key}")
            return bool(result)
        except Exception as e:
            logger.error(f"[DistributedLock] 释放锁异常: {self.key}, error: {e}")
            return False

    async def extend(self, additional_time: int = None) -> bool:
        """
        延长锁的过期时间

        Args:
            additional_time: 额外的过期时间(秒)，默认使用初始化时的expire值

        Returns:
            bool: 是否成功延长
        """
        if not self._locked:
            return False

        expire_time = additional_time or self.expire

        # Lua脚本：只有token匹配时才延长
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("expire", KEYS[1], ARGV[2])
        else
            return 0
        end
        """

        try:
            result = await self.redis.eval(
                lua_script, 1, self.key, self.token, expire_time
            )
            if result:
                logger.debug(f"[DistributedLock] 延长锁成功: {self.key}, expire: {expire_time}s")
            return bool(result)
        except Exception as e:
            logger.error(f"[DistributedLock] 延长锁异常: {self.key}, error: {e}")
            return False

    async def __aenter__(self):
        """异步上下文管理器入口"""
        self._locked = await self.acquire()
        return self._locked

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        if self._locked:
            await self.release()
        return False


class DistributedLockSync:
    """
    同步版本的分布式锁（用于非异步场景）
    """

    def __init__(
        self,
        redis_client,
        key: str,
        expire: int = 30,
        retry_times: int = 3,
        retry_delay: float = 0.1
    ):
        self.redis = redis_client
        self.key = f"lock:{key}"
        self.expire = expire
        self.retry_times = retry_times
        self.retry_delay = retry_delay
        self.token = str(uuid.uuid4())
        self._locked = False

    def acquire(self) -> bool:
        """尝试获取锁"""
        for i in range(self.retry_times):
            try:
                result = self.redis.set(
                    self.key,
                    self.token,
                    nx=True,
                    ex=self.expire
                )
                if result:
                    self._locked = True
                    return True

                if i < self.retry_times - 1:
                    time.sleep(self.retry_delay)

            except Exception as e:
                logger.error(f"[DistributedLockSync] 获取锁异常: {self.key}, error: {e}")
                if i < self.retry_times - 1:
                    time.sleep(self.retry_delay)

        return False

    def release(self) -> bool:
        """释放锁"""
        if not self._locked:
            return True

        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """

        try:
            result = self.redis.eval(lua_script, 1, self.key, self.token)
            self._locked = False
            return bool(result)
        except Exception as e:
            logger.error(f"[DistributedLockSync] 释放锁异常: {self.key}, error: {e}")
            return False

    def __enter__(self):
        self._locked = self.acquire()
        return self._locked

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._locked:
            self.release()
        return False
