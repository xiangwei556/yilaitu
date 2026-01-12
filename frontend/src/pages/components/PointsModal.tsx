import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMyPointsTransactions, PointsTransaction } from '../../api/userPurchase';

interface PointsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PointsModal: React.FC<PointsModalProps> = ({ isOpen, onClose }) => {
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen, page]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await getMyPointsTransactions(page, pageSize);
      setTransactions(res.items);
      setTotal(res.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalPages = Math.ceil(total / pageSize);

  const getTypeLabel = (type: string, sourceType: string) => {
      const map: Record<string, string> = {
          '1': '模特图生成',
          'order': '购买积分',
          'task': '任务奖励',
          'admin_adjust': '系统调整',
          'model_generation': '模特图生成',
          'background_generation': '白底图生成',
          'model_swap': '模特换装',
          'pose_split': '姿势裂变',
          'clothing_color_change': '服装换色',
          'image_expansion': '扩图',
          'change_background': '换背景',
          'universal_edit': '万能改图',
          'hd_upscale': '变清晰',
          'feedback_refund': '反馈返还积分'
      };
      return map[sourceType] || sourceType || type;
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
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

    return pages;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[900px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between relative border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">我的主页</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">积分明细</h3>
          
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50 uppercase sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium rounded-l-lg">消耗类型</th>
                <th className="px-4 py-3 font-medium">消耗数量</th>
                <th className="px-4 py-3 font-medium rounded-r-lg">消耗时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 font-medium text-gray-900">{getTypeLabel(tx.type, tx.source_type)}</td>
                  <td className={`px-4 py-4 font-medium ${tx.type === 'burn' ? 'text-red-500' : 'text-green-500'}`}>
                    {tx.type === 'earn' ? '+' : '-'}{Number(tx.amount)}
                  </td>
                  <td className="px-4 py-4 text-gray-500">{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && !loading && (
                  <tr>
                      <td colSpan={3} className="text-center py-12 text-gray-400">暂无积分记录</td>
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

export default PointsModal;
