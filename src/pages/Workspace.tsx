import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  Globe, Server, Box, Send, Plane, Truck, Search, Megaphone, Badge, 
  FileText, FileSignature, Tags, Calculator, Ruler, Receipt, MapPin, 
  Languages, StickyNote, Package, ShoppingCart, Store, Landmark, Book, Ship, Anchor,
  Layers, Star, TrendingUp, Clock, Plus
} from 'lucide-react';

const DEFAULT_APPS = [
  // 1. 公司内部
  { id: 101, name: "集运巴巴官网", url: "https://hxmak.com", cat: "internal", icon: Globe, color: "#ea580c", desc: "集运巴巴官方网站", isExternal: true },
  { id: 102, name: "集运系统", url: "https://zhuanyun.sllowly.cn/index.php?s=/store/passport/login", cat: "internal", icon: Server, color: "#0052d9", desc: "集运业务管理后台", isExternal: true },
  { id: 103, name: "融一物流", url: "http://www.easyonelogistics.com/user.html", cat: "internal", icon: Box, color: "#0052d9", desc: "融一物流系统登录", isExternal: true },
  { id: 104, name: "速鸟系统", url: "https://oms.sn-freight.com/#/forecast", cat: "internal", icon: Send, color: "#00b5e2", desc: "速鸟OMS预报系统", isExternal: true },
  { id: 105, name: "亚美集运", url: "http://112.74.18.63/usercenter/index.aspx", cat: "internal", icon: Plane, color: "#e3001b", desc: "亚美用户中心", isExternal: true },
  { id: 106, name: "德威物流", url: "http://159.75.41.10:8888/new_index.jsp", cat: "internal", icon: Truck, color: "#f5a623", desc: "德威物流系统", isExternal: true },
  { id: 107, name: "融一查询", url: "http://tbtracking.com/", cat: "internal", icon: Search, color: "#0052d9", desc: "融一轨迹查询入口", isExternal: true },
  { id: 108, name: "速鸟查询", url: "http://track.sn-freight.com/express/track", cat: "internal", icon: Search, color: "#00b5e2", desc: "速鸟轨迹查询", isExternal: true },
  { id: 109, name: "亚美查询", url: "http://112.74.18.63:8012/", cat: "internal", icon: Search, color: "#e3001b", desc: "亚美轨迹查询", isExternal: true },
  { id: 110, name: "德威查询", url: "http://159.75.41.10:8888/WebTrack", cat: "internal", icon: Search, color: "#f5a623", desc: "德威WebTrack", isExternal: true },
  { id: 111, name: "小红书广告", url: "https://ad.xiaohongshu.com/", cat: "internal", icon: Megaphone, color: "#ff2442", desc: "小红书广告投放平台", isExternal: true },
  { id: 112, name: "小红书专业号", url: "https://pro.xiaohongshu.com/", cat: "internal", icon: Badge, color: "#ff2442", desc: "专业号运营后台", isExternal: true },
  // 2. 实用工具
  { id: 201, name: "报价表生成", url: "/quotation", cat: "tools", icon: FileText, color: "#10b981", desc: "快速生成物流报价单", isExternal: false },
  { id: 202, name: "形式发票", url: "/invoice", cat: "tools", icon: FileSignature, color: "#10b981", desc: "形式发票(PI)生成工具", isExternal: false },
  { id: 203, name: "出货单", url: "/delivery-note", cat: "tools", icon: Truck, color: "#10b981", desc: "快速生成出货单据", isExternal: false },
  { id: 204, name: "自助对账", url: "/reconciliation", cat: "tools", icon: Calculator, color: "#10b981", desc: "供应商账单自动比对", isExternal: false },
  { id: 213, name: "物流账单", url: "/debit-note", cat: "tools", icon: FileText, color: "#10b981", desc: "生成物流对账单", isExternal: false },
  { id: 205, name: "体积计算", url: "/calculator", cat: "tools", icon: Ruler, color: "#10b981", desc: "材积重计算工具", isExternal: false },
  { id: 208, name: "收据生成器", url: "/payment-receipt", cat: "tools", icon: Receipt, color: "#10b981", desc: "快速生成收款收据", isExternal: false },
  { id: 210, name: "入库单生成器", url: "/warehouse-receipt", cat: "tools", icon: Receipt, color: "#10b981", desc: "快速生成入库单据", isExternal: false },
  { id: 209, name: "速鸟批量", url: "/batch-order", cat: "tools", icon: Receipt, color: "#10b981", desc: "快速批量录单", isExternal: false },
  { id: 206, name: "Nowmsg邮编", url: "https://www.nowmsg.com/", cat: "tools", icon: MapPin, color: "#8b5cf6", desc: "全球地址邮编查询", isExternal: true },
  { id: 207, name: "Google翻译", url: "https://translate.google.com/", cat: "tools", icon: Languages, color: "#4285f4", desc: "多语言在线翻译", isExternal: true },
  { id: 211, name: "云备忘录", url: "memo/index.html", cat: "tools", icon: StickyNote, color: "#fab005", desc: "个人私密云笔记", isExternal: true },
  { id: 212, name: "视频SOP", url: "/sop", cat: "tools", icon: StickyNote, color: "#3605faff", desc: "视频脚本神器", isExternal: false },
  // 3. 物流与电商
  { id: 301, name: "17TRACK", url: "https://www.17track.net/", cat: "logistics", icon: Truck, color: "#ff6a00", desc: "全球物流一站式查询", isExternal: true },
  { id: 302, name: "DHL官网", url: "https://www.dhl.com/", cat: "logistics", icon: Package, color: "#d40511", desc: "DHL全球服务", isExternal: true },
  { id: 303, name: "UPS官网", url: "https://www.ups.com/", cat: "logistics", icon: Box, color: "#351c15", desc: "联合包裹服务", isExternal: true },
  { id: 304, name: "亚马逊后台", url: "https://sellercentral.amazon.com", cat: "ecommerce", icon: ShoppingCart, color: "#ff9900", desc: "Amazon Seller Central", isExternal: true },
  { id: 305, name: "Shopify", url: "https://www.shopify.com/login", cat: "ecommerce", icon: Store, color: "#95bf47", desc: "独立站后台登录", isExternal: true },
  { id: 306, name: "单一窗口", url: "https://www.singlewindow.cn/", cat: "customs", icon: Landmark, color: "#005aab", desc: "中国国际贸易单一窗口", isExternal: true },
  { id: 307, name: "通关网", url: "https://www.hsbianma.com/", cat: "customs", icon: Book, color: "#2db7f5", desc: "HS编码查询与税率", isExternal: true },
  { id: 308, name: "Maersk", url: "https://www.maersk.com.cn/", cat: "logistics", icon: Ship, color: "#42b0d5", desc: "马士基航运", isExternal: true },
  { id: 309, name: "COSCO", url: "https://lines.coscoshipping.com/", cat: "logistics", icon: Anchor, color: "#1890ff", desc: "中远海运", isExternal: true }
];

