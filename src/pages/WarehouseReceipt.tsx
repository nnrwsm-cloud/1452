import React, { useState, useEffect, useRef } from 'react';
import { db, auth, signIn } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Package, History, Save, Download, LogIn, Plus, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import HistoryDrawer from '../components/HistoryDrawer';

interface Item {
  id: string;
  name: string;
  qty: string;
  weight: string;
  volume: string;
  remarks: string;
}

interface WarehouseRecord {
  id: string;
  createdAt: any;
  receiptNo: string;
  date: string;
  customerName: string;
  trackingNo: string;
  items: Item[];
  receiver: string;
  notes: string;
}

export default function WarehouseReceipt() {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<WarehouseRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Form State
  const [receiptNo, setReceiptNo] = useState(`WR${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [receiver, setReceiver] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Item[]>([
    { id: '1', name: '', qty: '1', weight: '0', volume: '0', remarks: '' }
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
    const q = query(collection(db, `users/${user.uid}/warehouse_receipts`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: WarehouseRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as WarehouseRecord);
      });
      setHistory(records);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', qty: '1', weight: '0', volume: '0', remarks: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof Item, value: string) => {
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
      await addDoc(collection(db, `users/${user.uid}/warehouse_receipts`), {
        receiptNo,
        date,
        customerName,
        trackingNo,
        items,
        receiver,
        notes,
        createdAt: serverTimestamp()
      });
      alert('保存成功！');
    } catch (error) {
      console.error("Error saving document: ", error);
      alert('保存失败，请重试');
    }
  };

  const handleLoad = (record: WarehouseRecord) => {
    setReceiptNo(record.receiptNo);
    setDate(record.date);
    setCustomerName(record.customerName);
    setTrackingNo(record.trackingNo);
    setItems(record.items || []);
    setReceiver(record.receiver || '');
    setNotes(record.notes || '');
    setShowHistory(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/warehouse_receipts`, id));
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
      link.download = `入库单_${receiptNo}.png`;
      link.href = url;
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      alert("导出图片失败");
    }
  };

  const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
  const totalWeight = items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0);
  const totalVolume = items.reduce((sum, item) => sum + (parseFloat(item.volume) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-800">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">入库单生成器</h1>
            <p className="text-slate-500 text-sm">快速生成、保存和导出标准仓库入库单</p>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">入库单号</label>
                  <input type="text" value={receiptNo} onChange={e => setReceiptNo(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">入库日期</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">客户名称/代码 <span className="text-red-500">*</span></label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="输入客户名称或代码" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">国内快递单号/物流单号</label>
                <input type="text" value={trackingNo} onChange={e => setTrackingNo(e.target.value)} placeholder="输入快递单号" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">收货人/仓管员</label>
                  <input type="text" value={receiver} onChange={e => setReceiver(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h2 className="text-lg font-bold text-slate-800">物品明细</h2>
              <button onClick={handleAddItem} className="flex items-center gap-1 text-sm text-slate-800 hover:text-slate-700 font-medium">
                <Plus className="w-4 h-4" /> 添加物品
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
                    <div className="col-span-12">
                      <label className="block text-xs text-slate-500 mb-1">品名</label>
                      <input type="text" value={item.name} onChange={e => handleItemChange(item.id, 'name', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" placeholder="输入品名" />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs text-slate-500 mb-1">件数</label>
                      <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs text-slate-500 mb-1">重量(KG)</label>
                      <input type="number" value={item.weight} onChange={e => handleItemChange(item.id, 'weight', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs text-slate-500 mb-1">体积(CBM)</label>
                      <input type="number" value={item.volume} onChange={e => handleItemChange(item.id, 'volume', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" />
                    </div>
                    <div className="col-span-12">
                      <label className="block text-xs text-slate-500 mb-1">备注</label>
                      <input type="text" value={item.remarks} onChange={e => handleItemChange(item.id, 'remarks', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" placeholder="选填" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              {!user ? (
                <button onClick={signIn} className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2 font-medium transition-colors">
                  <LogIn className="w-4 h-4" /> 登录以保存记录
                </button>
              ) : (
                <button onClick={handleSave} className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2 font-medium transition-colors shadow-md">
                  <Save className="w-4 h-4" /> 保存入库记录
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <div className="min-w-[700px] bg-white p-8 border-2 border-slate-100 relative" ref={receiptRef}>
              {/* Header */}
              <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
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
                  <h2 className="text-2xl font-bold text-black tracking-widest">入 库 单</h2>
                  <h3 className="text-lg font-bold text-gray-700 tracking-widest">WAREHOUSE RECEIPT</h3>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6 text-sm text-black">
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="font-bold w-24">入库单号:</span>
                  <span className="flex-1">{receiptNo}</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="font-bold w-24">入库日期:</span>
                  <span className="flex-1">{date}</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="font-bold w-24">客户名称:</span>
                  <span className="flex-1 font-bold">{customerName}</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="font-bold w-24">快递单号:</span>
                  <span className="flex-1">{trackingNo}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-6 border-collapse border border-black text-sm text-black">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2 text-center w-12">序号</th>
                    <th className="border border-black p-2 text-left">品名 / 描述</th>
                    <th className="border border-black p-2 text-center w-20">件数</th>
                    <th className="border border-black p-2 text-center w-24">重量(KG)</th>
                    <th className="border border-black p-2 text-center w-24">体积(CBM)</th>
                    <th className="border border-black p-2 text-left w-32">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border border-black p-2 text-center">{index + 1}</td>
                      <td className="border border-black p-2">{item.name}</td>
                      <td className="border border-black p-2 text-center">{item.qty}</td>
                      <td className="border border-black p-2 text-center">{item.weight}</td>
                      <td className="border border-black p-2 text-center">{item.volume}</td>
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
                  {/* Totals Row */}
                  <tr className="font-bold bg-gray-50">
                    <td className="border border-black p-2 text-center" colSpan={2}>合计 (TOTAL)</td>
                    <td className="border border-black p-2 text-center">{totalQty}</td>
                    <td className="border border-black p-2 text-center">{totalWeight.toFixed(2)}</td>
                    <td className="border border-black p-2 text-center">{totalVolume.toFixed(3)}</td>
                    <td className="border border-black p-2"></td>
                  </tr>
                </tbody>
              </table>

              {/* Footer */}
              <div className="flex justify-between mt-8 text-sm text-black relative">
                <div className="flex gap-2">
                  <span className="font-bold">备注:</span>
                  <span>{notes}</span>
                </div>
                <div className="flex gap-2 w-64 border-b border-black pb-1 relative z-10">
                  <span className="font-bold">收货人/仓管:</span>
                  <span className="flex-1 text-center">{receiver}</span>
                </div>

                {/* Stamp */}
                <div className="absolute bottom-0 right-16 w-32 h-32 border-4 border-red-600 rounded-full flex items-center justify-center transform -rotate-12 opacity-100 pointer-events-none z-0">
                  <div className="w-28 h-28 border border-red-600 rounded-full flex flex-col items-center justify-center text-red-600">
                    <span className="text-sm font-bold tracking-widest">集运巴巴</span>
                    <span className="text-lg font-black tracking-widest my-1">已入库</span>
                    <span className="text-[10px]">{date}</span>
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
        title="入库单历史记录"
        renderItemContent={(record) => (
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-slate-500">单号:</span> {record.receiptNo}</div>
            <div><span className="text-slate-500">日期:</span> {record.date}</div>
            <div><span className="text-slate-500">客户:</span> {record.customerName}</div>
            <div><span className="text-slate-500">快递单号:</span> {record.trackingNo}</div>
            <div className="col-span-2"><span className="text-slate-500">物品:</span> {record.items?.map(i => i.name).join(', ')}</div>
          </div>
        )}
      />
    </div>
  );
}
