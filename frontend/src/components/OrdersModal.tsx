import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMyOrders, Order } from '../api/userPurchase';

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrdersModal: React.FC<OrdersModalProps> = ({ isOpen, onClose }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getMyOrders(page, pageSize);
      setOrders(res.items);
      setTotal(res.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalPages = Math.ceil(total / pageSize);

  const getStatusBadge = (status: string) => {
    if (status === 'paid' || status === '已支付') {
      return <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">已支付</span>;
    }
    return <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{status}</span>;
  };

  const getTypeLabel = (type: string) => {
      const map: Record<string, string> = {
          'membership': '会员订单',
          'points': '充值订单',
          'membership_upgrade': '升级订单'
      };
      return map[type] || type;
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    // Always show first page
    pages.push(
      <button
        key={1}
        onClick={() => setPage(1)}
        className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-colors ${
          page === 1 ? 'bg-[#4C3BFF] text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        1
      </button>
    );

    let startPage = Math.max(2, page - 1);
    let endPage = Math.min(totalPages - 1, page + 1);

    if (startPage > 2) {
      pages.push(<span key="start-ellipsis" className="px-1 text-gray-400">...</span>);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setPage(i)}
          className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-colors ${
            page === i ? 'bg-[#4C3BFF] text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages - 1) {
      pages.push(<span key="end-ellipsis" className="px-1 text-gray-400">...</span>);
    }

    // Always show last page if > 1
    if (totalPages > 1) {
      pages.push(
        <button
          key={totalPages}
          onClick={() => setPage(totalPages)}
          className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-colors ${
            page === totalPages ? 'bg-[#4C3BFF] text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {totalPages}
        </button>
      );
    }

    // 用Fragment包装元素数组，避免React.Children.only错误
    return <>{pages}</>;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[900px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-center relative border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">我的订单</h2>
          <button 
            onClick={onClose} 
            className="absolute right-6 top-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tip */}
        <div className="px-8 py-4 bg-white">
            <div className="bg-[#F0F0FF] text-[#4C3BFF] px-4 py-2.5 rounded-lg text-sm text-center font-medium">
                如果对订单有疑问，请联系客服处理
            </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-8 pb-4">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50 uppercase sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium rounded-l-lg">订单类型</th>
                <th className="px-4 py-3 font-medium">订单号</th>
                <th className="px-4 py-3 font-medium">订单金额</th>
                <th className="px-4 py-3 font-medium">订单时间</th>
                <th className="px-4 py-3 font-medium rounded-r-lg">支付状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 font-medium text-gray-900">{getTypeLabel(order.type)}</td>
                  <td className="px-4 py-4 text-gray-500 font-mono">{order.order_no}</td>
                  <td className="px-4 py-4 text-gray-900 font-medium">¥{Number(order.amount).toFixed(2)}</td>
                  <td className="px-4 py-4 text-gray-500">{new Date(order.created_at).toLocaleString()}</td>
                  <td className="px-4 py-4">{getStatusBadge(order.status)}</td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                  <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">暂无订单</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
          <div className="text-sm text-gray-500">
            显示第 {total > 0 ? (page - 1) * pageSize + 1 : 0} 到 {Math.min(page * pageSize, total)} 条，共 {total} 条
          </div>
          <div className="flex items-center gap-2">
            <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {renderPagination()}
            </div>

            <button 
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersModal;