type FilterType = 'all' | 'internal' | 'tools' | 'logistics' | 'ecommerce' | 'customs' | 'fav';

export default function Workspace() {
  const [user, setUser] = useState<User | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'search' | '17track' | 'hscode'>('search');
  const [globalSearchInput, setGlobalSearchInput] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearchInput.trim()) return;
    let url = '';
    switch(searchType) {
      case 'search': url = `https://www.baidu.com/s?wd=${globalSearchInput}`; break;
      case '17track': url = `https://t.17track.net/zh-cn#nums=${globalSearchInput}`; break;
      case 'hscode': url = `https://www.hsbianma.com/search?keywords=${globalSearchInput}`; break;
    }
    window.open(url, '_blank');
  };

  const filteredApps = DEFAULT_APPS.filter(app => {
    const matchCat = currentFilter === 'all' || app.cat === currentFilter;
    const matchKey = !searchQuery || app.name.toLowerCase().includes(searchQuery.toLowerCase()) || app.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchKey;
  }).sort((a, b) => {
    if (a.cat === 'internal' && b.cat !== 'internal') return -1;
    if (b.cat === 'internal' && a.cat !== 'internal') return 1;
    return 0;
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      {/* Hero Section */}
      <div className="bg-slate-800 pt-12 pb-20 px-4 text-center text-white relative">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center gap-3 mb-4 flex-wrap">
            <button 
              className={`px-5 py-2 rounded-full text-sm transition-all border ${searchType === 'search' ? 'bg-white text-slate-800 font-bold border-white' : 'bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm'}`}
              onClick={() => setSearchType('search')}
            >
              综合搜索
            </button>
            <button 
              className={`px-5 py-2 rounded-full text-sm transition-all border ${searchType === '17track' ? 'bg-white text-slate-800 font-bold border-white' : 'bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm'}`}
              onClick={() => setSearchType('17track')}
            >
              17TRACK
            </button>
            <button 
              className={`px-5 py-2 rounded-full text-sm transition-all border ${searchType === 'hscode' ? 'bg-white text-slate-800 font-bold border-white' : 'bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm'}`}
              onClick={() => setSearchType('hscode')}
            >
              HS编码
            </button>
          </div>
          <form onSubmit={handleGlobalSearch} className="flex bg-white rounded-xl overflow-hidden h-14 shadow-2xl">
            <input 
              type="text" 
              className="flex-1 border-none px-6 text-lg outline-none text-slate-800" 
              placeholder={searchType === 'search' ? 'Google / 百度搜索...' : searchType === '17track' ? '输入运单号查询 (LP/YT/CJ)...' : '输入品名查询海关编码...'}
              value={globalSearchInput}
              onChange={(e) => setGlobalSearchInput(e.target.value)}
              required
            />
            <button type="submit" className="w-32 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg transition-colors">
              搜 索
            </button>
          </form>
        </div>
      </div>

      {/* Stats Container */}
      <div className="max-w-6xl mx-auto w-full px-4 -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between border border-slate-100">
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">应用总数</h4>
              <span className="text-2xl font-extrabold text-slate-800">{DEFAULT_APPS.length}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between border border-slate-100">
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">我的收藏</h4>
              <span className="text-2xl font-extrabold text-slate-800">0</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Star className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between border border-slate-100">
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">本周活跃</h4>
              <span className="text-2xl font-extrabold text-slate-800">12</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between border border-slate-100">
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">最近使用</h4>
              <span className="text-lg font-bold text-slate-800 truncate max-w-[80px] inline-block">体积计算</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-4 rounded-xl shadow-sm gap-4">
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            {[
              { id: 'all', label: '全部应用' },
              { id: 'internal', label: '公司内部' },
              { id: 'tools', label: '实用工具' },
              { id: 'logistics', label: '物流查询' },
              { id: 'ecommerce', label: '跨境电商' },
              { id: 'customs', label: '关务税务' },
              { id: 'fav', label: '⭐ 我的收藏' }
            ].map(f => (
              <button 
                key={f.id}
                onClick={() => setCurrentFilter(f.id as FilterType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${currentFilter === f.id ? 'bg-slate-700 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="查找应用名称..." 
              className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {filteredApps.map(app => {
            const Icon = app.icon;
            const cardContent = (
              <>
                <div className="w-14 h-14 mb-4 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform group-hover:-translate-y-1" style={{ backgroundColor: app.color }}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-800 mb-1 truncate w-full text-center">{app.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 text-center h-8">{app.desc}</p>
              </>
            );

            return app.isExternal ? (
              <a 
                key={app.id} 
                href={app.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white rounded-xl p-5 flex flex-col items-center border border-transparent hover:border-slate-200 shadow-sm hover:shadow-xl transition-all group relative"
              >
                {cardContent}
              </a>
            ) : (
              <Link 
                key={app.id} 
                to={app.url}
                className="bg-white rounded-xl p-5 flex flex-col items-center border border-transparent hover:border-slate-200 shadow-sm hover:shadow-xl transition-all group relative"
              >
                {cardContent}
              </Link>
            );
          })}
          {filteredApps.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              没有找到匹配的应用
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

