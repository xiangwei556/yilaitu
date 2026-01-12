"""
支付服务基类 - 定义统一的支付接口
"""
from abc import ABC, abstractmethod
from typing import Dict, Optional
from decimal import Decimal

class PaymentService(ABC):
    """支付服务抽象基类"""
    
    @abstractmethod
    async def create_order(
        self,
        order_no: str,
        amount: Decimal,
        description: str,
        notify_url: str
    ) -> Dict:
        """
        创建支付订单
        
        Args:
            order_no: 订单号
            amount: 金额
            description: 商品描述
            notify_url: 回调地址
            
        Returns:
            包含支付二维码URL等信息的字典
        """
        pass
    
    @abstractmethod
    async def query_order(self, order_no: str) -> Dict:
        """
        查询订单状态

        Args:
            order_no: 商户订单号

        Returns:
            订单状态信息
        """
        pass
    
    @abstractmethod
    async def verify_callback(self, data: Dict) -> bool:
        """
        验证回调签名
        
        Args:
            data: 回调数据
            
        Returns:
            验证是否通过
        """
        pass
    
    @abstractmethod
    async def process_callback(self, data: Dict) -> Dict:
        """
        处理支付回调
        
        Args:
            data: 回调数据
            
        Returns:
            处理结果，包含订单号和支付状态
        """
        pass