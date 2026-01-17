import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { message } from 'antd';

export default function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modeText, setModeText] = useState("局部重绘");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const imageUrl = ev.target?.result as string;
        navigate('/magic-edit', { state: { initialImage: imageUrl } });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center bg-background-light dark:bg-background-dark py-4 px-6 md:px-12 overflow-y-auto scrollbar-thin-1px">
      <div className="w-full max-w-[1280px] flex flex-col items-center animate-fade-in">
        <div className="w-full flex flex-col items-center">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <span className="material-symbols-outlined text-primary text-4xl">magic_button</span>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">万能改图</h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-lg text-base">
              上传图片通过语言指令或涂抹，轻松修改服装产品图
            </p>
          </div>
          <div className="w-full mb-8">
            <div className="bg-white dark:bg-gray-900 p-5 rounded-[2rem] shadow-soft border border-gray-100 dark:border-gray-800 flex flex-col gap-5 transition-all duration-300">
              <div className="w-full relative bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent focus-within:border-primary/30 focus-within:bg-white dark:focus-within:bg-gray-900 transition-all duration-300">
                <div className="flex items-start min-h-[64px] py-4 px-6">
                  <span className="text-primary font-bold text-sm mt-[3px] mr-3 shrink-0 select-none">{modeText}</span>
                  <textarea
                    className="w-full bg-transparent border-none focus:ring-0 resize-none h-full p-0 text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 leading-relaxed scrollbar-thin-1px outline-none"
                    placeholder="描述你想要修改的内容，例如：将背景换成北欧简约客厅，给模特换一件白色长袖衬衫..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1 pb-1">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 h-11 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 border-none outline-none">
                    <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                    <span>添加图片</span>
                  </button>
                  <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-full flex items-center w-full sm:w-[260px] h-11 relative">
                    <button onClick={() => setModeText("指令改图")} className={`flex-1 h-full flex items-center justify-center text-sm font-medium rounded-full transition-all relative z-10 ${modeText === '指令改图' ? 'text-primary bg-white dark:bg-gray-700 shadow-sm font-bold ring-1 ring-black/5 dark:ring-white/5' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                      指令改图
                    </button>
                    <button onClick={() => setModeText("局部重绘")} className={`flex-1 h-full flex items-center justify-center text-sm font-medium rounded-full transition-all relative z-10 ${modeText === '局部重绘' ? 'text-primary bg-white dark:bg-gray-700 shadow-sm font-bold ring-1 ring-black/5 dark:ring-white/5' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                      局部重绘
                    </button>
                  </div>
                </div>
                <div className="flex items-center w-full sm:w-auto">
                  <button onClick={() => message.success('请先上传图片！')} className="w-full sm:w-auto px-10 h-11 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2">
                    <span className="font-bold text-sm">立即生成</span>
                    <div className="flex items-center bg-white/20 rounded-full px-1.5 py-0.5">
                      <span className="text-[10px] font-bold mr-0.5">4</span>
                      <img src="/yidou.svg" alt="icon" className="w-3 h-3" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full flex items-center justify-between px-2 py-2 bg-transparent border-none mb-6">
          <div className="flex items-center shrink-0 mr-3">
            <span className="material-symbols-outlined text-primary text-[22px]">campaign</span>
          </div>
          <div className="flex-1 overflow-hidden h-6 relative">
            <div className="animate-vertical-scroll flex flex-col">
              <div className="h-6 flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">系统更新：</span>
                <span className="text-sm text-gray-800 dark:text-gray-200 truncate">万能改图功能现已支持多种光影效果智能调节，创作更真实。</span>
              </div>
              <div className="h-6 flex items-center gap-2">
                <span className="text-sm font-medium text-primary">热门：</span>
                <span className="text-sm text-gray-800 dark:text-gray-200 truncate">"服装图一键上身"模型更新，对大码服装适配度提升 40%。</span>
              </div>
            </div>
          </div>
          <a className="flex items-center gap-0.5 text-xs font-medium text-gray-400 hover:text-primary transition-colors ml-4 shrink-0" href="#">
            更多
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </a>
        </div>
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-primary rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-primary/20 overflow-hidden relative group transition-all duration-300">
            <div className="absolute right-0 top-0 w-32 h-full bg-white/10 -skew-x-12 translate-x-8 pointer-events-none group-hover:translate-x-4 transition-transform duration-500" />
            <div className="flex items-center space-x-4 relative z-10 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-xl">diamond</span>
              </div>
              <h3 className="text-white text-base font-bold truncate">开通会员，解锁无限生产力</h3>
            </div>
            <button className="px-5 py-2 bg-white text-primary text-xs font-bold rounded-full hover:bg-gray-100 transition-all active:scale-95 shrink-0 relative z-10 ml-4">
              立即升级
            </button>
          </div>
          <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF9F1C] rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-orange-500/20 overflow-hidden relative group transition-all duration-300">
            <div className="absolute right-0 top-0 w-32 h-full bg-white/10 -skew-x-12 translate-x-8 pointer-events-none group-hover:translate-x-4 transition-transform duration-500" />
            <div className="flex items-center space-x-4 relative z-10 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-xl">card_giftcard</span>
              </div>
              <h3 className="text-white text-base font-bold truncate">邀请好友，享高额返现</h3>
            </div>
            <button className="px-5 py-2 bg-white text-[#FF6B35] text-xs font-bold rounded-full hover:bg-gray-100 transition-all active:scale-95 shrink-0 relative z-10 ml-4">
              立即邀请
            </button>
          </div>
        </div>
        <div className="w-full pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
              <span className="material-symbols-outlined text-primary mr-2">trending_up</span>
              热门功能
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/model-gen" className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 group hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
              <div className="aspect-video bg-gray-200 overflow-hidden shrink-0">
                <img
                  alt="服装图一键上身"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5GHdPxHHLczP7B7qwWgHC9PaW6VXWx5wQHF2jvcYn4biRfCvT-TOnsUWl4AnmNR4j-OWLXUw2BS_45PZa4hXmZbgzp6GzXJRdfFyr2qB3b9fStckpOUaHNb5WPoLxm3zUEUD3EQDGP3xZxnO8YMLpxZ_zgvFMmyKu_N2yKaJ8Yu3KTPTN4jsOEBEZyLmNqF840SEBVG5AUS78ez-p_Crv0aJJL7mp_8iLKGqlPB1UjnGmcVdqbGHlyw4faAAiRgQPp0_VCKlJ73S8"
                />
              </div>
              <div className="p-5 flex items-center justify-between">
                <h4 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-primary transition-colors">服装图一键上身</h4>
                <div className="w-8 h-8 rounded-full bg-[#F3F4F6] dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/30 transform group-hover:scale-110 transition-all duration-300">
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </div>
              </div>
            </Link>
            <Link to="/change-bg" className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 group hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
              <div className="aspect-video bg-gray-200 overflow-hidden shrink-0">
                <img
                  alt="模特背景随心换"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJy91HtTLJE5FsrRE4mm1-PhbWnf9BqXNWSBRKNiNSr43xWE5hv3JhUWVheIuDV2wf6LB9n1l7BigMcDCwZzCdMuQ5gkS87Hgaxis3WXMuMj_iCr6EnNtpmXbNzLQKlgr6zzKpQK3V0YzJkkU6EOMjipLbTeWS9-IpzMVZwEJbueKOgM9cA8EGmEdLpELio3S_LikQnC0TpLPoOUU5VMZ48iU4AC0WEPPO3i2Ho8hLYHZvME-zXI-ael34x5OkZ_7reXUDNZyIcG_G"
                />
              </div>
              <div className="p-5 flex items-center justify-between">
                <h4 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-primary transition-colors">模特背景随心换</h4>
                <div className="w-8 h-8 rounded-full bg-[#F3F4F6] dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/30 transform group-hover:scale-110 transition-all duration-300">
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </div>
              </div>
            </Link>
            <Link to="/magic-edit" className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 group hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
              <div className="aspect-video bg-gray-200 overflow-hidden shrink-0">
                <img
                  alt="图片秒变视频"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD56jLqjx7N4qRTrMXiw60X9gUbXwPx42co3Orvz_WlZ47NFvKj37T52hIbrhij_wek2ns0O1V7iMBx9aSeMqRxyiObypFuWU1OdQtvM4KhV79POsSLoM9KcScmdFIpNa71UCW4idcIt3XR1RwiOuOeNui9Wybh7lTc94vokNbVIuXz_LqPemMwRCDTPmymN__iDw8g1ukgiMpfp4b-QY1-Git5-M6IEuZPAbMXQkEnMlnGAVnBb17uTeI08FlbSKBAvDcP-c_P5kVm"
                />
              </div>
              <div className="p-5 flex items-center justify-between">
                <h4 className="font-bold text-base text-gray-900 dark:text-white group-hover:text-primary transition-colors">图片秒变视频</h4>
                <div className="w-8 h-8 rounded-full bg-[#F3F4F6] dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/30 transform group-hover:scale-110 transition-all duration-300">
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
        <div className="w-full pt-6 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
            <div className="relative group aspect-square flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary/40 hover:shadow-soft transition-all cursor-pointer">
              <div className="w-[30%] max-w-[64px] aspect-square rounded-full bg-primary/5 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <span className="material-symbols-outlined text-[min(10vw,48px)]">support_agent</span>
              </div>
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors text-center">企业微信</span>
              <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 border border-primary/20 p-4 shadow-xl pointer-events-none group-hover:pointer-events-auto">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-2 overflow-hidden border border-gray-200">
                  <span className="material-symbols-outlined text-4xl text-gray-300">qr_code_2</span>
                </div>
                <span className="text-[10px] text-gray-500 font-medium">扫码咨询客服</span>
              </div>
            </div>
            <div className="relative group aspect-square flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary/40 hover:shadow-soft transition-all cursor-pointer">
              <div className="w-[30%] max-w-[64px] aspect-square rounded-full bg-primary/5 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <span className="material-symbols-outlined text-[min(10vw,48px)]">qr_code_2</span>
              </div>
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors text-center">小程序入口</span>
              <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 border border-primary/20 p-4 shadow-xl pointer-events-none group-hover:pointer-events-auto">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-2 overflow-hidden border border-gray-200">
                  <span className="material-symbols-outlined text-4xl text-gray-300">widgets</span>
                </div>
                <span className="text-[10px] text-gray-500 font-medium">扫码进入小程序</span>
              </div>
            </div>
            <a className="aspect-square flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary/40 hover:shadow-soft transition-all group" href="#">
              <div className="w-[30%] max-w-[64px] aspect-square rounded-full bg-primary/5 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <span className="material-symbols-outlined text-[min(10vw,48px)]">menu_book</span>
              </div>
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors text-center">帮助教程</span>
            </a>
            <a className="aspect-square flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary/40 hover:shadow-soft transition-all group" href="#">
              <div className="w-[30%] max-w-[64px] aspect-square rounded-full bg-primary/5 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <span className="material-symbols-outlined text-[min(10vw,48px)]">rate_review</span>
              </div>
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors text-center">需求建议</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
