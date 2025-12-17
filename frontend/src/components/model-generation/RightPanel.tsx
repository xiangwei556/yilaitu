import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export const RightPanel: React.FC = () => {
  return (
    <div className="flex-1 min-w-[360px] h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
      <div className="max-w-[500px] mx-auto space-y-6 pb-6">
        <h2 className="text-lg font-bold text-gray-800 text-center mb-6">实拍图示例</h2>

        {/* Correct Examples */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4 text-[#56C271] font-medium">
            <CheckCircle2 className="w-5 h-5" />
            <span>正确示例</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src={`https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=fashion%20model%20professional%20photo%20clean%20background%20full%20body%20shot%20pose%20${i}&image_size=portrait_4_3`}
                  alt="Correct example"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Incorrect Examples */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4 text-[#FF5A5A] font-medium">
            <XCircle className="w-5 h-5" />
            <span>错误示例</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src={`https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=bad%20quality%20blurry%20fashion%20photo%20bad%20lighting%20amateur%20${i}&image_size=portrait_4_3`}
                  alt="Incorrect example"
                  className="w-full h-full object-cover opacity-80"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-[#FFF6E6] rounded-xl p-5 border border-[#FFE0B2]">
          <div className="flex items-center gap-2 mb-3 text-[#FFA62B] font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>温馨提示</span>
          </div>
          <ol className="list-decimal list-outside ml-4 space-y-2 text-xs text-gray-600 leading-relaxed">
            <li>请上传清晰的模特照片，构图居中，平整、干净，光线良好</li>
            <li>图片中只可展示单件服装，不可叠加其他服装一起拍摄</li>
            <li>服装在图片中的占比尽可能大</li>
            <li>建议选择和上传的服饰同品类商品的模特参考图</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
