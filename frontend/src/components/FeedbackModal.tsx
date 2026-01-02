import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { createFeedback, getFeedback } from '../api/feedback';

enum FeedbackType {
  BACKGROUND_MISMATCH = 1,
  PERSON_DEFORMATION = 2,
  CLOTHING_DISTORTION = 3,
  COLOR_DEVIATION = 4,
  DETAIL_BLUR = 5,
  OTHER_ISSUES = 6
}

const FEEDBACK_TYPE_OPTIONS = [
  { value: FeedbackType.BACKGROUND_MISMATCH, label: '背景不符' },
  { value: FeedbackType.PERSON_DEFORMATION, label: '人物变形' },
  { value: FeedbackType.CLOTHING_DISTORTION, label: '服装失真' },
  { value: FeedbackType.COLOR_DEVIATION, label: '色彩偏差' },
  { value: FeedbackType.DETAIL_BLUR, label: '细节模糊' },
  { value: FeedbackType.OTHER_ISSUES, label: '其他问题' }
];

interface FeedbackModalProps {
  onSubmit: (feedback: string, feedbackId: number) => void;
  buttonText?: string;
  buttonIcon?: string;
  buttonClassName?: string;
  modalClassName?: string;
  position?: 'left' | 'right' | 'center';
  iconType?: 'material-icons-outlined' | 'material-symbols-outlined';
  originalImageRecordId?: number;
  modelId?: number;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  onSubmit,
  buttonText = '反馈',
  buttonIcon = 'rate_review',
  buttonClassName = '',
  modalClassName = '',
  position = 'left',
  iconType = 'material-symbols-outlined',
  originalImageRecordId,
  modelId
}) => {
  const { user } = useAuthStore();
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedFeedbackTypes, setSelectedFeedbackTypes] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleFeedbackSubmit = async () => {
    if (selectedFeedbackTypes.length === 0 && !feedbackText) {
      return;
    }

    if (!user) {
      console.error('用户未登录');
      return;
    }

    setIsSubmitting(true);
    try {
      const feedbackTypeStr = selectedFeedbackTypes.join(',');
      
      const result = await createFeedback({
        user_id: parseInt(user.id),
        feedback_type: feedbackTypeStr,
        content: feedbackText,
        original_image_record_id: originalImageRecordId,
        model_id: modelId
      });

      onSubmit(feedbackText || '已提交反馈', result.id);

      setSelectedFeedbackTypes([]);
      setFeedbackText('');
      setIsOpen(false);
    } catch (error) {
      console.error('提交反馈失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFeedbackType = (value: number) => {
    setSelectedFeedbackTypes(prev =>
      prev.includes(value)
        ? prev.filter(t => t !== value)
        : [...prev, value]
    );
  };

  const getPositionClass = () => {
    switch (position) {
      case 'right':
        return 'right-0 origin-bottom-right';
      case 'center':
        return 'left-1/2 -translate-x-1/2 origin-bottom';
      case 'left':
      default:
        return 'left-0 origin-bottom-left';
    }
  };

  return (
    <div className="relative group" ref={modalRef}>
      <button 
        ref={buttonRef}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={`px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100/50 dark:bg-gray-800/50 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center space-x-1 transition-colors ${buttonClassName}`}
      >
        <span className={`${iconType} text-[18px]`}>{buttonIcon}</span>
        <span className="text-xs">{buttonText}</span>
      </button>
      <div 
        className={`absolute bottom-full mb-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-5 transition-all duration-300 z-[100] ${getPositionClass()} ${modalClassName} ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => !isInputFocused && setIsOpen(false)}
      >
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
          反馈图片效果不理想，审核确定后提供双倍积分补偿
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {FEEDBACK_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleFeedbackType(option.value)}
              className={`px-3 py-1.5 text-xs border rounded-full transition-colors ${
                selectedFeedbackTypes.includes(option.value)
                  ? 'border-primary text-primary bg-primary/5'
                  : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <input
            className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2.5 px-3 focus:ring-1 focus:ring-primary focus:border-primary placeholder-gray-400 outline-none"
            placeholder="请输入详细描述..."
            type="text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
          />
        </div>
        <button
          onClick={handleFeedbackSubmit}
          disabled={isSubmitting || (selectedFeedbackTypes.length === 0 && !feedbackText)}
          className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-full hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '提交中...' : '提交反馈'}
        </button>
      </div>
    </div>
  );
};

interface FeedbackInfo {
  feedback_type_name: string;
  content: string;
}

interface FeedbackInfoModalProps {
  feedbackId?: number;
}

export const FeedbackInfoModal: React.FC<FeedbackInfoModalProps> = ({ feedbackId }) => {
  const [feedbackInfo, setFeedbackInfo] = useState<FeedbackInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFeedBackLoaded, setHasFeedBackLoaded] = useState(false);

  useEffect(() => {
    setHasFeedBackLoaded(false);
    setFeedbackInfo(null);
  }, [feedbackId]);

  const fetchFeedbackInfo = async () => {
    if (!feedbackId || hasFeedBackLoaded) return;

    setLoading(true);
    try {
      const response = await getFeedback(feedbackId);
      const feedback = response.feedback;
      
      setFeedbackInfo({
        feedback_type_name: feedback.feedback_type_name || '',
        content: feedback.content || ''
      });
      setHasFeedBackLoaded(true);
    } catch (error) {
      console.error('Failed to fetch feedback info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    fetchFeedbackInfo();
  };

  const parseFeedbackTypes = (feedbackTypeName: string): string[] => {
    if (!feedbackTypeName) return [];
    return feedbackTypeName.split(',').map(t => t.trim()).filter(t => t);
  };

  const feedbackTypes = feedbackInfo ? parseFeedbackTypes(feedbackInfo.feedback_type_name) : [];

  return (
    <div className="relative group">
      <button 
        onMouseEnter={handleMouseEnter}
        className="flex flex-col items-center justify-center w-12 h-12 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-primary/70 dark:text-primary/70"
      >
        <span className="material-symbols-outlined text-[22px] fill-current">check_circle</span>
        <span className="text-[10px] font-medium leading-none mt-0.5">已反馈</span>
      </button>
      <div className="absolute bottom-full left-0 mb-3 w-[320px] bg-white dark:bg-gray-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 dark:border-gray-700 p-5 invisible opacity-0 translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-20 origin-bottom-left">
        <div className="flex items-center space-x-2 mb-3">
          <span className="material-symbols-outlined text-green-500 text-lg">task_alt</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">感谢您的反馈</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed tracking-wide border-b border-gray-100 dark:border-gray-700 pb-3">
          您提交的问题已收到，我们将尽快优化。
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : feedbackInfo ? (
          <>
            {feedbackTypes.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">已选问题</p>
                <div className="flex flex-wrap gap-2">
                  {feedbackTypes.map((type, index) => (
                    <span key={index} className="px-2 py-1 text-xs font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-md border border-red-100 dark:border-red-800/50">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">您的描述</p>
              <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                {feedbackInfo.content || '暂无描述'}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default FeedbackModal;
