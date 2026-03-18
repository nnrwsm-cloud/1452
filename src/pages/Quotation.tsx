import React, { useState, useEffect, useRef } from 'react';
import { db, auth, signIn } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { FileText, History, Save, Download, LogIn, Plus, Trash2, LayoutTemplate } from 'lucide-react';
import html2canvas from 'html2canvas';
import HistoryDrawer from '../components/HistoryDrawer';

interface QuotationItem {
  id: string;
  destination: string;
  weightRange: string;
  price: string;
  transitTime: string;
  remarks: string;
}

interface QuotationRecord {
  id: string;
  createdAt: any;
  quotationNo: string;
  date: string;
  customerName: string;
  validUntil: string;
  items: QuotationItem[];
  notes: string;
  layout: 'portrait' | 'landscape';
}

export default function Quotation() {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<QuotationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Form State
  const [quotationNo, setQuotationNo] = useState(`QT${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('1. 以上报价包含燃油附加费。\n2. 偏远地区附加费另计。\n3. 实际重量与体积重量取大者计费。');
  const [layout, setLayout] = useState<'portrait' | 'landscape'>('portrait');
  const [items, setItems] = useState<QuotationItem[]>([
    { id: '1', destination: '美国', weightRange: '21-50KG', price: '45', transitTime: '5-7个工作日', remarks: '空派包税' }
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }
    const q = query(collection(db, `users/${user.uid}/quotations`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: QuotationRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as QuotationRecord);
      });
      setHistory(records);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), destination: '', weightRange: '', price: '', transitTime: '', remarks: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof QuotationItem, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSave = async () => {
    if (!user) {
      alert('请先登录以保存记录');
      return;
    }
    if (!customerName) {
      alert('请填写客户名称');
      return;
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/quotations`), {
        quotationNo,
        date,
        customerName,
        validUntil,
        items,
        notes,
        layout,
        createdAt: serverTimestamp()
      });
      alert('保存成功！');
    } catch (error) {
      console.error("Error saving document: ", error);
      alert('保存失败，请重试');
    }
  };

  const handleLoad = (record: QuotationRecord) => {
    setQuotationNo(record.quotationNo);
    setDate(record.date);
    setCustomerName(record.customerName);
    setValidUntil(record.validUntil || '');
    setItems(record.items || []);
    setNotes(record.notes || '');
    setLayout(record.layout || 'portrait');
    setShowHistory(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/quotations`, id));
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  const handleExportImage = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `报价单_${quotationNo}.png`;
      link.href = url;
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      alert("导出图片失败");
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-800">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">报价单生成器</h1>
            <p className="text-slate-500 text-sm">快速生成、保存和导出物流报价单</p>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          {user && (
            <button 
              onClick={() => setShowHistory(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium"
            >
              <History className="w-4 h-4" /> 历史记录 ({history.length})
            </button>
          )}
          <button 
            onClick={handleExportImage}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium"
          >
            <Download className="w-4 h-4" /> 导出图片
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">基本信息</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">报价单号</label>
                  <input type="text" value={quotationNo} onChange={e => setQuotationNo(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">报价日期</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">客户名称 <span className="text-red-500">*</span></label>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="输入客户名称" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">有效期至</label>
                  <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">版面方向</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="layout" value="portrait" checked={layout === 'portrait'} onChange={() => setLayout('portrait')} className="text-slate-800 focus:ring-slate-800" />
                    <span className="text-sm text-slate-700">竖版 (适合手机)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="layout" value="landscape" checked={layout === 'landscape'} onChange={() => setLayout('landscape')} className="text-slate-800 focus:ring-slate-800" />
                    <span className="text-sm text-slate-700">横版 (适合电脑/打印)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h2 className="text-lg font-bold text-slate-800">报价明细</h2>
              <button onClick={handleAddItem} className="flex items-center gap-1 text-sm text-slate-800 hover:text-slate-700 font-medium">
                <Plus className="w-4 h-4" /> 添加线路
              </button>
            </div>
            
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg relative">
                  <div className="absolute top-2 right-2">
                    <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-6">
                      <label className="block text-xs text-slate-500 mb-1">目的地</label>
                      <input type="text" value={item.destination} onChange={e => handleItemChange(item.id, 'destination', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" placeholder="如: 美国" />
                    </div>
                    <div className="col-span-6">
                      <label className="block text-xs text-slate-500 mb-1">重量段</label>
                      <input type="text" value={item.weightRange} onChange={e => handleItemChange(item.id, 'weightRange', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" placeholder="如: 21-50KG" />
                    </div>
                    <div className="col-span-6">
                      <label className="block text-xs text-slate-500 mb-1">单价 (RMB/KG)</label>
                      <input type="text" value={item.price} onChange={e => handleItemChange(item.id, 'price', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" placeholder="如: 45" />
                    </div>
                    <div className="col-span-6">
                      <label className="block text-xs text-slate-500 mb-1">时效</label>
                      <input type="text" value={item.transitTime} onChange={e => handleItemChange(item.id, 'transitTime', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" placeholder="如: 5-7个工作日" />
                    </div>
                    <div className="col-span-12">
                      <label className="block text-xs text-slate-500 mb-1">备注</label>
                      <input type="text" value={item.remarks} onChange={e => handleItemChange(item.id, 'remarks', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" placeholder="如: 空派包税" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">报价说明/注意事项</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" 
                rows={4}
              />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              {!user ? (
                <button onClick={signIn} className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2 font-medium transition-colors">
                  <LogIn className="w-4 h-4" /> 登录以保存记录
                </button>
              ) : (
                <button onClick={handleSave} className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2 font-medium transition-colors shadow-md">
                  <Save className="w-4 h-4" /> 保存报价单
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <div 
              className={`bg-white p-8 border-2 border-slate-100 relative ${layout === 'landscape' ? 'min-w-[900px]' : 'min-w-[500px] max-w-[600px] mx-auto'}`} 
              ref={receiptRef}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4 relative z-10">
                <div className="flex items-center gap-4">
                  <img src="/logo.png" alt="Logo" className="h-12 object-contain" onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }} />
                  <div>
                    <h1 className="text-3xl font-bold text-black tracking-widest mb-1">集运巴巴</h1>
                    <div className="text-xs text-gray-600 uppercase tracking-widest">JIYUNBABA LOGISTICS</div>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-black tracking-widest">物 流 报 价 单</h2>
                  <h3 className="text-lg font-bold text-gray-700 tracking-widest">QUOTATION</h3>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6 text-sm text-black relative z-10">
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="font-bold w-24">报价单号:</span>
                  <span className="flex-1">{quotationNo}</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="font-bold w-24">报价日期:</span>
                  <span className="flex-1">{date}</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="font-bold w-24">客户名称:</span>
                  <span className="flex-1 font-bold">{customerName}</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="font-bold w-24">有效期至:</span>
                  <span className="flex-1">{validUntil || '长期有效'}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-6 border-collapse border border-black text-sm text-black relative z-10">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2 text-center w-12">序号</th>
                    <th className="border border-black p-2 text-left">目的地</th>
                    <th className="border border-black p-2 text-center">重量段</th>
                    <th className="border border-black p-2 text-center">单价 (RMB)</th>
                    <th className="border border-black p-2 text-center">预计时效</th>
                    <th className="border border-black p-2 text-left">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border border-black p-2 text-center">{index + 1}</td>
                      <td className="border border-black p-2">{item.destination}</td>
                      <td className="border border-black p-2 text-center">{item.weightRange}</td>
                      <td className="border border-black p-2 text-center font-bold text-black">{item.price}</td>
                      <td className="border border-black p-2 text-center">{item.transitTime}</td>
                      <td className="border border-black p-2">{item.remarks}</td>
                    </tr>
                  ))}
                  {/* Fill empty rows if needed */}
                  {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td className="border border-black p-2 text-center text-transparent">-</td>
                      <td className="border border-black p-2 text-transparent">-</td>
                      <td className="border border-black p-2 text-transparent">-</td>
                      <td className="border border-black p-2 text-transparent">-</td>
                      <td className="border border-black p-2 text-transparent">-</td>
                      <td className="border border-black p-2 text-transparent">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer Notes */}
              <div className="mt-6 text-sm text-black relative z-10">
                <div className="font-bold mb-2">报价说明及注意事项:</div>
                <div className="whitespace-pre-wrap leading-relaxed text-gray-800 bg-gray-50 p-4 rounded border border-gray-300">
                  {notes}
                </div>
              </div>
              
              <div className="mt-8 text-right text-sm text-gray-600 relative z-10">
                <p>感谢您的询价，期待与您合作！</p>
                <p className="mt-1 font-bold text-black">集运巴巴</p>
                
                {/* Stamp */}
                <div className="absolute bottom-[-20px] right-4 w-32 h-32 border-4 border-red-600 rounded-full opacity-90 flex items-center justify-center transform -rotate-12 pointer-events-none z-0">
                  <div className="w-28 h-28 border border-red-600 rounded-full flex flex-col items-center justify-center text-red-600">
                    <span className="text-sm font-bold tracking-widest">集运巴巴</span>
                    <span className="text-lg font-black tracking-widest my-1">业务专用章</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <HistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        records={history}
        onLoad={handleLoad}
        onDelete={handleDelete}
        title="报价单历史记录"
        renderItemContent={(record) => (
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-slate-500">单号:</span> {record.quotationNo}</div>
            <div><span className="text-slate-500">日期:</span> {record.date}</div>
            <div><span className="text-slate-500">客户:</span> {record.customerName}</div>
            <div><span className="text-slate-500">有效期:</span> {record.validUntil}</div>
            <div className="col-span-2"><span className="text-slate-500">线路:</span> {record.items?.map(i => i.destination).join(', ')}</div>
          </div>
        )}
      />
    </div>
  );
}
