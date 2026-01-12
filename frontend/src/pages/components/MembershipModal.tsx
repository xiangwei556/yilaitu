import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Modal, Spin, message } from 'antd';
import { AlipayCircleOutlined, ScanOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Check, Star } from 'lucide-react';
import QRCode from 'qrcode';
import request from '../../utils/request';
import { useAuthStore } from '../../stores/useAuthStore';
import { createPaymentOrder, getOrderStatus, type PaymentOrderResponse } from '../../api/payment';

// 常量配置
const CONSTANTS = {
  MAX_POLL_COUNT: 20,          // 最大轮询次数
  POLL_INTERVAL: 3000,         // 轮询间隔(ms)
  ORDER_CREATE_DELAY: 100,     // 创建订单延迟(ms)
  SUCCESS_CLOSE_DELAY: 1500,   // 支付成功后关闭延迟(ms)
  QR_CODE_SIZE: 200,           // 二维码尺寸
};

interface MembershipPackage {
  id: number;
  name: string;
  price: number;
  original_price: number;
  duration: number;
  description: string;
  rights: string[] | string; // Support both string and array
  points?: number; // Gift points
}

interface PointPackage {
  id: number;
  name: string;
  points: number;
  price: number;
  original_price: number;
  description: string;
}

interface MembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
}

// Helper to map rights codes to text if needed
const getRightLabel = (code: string) => {
  const map: Record<string, string> = {
    'basic_ai': '基础生成功能',
    'pro_ai': '标准高清出图',
    'batch_process': '批量任务处理',
    'all_access': '解锁全部功能',
    'api_access': '企业级 API 接口',
    'priority_pass': '优先生成通道',
    '1v1_support': '1v1 专属客户经理',
    'sla_guarantee': '极速生成通道 (SLA)'
  };
  return map[code] || code;
};

