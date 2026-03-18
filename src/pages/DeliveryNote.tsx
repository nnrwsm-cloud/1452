import React, { useState, useEffect, useRef } from 'react';
import { db, auth, signIn } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Truck, History, Save, Download, LogIn, Plus, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import HistoryDrawer from '../components/HistoryDrawer';

interface Item {
  id: string;
  name: string;
  qty: string;
  unit: string;
  remarks: string;
}

interface DeliveryRecord {
  id: string;
  createdAt: any;
  noteNo: string;
  date: string;
  sender: string;
  receiver: string;
  address: string;
  phone: string;
  items: Item[];
  notes: string;
}

export default function DeliveryNote() {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<DeliveryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);

  // Form State
  const [noteNo, setNoteNo] = useState(`DN${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sender, setSender] = useState('集运巴巴物流有限公司');
  const [receiver, setReceiver] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Item[]>([
    { id: '1', name: '', qty: '1', unit: '件', remarks: '' }
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
    const q = query(collection(db, `users/${user.uid}/delivery_notes`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: DeliveryRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as DeliveryRecord);
      });
      setHistory(records);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', qty: '1', unit: '件', remarks: '' }]);
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
    if (!receiver) {
      alert('请填写收货人');
      return;
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/delivery_notes`), {
        noteNo,
        date,
        sender,
        receiver,
        address,
        phone,
        items,
        notes,
        createdAt: serverTimestamp()
      });
      alert('保存成功！');
    } catch (error) {
      console.error("Error saving document: ", error);
      alert('保存失败，请重试');
    }
  };

  const handleLoad = (record: DeliveryRecord) => {
    setNoteNo(record.noteNo);
    setDate(record.date);
    setSender(record.sender || '集运巴巴物流有限公司');
    setReceiver(record.receiver);
    setAddress(record.address || '');
    setPhone(record.phone || '');
    setItems(record.items || []);
    setNotes(record.notes || '');
    setShowHistory(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/delivery_notes`, id));
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  const handleExportImage = async () => {
    if (!noteRef.current) return;
    try {
      const canvas = await html2canvas(noteRef.current, { scale: 2 });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `出货单_${noteNo}.png`;
      link.href = url;
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      alert("导出图片失败");
    }
  };

  const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-800">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">出货单生成器</h1>
            <p className="text-slate-500 text-sm">快速生成、保存和导出标准出货单据</p>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">出货单号</label>
                  <input type="text" value={noteNo} onChange={e => setNoteNo(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">出货日期</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">发货单位</label>
                <input type="text" value={sender} onChange={e => setSender(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">收货人/单位 <span className="text-red-500">*</span></label>
                <input type="text" value={receiver} onChange={e => setReceiver(e.target.value)} placeholder="输入收货方名称" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">收货地址</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">联系电话</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
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
                      <label className="block text-xs text-slate-500 mb-1">品名 / 规格</label>
                      <input type="text" value={item.name} onChange={e => handleItemChange(item.id, 'name', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" placeholder="输入品名" />
                    </div>
                    <div className="col-span-6">
                      <label className="block text-xs text-slate-500 mb-1">数量</label>
                      <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" />
                    </div>
                    <div className="col-span-6">
                      <label className="block text-xs text-slate-500 mb-1">单位</label>
                      <input type="text" value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" />
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
                  <Save className="w-4 h-4" /> 保存出货记录
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <div className="min-w-[700px] bg-white p-8 border-2 border-slate-100 relative" ref={noteRef}>
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
                  <h2 className="text-2xl font-bold text-black tracking-widest">出 货 单</h2>
                  <h3 className="text-lg font-bold text-gray-700 tracking-widest">DELIVERY NOTE</h3>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6 text-sm text-black">
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="font-bold w-24">出货单号:</span>
                  <span className="flex-1">{noteNo}</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="font-bold w-24">出货日期:</span>
                  <span className="flex-1">{date}</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="font-bold w-24">发货单位:</span>
                  <span className="flex-1">{sender}</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1">
                  <span className="font-bold w-24">收货单位:</span>
                  <span className="flex-1 font-bold">{receiver}</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1 col-span-2">
                  <span className="font-bold w-24">收货地址:</span>
                  <span className="flex-1">{address}</span>
                </div>
                <div className="flex border-b border-gray-400 pb-1 col-span-2">
                  <span className="font-bold w-24">联系电话:</span>
                  <span className="flex-1">{phone}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-6 border-collapse border border-black text-sm text-black">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2 text-center w-12">序号</th>
                    <th className="border border-black p-2 text-left">品名 / 规格</th>
                    <th className="border border-black p-2 text-center w-24">数量</th>
                    <th className="border border-black p-2 text-center w-24">单位</th>
                    <th className="border border-black p-2 text-left w-48">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border border-black p-2 text-center">{index + 1}</td>
                      <td className="border border-black p-2">{item.name}</td>
                      <td className="border border-black p-2 text-center">{item.qty}</td>
                      <td className="border border-black p-2 text-center">{item.unit}</td>
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
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="font-bold bg-gray-50">
                    <td className="border border-black p-2 text-center" colSpan={2}>合计 (TOTAL)</td>
                    <td className="border border-black p-2 text-center">{totalQty}</td>
                    <td className="border border-black p-2 text-center"></td>
                    <td className="border border-black p-2"></td>
                  </tr>
                </tbody>
              </table>

              {/* Footer */}
              <div className="flex justify-between mt-12 text-sm text-black">
                <div className="flex gap-2 w-64 border-t border-black pt-2">
                  <span className="font-bold">发货人签字:</span>
                </div>
                <div className="flex gap-2 w-64 border-t border-black pt-2">
                  <span className="font-bold">收货人签收:</span>
                </div>
              </div>
              
              {notes && (
                <div className="mt-8 text-sm text-gray-800">
                  <span className="font-bold text-black">备注: </span> {notes}
                </div>
              )}
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
        title="出货单历史记录"
        renderItemContent={(record) => (
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-slate-500">单号:</span> {record.noteNo}</div>
            <div><span className="text-slate-500">日期:</span> {record.date}</div>
            <div><span className="text-slate-500">收货方:</span> {record.receiver}</div>
            <div className="col-span-2"><span className="text-slate-500">物品:</span> {record.items?.map(i => i.name).join(', ')}</div>
          </div>
        )}
      />
    </div>
  );
}
