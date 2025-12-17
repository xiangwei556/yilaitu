import React, { useState, useEffect } from 'react';
import { Modal, Spin, message } from 'antd';
import { WechatOutlined, AlipayCircleOutlined, ScanOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Check, Star } from 'lucide-react';
import request from '../utils/request';
import { useAuthStore } from '../stores/useAuthStore';

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
  
  const { openAuthModal, logout } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab as 'membership' | 'points');
      fetchPackages();
    }
  }, [isOpen, defaultTab]);

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
      
      if (defaultTab === 'membership' && membershipData.length > 0) {
        const proPackage = membershipData.find(p => p.name.includes('专业')) || membershipData[0];
        setSelectedPackageId(proPackage.id);
      } else if (defaultTab === 'points' && pointData.length > 0) {
        const recommendedPoint = pointData.find(p => p.points === 500) || pointData[0];
        setSelectedPackageId(recommendedPoint.id);
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

  const handleTabChange = (key: 'membership' | 'points') => {
    setActiveTab(key);
    if (key === 'membership') {
      const proPackage = membershipPackages.find(p => p.name.includes('专业')) || membershipPackages[0];
      setSelectedPackageId(proPackage?.id || null);
    } else {
      const recommendedPoint = pointPackages.find(p => p.points === 500) || pointPackages[0];
      setSelectedPackageId(recommendedPoint?.id || null);
    }
  };

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
        <h3 className="font-bold text-gray-900 mb-6">订单详情</h3>
        
        <div className="flex justify-between items-center mb-2 text-sm">
          <span className="text-gray-500">商品名称</span>
          <span className="text-gray-900 font-medium text-right">{name}</span>
        </div>
        <div className="flex justify-between items-center mb-1 border-b border-gray-100 pb-1">
          <span className="text-gray-500 text-sm">应付金额</span>
          <span className="text-[#4C3BFF] font-bold text-xl">¥{Number(price).toFixed(1)}</span>
        </div>

        <div className="mb-1 mt-0">
          <div className="text-sm font-bold text-gray-900 mb-1">选择支付方式</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('wechat')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all
                ${paymentMethod === 'wechat' 
                  ? 'border-[#07C160] text-[#07C160] bg-[#07C160]/5' 
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              <WechatOutlined className="text-lg" />
              <span className="text-sm font-medium">微信支付</span>
            </button>
            <button
              onClick={() => setPaymentMethod('alipay')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all
                ${paymentMethod === 'alipay' 
                  ? 'border-[#1677FF] text-[#1677FF] bg-[#1677FF]/5' 
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            >
              <AlipayCircleOutlined className="text-lg" />
              <span className="text-sm font-medium">支付宝</span>
            </button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center justify-center text-center border border-gray-100 border-dashed mt-auto">
            <div className="w-40 h-40 bg-white rounded-lg p-2 mb-4 shadow-sm border border-gray-100">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=ExamplePayment" 
                alt="Payment QR" 
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
              <ScanOutlined className={paymentMethod === 'wechat' ? 'text-[#07C160]' : 'text-[#1677FF]'} />
              <span>{paymentMethod === 'wechat' ? '打开微信扫码支付' : '打开支付宝扫码支付'}</span>
            </div>
            <div className="text-xs text-gray-400">
              支付即代表同意<a href="#" className="text-[#4C3BFF] hover:underline">《会员服务协议》</a>
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
      <div className="bg-[#F5F7FA] p-8 h-[750px] flex flex-col">
        {/* Top Region: Banner only */}
        <div className="mb-6">
          {/* 1. Rounded Top Banner */}
          <div className="bg-gradient-to-r from-[#4C3BFF] to-[#7B61FF] p-8 rounded-2xl text-white relative overflow-hidden shrink-0 shadow-lg shadow-blue-500/20">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium mb-4">
                <Star className="w-3 h-3 fill-current" />
                <span>会员权益全新升级</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">解锁专业版会员，释放无限创意</h2>
              <p className="opacity-80 text-base">获取更多算力积分，享受极速生成通道，支持企业级API接口调用。</p>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
          </div>
        </div>

        {/* Bottom Region: Split into left and right */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left Side: Tabs and Package Grid */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl overflow-hidden">
            {/* 2. Tabs - Moved to left side top */}
            <div className="p-5">
              <div className="bg-gray-100 p-1 rounded-full inline-flex shadow-sm">
                <button 
                  onClick={() => handleTabChange('membership')}
                  className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${
                    activeTab === 'membership' 
                    ? 'bg-[#4C3BFF] text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  开通月度会员
                </button>
                <button 
                  onClick={() => handleTabChange('points')}
                  className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${
                    activeTab === 'points' 
                    ? 'bg-[#4C3BFF] text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  购买积分包
                </button>
              </div>
            </div>
            
            {/* Package Grid - Takes up all available space in the middle */}
            <div className="flex-1 overflow-hidden">
              <Spin spinning={loading}>
                {/* Package Grid */}
                <div className="p-5 h-full overflow-y-auto custom-scrollbar">
                {activeTab === 'membership' ? (
                   <div className="grid grid-cols-3 gap-4">
                      {membershipPackages.map((pkg) => {
                         const isRecommended = pkg.name.includes('专业');
                         const isSelected = selectedPackageId === pkg.id;
                         const isEnterprise = pkg.name.includes('企业');
                          
                         return (
                           <div 
                             key={pkg.id}
                             onClick={() => setSelectedPackageId(pkg.id)}
                             className={`
                               relative rounded-2xl p-5 cursor-pointer transition-all flex flex-col bg-white
                               ${isSelected 
                                 ? 'border-2 border-[#4C3BFF] shadow-xl shadow-blue-500/10 z-10' 
                                 : 'border border-gray-200 hover:border-gray-300'}
                             `}
                           >
                             {isRecommended && (
                               <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4C3BFF] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                 最受欢迎
                               </div>
                             )}
                              
                             <div className="mb-3">
                               <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                             </div>

                             <div className="mb-4">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-3xl font-bold text-gray-900">¥{Number(pkg.price).toFixed(1)}</span>
                                  <span className="text-sm text-gray-500">/月</span>
                                </div>
                                {/* Gift Points - Dynamic Color and Value */}
                                {pkg.points !== undefined && pkg.points > 0 && (
                                  <div className={`mt-2 inline-block text-xs font-bold px-2 py-1 rounded ${getGiftPointsStyle(pkg.name)}`}>
                                     赠送 {pkg.points} 积分
                                  </div>
                                )}
                             </div>

                             <div className="space-y-2.5">
                               {/* Dynamic Rights from Backend */}
                               {pkg.rights ? (
                                 // Handle both string (with line breaks) and array formats
                                 (typeof pkg.rights === 'string' 
                                   ? pkg.rights.split(/\r?\n/).filter(item => item.trim())
                                   : Array.isArray(pkg.rights) ? pkg.rights : [])
                                   .map((rightItem, idx) => (
                                     <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                                        <div className="mt-0.5 rounded-full p-0.5 shrink-0 bg-green-500 text-white">
                                          <Check className="w-2 h-2" />
                                        </div>
                                        <span>{rightItem.trim()}</span>
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
                   /* Points Tab - 2x2 Grid */
                   <div className="grid grid-cols-2 gap-4">
                      {pointPackages.slice(0, 4).map((pkg) => { // Limit to 4 to ensure 2x2 layout if many
                         const isSelected = selectedPackageId === pkg.id;
                         const unitPrice = (Number(pkg.price) / Number(pkg.points)).toFixed(3);

                         return (
                           <div 
                             key={pkg.id}
                             onClick={() => setSelectedPackageId(pkg.id)}
                             className={`
                               relative rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center text-center justify-center
                               ${isSelected 
                                 ? 'border-2 border-[#4C3BFF] shadow-xl shadow-blue-500/10 bg-white z-10' 
                                 : 'border border-gray-200 hover:border-gray-300 bg-white'}
                             `}
                           >
                             <div className="text-base font-bold text-gray-900 mb-1">{pkg.points} 积分</div>
                             <div className="text-2xl font-bold text-gray-900 mb-1">¥{Number(pkg.price).toFixed(1)}</div>
                             {pkg.original_price && (
                               <div className="text-xs text-gray-400 line-through mb-2">¥{Number(pkg.original_price).toFixed(1)}</div>
                             )}
                               
                             <div className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                               ¥{unitPrice}/积分
                             </div>
                           </div>
                         );
                       })}
                   </div>
                )}
                </div>
              </Spin>
            </div>
            
            {/* 4. Footer Info - Fixed at bottom */}
            <div className="bg-blue-50 border-t border-blue-100 rounded-b-2xl p-3 flex items-start gap-2 text-xs text-blue-700">
              <InfoCircleOutlined className="mt-0.5 shrink-0" />
              <div>
                 <p>积分仅用于图片生成消耗，会员有效期内积分不清零。如需发票，请在购买后联系在线客服。</p>
              </div>
            </div>
          </div>

          {/* Right Side: Payment Sidebar (Fixed width) */}
          <div className="w-[320px] shrink-0">
             {((activeTab === 'membership' && membershipPackages.find(p => p.id === selectedPackageId)) || 
               (activeTab === 'points' && pointPackages.find(p => p.id === selectedPackageId))) 
               ? renderPaymentSidebar(
                   activeTab === 'membership' 
                     ? membershipPackages.find(p => p.id === selectedPackageId)?.name || '' 
                     : `${pointPackages.find(p => p.id === selectedPackageId)?.points} 积分包`,
                   activeTab === 'membership' 
                     ? membershipPackages.find(p => p.id === selectedPackageId)?.price || 0
                     : pointPackages.find(p => p.id === selectedPackageId)?.price || 0
                 )
               : <div className="h-full bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400">请选择套餐</div>
             }
          </div>
        </div>
      </div>
    </Modal>
  );
};