export const MembershipModal: React.FC<MembershipModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'membership'
}) => {
  const [activeTab, setActiveTab] = useState<'membership' | 'points'>('membership');
  const [membershipPackages, setMembershipPackages] = useState<MembershipPackage[]>([]);
  const [pointPackages, setPointPackages] = useState<PointPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [currentOrder, setCurrentOrder] = useState<PaymentOrderResponse | null>(null);
  const [orderStatus, setOrderStatus] = useState<'pending' | 'paid' | 'cancelled' | 'refunded'>('pending');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [qrCodeExpired, setQrCodeExpired] = useState(false);
  const [hasAttemptedOrder, setHasAttemptedOrder] = useState(false); // 记录是否曾尝试创建订单
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef<number>(0);
  const prevPaymentMethodRef = useRef<'wechat' | 'alipay'>(paymentMethod); // 记录上一次的支付方式

  const { openAuthModal, logout, refreshUserInfo } = useAuthStore();

  // 重置订单状态的工具函数
  const resetOrderState = useCallback((clearPoll = true) => {
    if (clearPoll && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setCurrentOrder(null);
    setQrCodeDataUrl('');
    setOrderStatus('pending');
    setQrCodeExpired(false);
    pollCountRef.current = 0;
  }, []);

  // 获取默认套餐ID的工具函数
  const getDefaultPackageId = useCallback((
    tab: 'membership' | 'points',
    memberships: MembershipPackage[],
    points: PointPackage[]
  ): number | null => {
    if (tab === 'membership' && memberships.length > 0) {
      return (memberships.find(p => p.name.includes('专业')) || memberships[0]).id;
    }
    if (tab === 'points' && points.length > 0) {
      return (points.find(p => p.points === 500) || points[0]).id;
    }
    return null;
  }, []);

  // 缓存选中的套餐信息
  const selectedPackage = useMemo(() => {
    if (activeTab === 'membership') {
      return membershipPackages.find(p => p.id === selectedPackageId);
    }
    return pointPackages.find(p => p.id === selectedPackageId);
  }, [activeTab, selectedPackageId, membershipPackages, pointPackages]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab as 'membership' | 'points');
      fetchPackages();
      // 重置订单状态
      resetOrderState();
      setHasAttemptedOrder(false);
      prevPaymentMethodRef.current = 'wechat';
    } else {
      // 关闭时清理轮询
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    // 清理函数
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, defaultTab]);

  // 监听支付方式变化，重新创建订单
  useEffect(() => {
    // 检查支付方式是否真正发生了变化
    if (prevPaymentMethodRef.current === paymentMethod) {
      return;
    }

    // 只有在弹窗打开、已选择套餐、且曾尝试创建过订单或已有订单时才重新创建
    if (isOpen && selectedPackageId && (currentOrder || hasAttemptedOrder)) {
      console.log(`支付方式从 ${prevPaymentMethodRef.current} 切换到 ${paymentMethod}，重新创建订单`);

      // 更新上一次支付方式
      prevPaymentMethodRef.current = paymentMethod;

      // 重置订单状态
      resetOrderState();

      // 创建新订单
      setTimeout(() => {
        createOrderForPackage(selectedPackageId);
      }, CONSTANTS.ORDER_CREATE_DELAY);
    } else {
      // 更新支付方式引用，即使没有创建订单
      prevPaymentMethodRef.current = paymentMethod;
    }
  }, [paymentMethod, isOpen, selectedPackageId]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const [memberships, points] = await Promise.all([
        request.get('/user-purchase/packages').catch(err => {
            if(err.response?.status === 401) throw err;
            return [];
        }),
        request.get('/user-purchase/point-packages').catch(err => {
            if(err.response?.status === 401) throw err;
            return [];
        })
      ]);

      const membershipData = memberships as MembershipPackage[];
      const pointData = points as PointPackage[];

      setMembershipPackages(membershipData);
      setPointPackages(pointData);

      // 默认选择套餐并自动创建订单
      const defaultPkgId = getDefaultPackageId(defaultTab as 'membership' | 'points', membershipData, pointData);
      if (defaultPkgId) {
        setSelectedPackageId(defaultPkgId);
      }

      // 重置订单状态
      resetOrderState(false);

      // 自动为默认选中的套餐创建订单
      if (defaultPkgId) {
        setTimeout(() => {
          createOrderForPackage(defaultPkgId, defaultTab as 'membership' | 'points');
        }, CONSTANTS.ORDER_CREATE_DELAY);
      }

    } catch (error: any) {
      console.error('Fetch packages error:', error);
      if (error.response?.status === 401 || error.message?.includes('401')) {
        onClose();
        logout();
        openAuthModal();
        message.warning('登录已过期，请重新登录');
      } else {
        message.error('获取套餐列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = useCallback((key: 'membership' | 'points') => {
    setActiveTab(key);
    const defaultPkgId = getDefaultPackageId(key, membershipPackages, pointPackages);
    setSelectedPackageId(defaultPkgId);

    // 切换标签时重置订单
    resetOrderState();
    setHasAttemptedOrder(false);

    // 自动为默认选中的套餐创建订单
    if (defaultPkgId) {
      setTimeout(() => {
        createOrderForPackage(defaultPkgId, key);
      }, CONSTANTS.ORDER_CREATE_DELAY);
    }
  }, [membershipPackages, pointPackages, getDefaultPackageId, resetOrderState]);

  /**
   * 选择会员套餐时创建订单
   */
  const handlePackageSelect = useCallback(async (packageId: number) => {
    const previousPackageId = selectedPackageId;
    setSelectedPackageId(packageId);

    // 如果选择的是不同的套餐，重置订单状态并创建新订单
    if (previousPackageId !== packageId) {
      resetOrderState();
    } else {
      // 如果选择的是同一个套餐且已有订单，不重新创建（支付方式变化会在另外的useEffect中处理）
      if (currentOrder && currentOrder.order_no) {
        return;
      }
    }

    // 创建订单
    await createOrderForPackage(packageId);
  }, [selectedPackageId, currentOrder, resetOrderState]);

  /**
   * 为选中的套餐创建订单
   * @param packageId 套餐ID
   * @param productType 商品类型（可选，不传则使用 activeTab 判断）
   */
  const createOrderForPackage = async (packageId: number, productType?: 'membership' | 'points') => {
    if (!packageId) {
      message.warning('请先选择套餐');
      return;
    }

    setIsCreatingOrder(true);
    setQrCodeExpired(false);
    pollCountRef.current = 0;
    setHasAttemptedOrder(true); // 标记已尝试创建订单
    try {
      // 使用传入的 productType，或根据 activeTab 判断
      const finalProductType = productType || (activeTab === 'membership' ? 'membership' : 'points');

      const selectedPaymentMethod = paymentMethod;

      const orderData = await createPaymentOrder({
        product_type: finalProductType,
        product_id: packageId,
        payment_method: selectedPaymentMethod,
        is_upgrade: false
      });

      setCurrentOrder(orderData);
      setOrderStatus('pending');

      // 生成二维码
      if (orderData.qr_code_url) {
        try {
          const qrCodeUrl = await QRCode.toDataURL(orderData.qr_code_url, {
            width: CONSTANTS.QR_CODE_SIZE,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeDataUrl(qrCodeUrl);
        } catch (error) {
          console.error('生成二维码失败:', error);
          message.error('生成二维码失败，请刷新重试');
        }
      } else {
        message.warning('未获取到支付二维码，请重试');
      }

      // 开始轮询订单状态
      startOrderStatusPolling(orderData.order_no);

      //message.success('订单创建成功，请扫码支付');
    } catch (error: any) {
      console.error('创建订单失败:', error);
      const errorMsg = error?.response?.data?.msg || error?.response?.data?.detail || error?.message || '创建订单失败，请重试';
      message.error(errorMsg);
      setCurrentOrder(null);
      setQrCodeDataUrl('');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  /**
   * 开始轮询订单状态
   */
  const startOrderStatusPolling = (orderNo: string) => {
    // 清除之前的轮询
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // 重置轮询计数
    pollCountRef.current = 0;

    // 每3秒查询一次订单状态
    pollIntervalRef.current = setInterval(async () => {
      // 增加轮询计数
      pollCountRef.current += 1;
      console.log(`轮询订单状态第 ${pollCountRef.current} 次，订单号: ${orderNo}`);

      // 检查是否达到最大轮询次数
      if (pollCountRef.current >= CONSTANTS.MAX_POLL_COUNT) {
        console.log(`轮询达到最大次数 ${CONSTANTS.MAX_POLL_COUNT}，停止轮询并显示二维码过期`);
        // 停止轮询
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        // 设置二维码过期状态
        setQrCodeExpired(true);
        return;
      }

      try {
        const statusData = await getOrderStatus(orderNo);
        setOrderStatus(statusData.status);

        if (statusData.status === 'paid') {
          // 支付成功
          message.success('支付成功！');
          setOrderStatus('paid');

          // 停止轮询
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          // 延迟关闭弹窗，让用户看到成功提示
          setTimeout(async () => {
            onClose();
            // 刷新用户信息而不是整个页面
            await refreshUserInfo();
          }, CONSTANTS.SUCCESS_CLOSE_DELAY);
        } else if (statusData.status === 'cancelled') {
          // 订单已取消
          message.warning('订单已取消');
          setOrderStatus('cancelled');

          // 停止轮询
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          // 设置二维码过期状态
          setQrCodeExpired(true);
        }
      } catch (error) {
        console.error('查询订单状态失败:', error);
        // 查询失败不中断轮询，继续尝试
      }
    }, CONSTANTS.POLL_INTERVAL);
  };

  /**
   * 刷新二维码（不创建新订单，只重新生成二维码）
   */
  const handleRefreshQRCode = useCallback(() => {
    if (selectedPackageId) {
      setQrCodeExpired(false);
      pollCountRef.current = 0;
      createOrderForPackage(selectedPackageId);
    }
  }, [selectedPackageId]);

  // Helper to determine gift points color
  const getGiftPointsStyle = (pkgName: string) => {
    if (pkgName.includes('企业')) {
      return 'bg-amber-50 text-amber-600'; // Yellow/Gold
    } else if (pkgName.includes('专业')) {
      return 'bg-blue-50 text-[#4C3BFF]'; // Blue (Professional)
    }
    return 'bg-gray-50 text-gray-600'; // Gray (Ordinary)
  };

  const renderPaymentSidebar = (name: string, price: number) => {
    return (
      <div className="sticky top-6 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        {/* 顶部区域 - 灰色背景 */}
        <div className="p-6 bg-gray-50/50 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900 mb-4">订单详情</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">商品名称</span>
            <span className="text-sm font-medium text-gray-900">{name}</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-600">应付金额</span>
            <span className="text-xl font-black text-[#3713EC]">¥{Number(price).toFixed(1)}</span>
          </div>
        </div>

        {/* 下部区域 - 白色背景 */}
        <div className="p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3">选择支付方式</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* 微信支付按钮 */}
            <button
              onClick={() => {
                if (paymentMethod !== 'wechat') {
                  setPaymentMethod('wechat');
                }
              }}
              className={`relative group flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all cursor-pointer ${
                paymentMethod === 'wechat'
                  ? 'border-2 border-[#07C160] bg-[#07C160]/5'
                  : 'border border-gray-200 bg-white hover:border-[#07C160] hover:bg-[#07C160]/5'
              }`}
            >
              <div className="flex items-center">
                <img src="/wechat.png" alt="微信支付" className="w-5 h-5 mr-1.5" />
                <span className="text-sm font-bold text-gray-800">微信支付</span>
              </div>
              {paymentMethod === 'wechat' && (
                <div className="absolute -bottom-[1px] -right-[1px] bg-[#07C160] text-white rounded-tl-lg rounded-br-xl p-0.5 shadow-sm">
                  <Check className="w-2.5 h-2.5" />
                </div>
              )}
            </button>

            {/* 支付宝按钮 */}
            <button
              onClick={() => {
                if (paymentMethod !== 'alipay') {
                  setPaymentMethod('alipay');
                }
              }}
              className={`relative group flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all cursor-pointer ${
                paymentMethod === 'alipay'
                  ? 'border-2 border-[#1677FF] bg-[#1677FF]/5'
                  : 'border border-gray-200 bg-white hover:border-[#1677FF] hover:bg-[#1677FF]/5'
              }`}
            >
              <div className="flex items-center">
                <AlipayCircleOutlined className="text-[#1677FF] mr-1.5 text-lg" />
                <span className={`text-sm font-medium ${paymentMethod === 'alipay' ? 'font-bold text-gray-800' : 'text-gray-600 group-hover:text-gray-800'}`}>支付宝</span>
              </div>
              {paymentMethod === 'alipay' && (
                <div className="absolute -bottom-[1px] -right-[1px] bg-[#1677FF] text-white rounded-tl-lg rounded-br-xl p-0.5 shadow-sm">
                  <Check className="w-2.5 h-2.5" />
                </div>
              )}
            </button>
          </div>

          {/* 支付二维码区域 */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            {isCreatingOrder ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Spin size="large" />
                <div className="mt-4 text-sm text-gray-600">正在创建订单...</div>
              </div>
            ) : qrCodeDataUrl ? (
              <>
                <div className="relative w-40 h-40 bg-gray-100 rounded-xl p-2 mb-3 group overflow-hidden">
                  <img
                    src={qrCodeDataUrl}
                    alt="Payment QR Code"
                    className="w-full h-full object-cover rounded-lg mix-blend-multiply opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                  {/* 扫描动画线 */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#07C160]/50 shadow-[0_0_10px_rgba(7,193,96,0.5)] animate-[scan_2s_ease-in-out_infinite]"></div>

                  {qrCodeExpired && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-[2px] rounded-lg">
                      <p className="text-base font-bold text-gray-900 mb-4">二维码已过期</p>
                      <button
                        onClick={handleRefreshQRCode}
                        className="bg-[#3713EC] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-opacity-90 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3713EC]"
                      >
                        刷新二维码
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center text-sm font-bold text-gray-800">
                  <ScanOutlined className={`mr-2 ${paymentMethod === 'wechat' ? 'text-[#07C160]' : 'text-[#1677FF]'}`} />
                  打开{paymentMethod === 'wechat' ? '微信' : '支付宝'}扫码支付
                </div>

                {orderStatus === 'paid' && (
                  <div className="text-xs text-green-600 mt-2 font-medium">
                    ✓ 支付成功
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-2">
                  支付即代表同意 <a href="#" className="text-[#3713EC] hover:underline">《会员服务协议》</a>
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <ScanOutlined className="text-4xl mb-3 opacity-50" />
                <div className="text-sm">选择套餐后将自动生成支付二维码</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={1200}
      centered
      className="membership-modal"
      styles={{
        body: { padding: 0, overflow: 'hidden' },
        mask: { backgroundColor: 'rgba(0, 0, 0, 0.6)' }
      }}
    >
      <div className="bg-[#F3F4F8] p-6">
        {/* 顶部 Banner */}
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-[#3713EC] via-[#5B37EB] to-[#7B5AFF] p-8 text-white shadow-xl shadow-[#3713EC]/20 relative overflow-hidden">
          {/* 装饰性圆圈 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 opacity-20 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2"></div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-xs font-bold mb-4">
              <Star className="w-3 h-3 mr-1 fill-current" />
              会员权益全新升级
            </div>
            <h2 className="text-3xl font-black tracking-tight mb-4">解锁专业版会员，释放无限创意</h2>
            <p className="text-blue-100 text-lg max-w-xl">获取更多算力积分，享受极速生成通道，支持企业级API接口调用。</p>
          </div>
        </div>

        {/* 主内容区：左右布局 */}
        <div className="flex flex-col xl:flex-row gap-8 items-start">
          {/* 左侧：Tab + 套餐列表 */}
          <div className="flex-1 w-full space-y-6">
            {/* Tab 切换 */}
            <div className="w-full">
              <div className="flex w-full bg-white p-1.5 rounded-full shadow-sm border border-gray-200">
                <button
                  onClick={() => handleTabChange('membership')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
                    activeTab === 'membership'
                      ? 'bg-[#3713EC] text-white font-bold shadow-md'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  开通月度会员
                </button>
                <button
                  onClick={() => handleTabChange('points')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
                    activeTab === 'points'
                      ? 'bg-[#3713EC] text-white font-bold shadow-md'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  购买积分包
                </button>
              </div>
            </div>

            {/* 套餐卡片网格 */}
            <Spin spinning={loading}>
              {activeTab === 'membership' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 min-h-[408px]">
                  {membershipPackages.map((pkg) => {
                    const isRecommended = pkg.name.includes('专业');
                    const isSelected = selectedPackageId === pkg.id;

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => handlePackageSelect(pkg.id)}
                        className={`
                          group relative rounded-2xl p-6 cursor-pointer transition-all flex flex-col
                          ${isSelected
                            ? 'bg-[#3713EC]/5 ring-2 ring-[#3713EC] shadow-xl shadow-[#3713EC]/10'
                            : 'bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-lg'}
                        `}
                      >
                        {isRecommended && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3713EC] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            最受欢迎
                          </div>
                        )}

                        <div className="mb-3">
                          <h3 className={`text-lg font-bold ${isSelected ? 'text-[#3713EC]' : 'text-gray-700'}`}>{pkg.name}</h3>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-gray-900">¥{Number(pkg.price).toFixed(1)}</span>
                            <span className="text-sm text-gray-500">/月</span>
                          </div>
                          {pkg.points !== undefined && pkg.points > 0 && (
                            <div className={`mt-2 inline-block text-xs font-bold px-2 py-1 rounded ${getGiftPointsStyle(pkg.name)}`}>
                              赠送 {pkg.points} 积分
                            </div>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {pkg.rights ? (
                            (typeof pkg.rights === 'string'
                              ? pkg.rights.split(/\r?\n/).filter(item => item.trim())
                              : Array.isArray(pkg.rights) ? pkg.rights : [])
                              .map((rightItem, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                                  <div className="mt-0.5 rounded-full p-0.5 shrink-0 bg-green-500 text-white">
                                    <Check className="w-2 h-2" />
                                  </div>
                                  <span>{typeof rightItem === 'string' ? rightItem.trim() : rightItem}</span>
                                </div>
                              ))
                          ) : (
                            <div className="text-xs text-gray-400">暂无权益描述</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-h-[408px]">
                  {pointPackages.slice(0, 4).map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id;
                    const unitPrice = (Number(pkg.price) / Number(pkg.points)).toFixed(3);
                    const isRecommended = pkg.points === 500;

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => handlePackageSelect(pkg.id)}
                        className={`
                          group relative rounded-2xl p-6 cursor-pointer transition-all flex flex-col items-center justify-center text-center h-48
                          ${isSelected
                            ? 'bg-[#3713EC]/5 ring-2 ring-[#3713EC] shadow-xl shadow-[#3713EC]/10'
                            : 'bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-lg'}
                        `}
                      >
                        {isRecommended && (
                          <div className="absolute -top-3 right-6 bg-[#3713EC] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            推荐
                          </div>
                        )}
                        <h3 className={`text-lg font-bold mb-2 ${isSelected ? 'text-[#3713EC]' : 'text-gray-700'}`}>
                          {pkg.points} 积分
                        </h3>
                        <div className="mb-1">
                          <span className="text-3xl font-black text-gray-900">¥{Number(pkg.price).toFixed(1)}</span>
                        </div>
                        {pkg.original_price && (
                          <div className="text-xs text-gray-400 line-through mb-4">¥{Number(pkg.original_price).toFixed(1)}</div>
                        )}
                        <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                          isSelected
                            ? 'bg-[#3713EC]/10 text-[#3713EC] font-bold'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          ¥{unitPrice}/积分
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Spin>

            {/* 底部提示信息 */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-800 border border-blue-100">
              <InfoCircleOutlined className="text-lg mt-0.5" />
              <p>积分有效期为永久有效，不清零。购买后立即到账。如需发票，请在购买后联系在线客服。</p>
            </div>
          </div>

          {/* 右侧：支付侧边栏 */}
          <div className="xl:w-96 w-full flex-shrink-0">
            {selectedPackage
              ? renderPaymentSidebar(
                  activeTab === 'membership'
                    ? (selectedPackage as MembershipPackage).name
                    : `${(selectedPackage as PointPackage).points} 积分包`,
                  selectedPackage.price
                )
              : <div className="h-full bg-white rounded-3xl border border-gray-100 flex items-center justify-center text-gray-400 text-sm p-12">请选择套餐</div>
            }
          </div>
        </div>
      </div>

      {/* 扫描动画样式 */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 5%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 95%; opacity: 0; }
        }
      `}</style>
    </Modal>
  );
};
