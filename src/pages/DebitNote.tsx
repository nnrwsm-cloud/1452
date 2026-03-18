import React, { useState, useEffect, useRef } from 'react';
import { db, auth, signIn } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { FileText, History, Save, Download, LogIn, Plus, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import HistoryDrawer from '../components/HistoryDrawer';

interface Item {
  id: string;
  description: string;
  qty: string;
  unitPrice: string;
  amount: string;
}

interface DebitNoteRecord {
  id: string;
  createdAt: any;
  noteNo: string;
  date: string;
  billTo: string;
  currency: string;
  items: Item[];
  bankDetails: string;
  notes: string;
}

export default function DebitNote() {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<DebitNoteRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);

  // Form State
  const [noteNo, setNoteNo] = useState(`DN${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [billTo, setBillTo] = useState('');
  const [currency, setCurrency] = useState('CNY');
  const [bankDetails, setBankDetails] = useState('账户名称：集运巴巴物流有限公司\n开户银行：中国工商银行\n银行账号：1234 5678 9012 3456');
  const [notes, setNotes] = useState('请于收到账单后3个工作日内安排付款，谢谢！');
  const [items, setItems] = useState<Item[]>([
    { id: '1', description: '国际运费', qty: '1', unitPrice: '0', amount: '0' }
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
    const q = query(collection(db, `users/${user.uid}/debit_notes`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: DebitNoteRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as DebitNoteRecord);
      });
      setHistory(records);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', qty: '1', unitPrice: '0', amount: '0' }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof Item, value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'qty' || field === 'unitPrice') {
          const qty = parseFloat(updatedItem.qty) || 0;
          const price = parseFloat(updatedItem.unitPrice) || 0;
          updatedItem.amount = (qty * price).toFixed(2);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (!user) {
      alert('请先登录以保存记录');
      return;
    }
    if (!billTo) {
      alert('请填写客户名称');
      return;
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/debit_notes`), {
        noteNo,
        date,
        billTo,
        currency,
        items,
        bankDetails,
        notes,
        createdAt: serverTimestamp()
      });
      alert('保存成功！');
    } catch (error) {
      console.error("Error saving document: ", error);
      alert('保存失败，请重试');
    }
  };

  const handleLoad = (record: DebitNoteRecord) => {
    setNoteNo(record.noteNo);
    setDate(record.date);
    setBillTo(record.billTo);
    setCurrency(record.currency || 'CNY');
    setItems(record.items || []);
    setBankDetails(record.bankDetails || '');
    setNotes(record.notes || '');
    setShowHistory(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/debit_notes`, id));
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
      link.download = `物流账单_${noteNo}.png`;
      link.href = url;
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      alert("导出图片失败");
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-800">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">物流账单 (Debit Note)</h1>
            <p className="text-slate-500 text-sm">快速生成、保存和导出标准物流对账单</p>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">账单编号 (Note No.)</label>
                  <input type="text" value={noteNo} onChange={e => setNoteNo(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">日期 (Date)</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">致 (Bill To) <span className="text-red-500">*</span></label>
                <input type="text" value={billTo} onChange={e => setBillTo(e.target.value)} placeholder="输入客户名称" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">币种 (Currency)</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none">
                  <option value="CNY">人民币 (CNY)</option>
                  <option value="USD">美元 (USD)</option>
                  <option value="HKD">港币 (HKD)</option>
                  <option value="EUR">欧元 (EUR)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h2 className="text-lg font-bold text-slate-800">费用明细</h2>
              <button onClick={handleAddItem} className="flex items-center gap-1 text-sm text-slate-800 hover:text-slate-700 font-medium">
                <Plus className="w-4 h-4" /> 添加费用项
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
                      <label className="block text-xs text-slate-500 mb-1">费用描述 (Description)</label>
                      <input type="text" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" placeholder="如：运费、附加费" />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs text-slate-500 mb-1">数量 (Qty)</label>
                      <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs text-slate-500 mb-1">单价 (Unit Price)</label>
                      <input type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs text-slate-500 mb-1">金额 (Amount)</label>
                      <input type="number" value={item.amount} readOnly className="w-full p-2 border border-slate-300 rounded bg-slate-100 text-slate-600 outline-none text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">附加信息</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">收款账户信息 (Bank Details)</label>
                <textarea value={bankDetails} onChange={e => setBankDetails(e.target.value)} rows={4} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">备注 (Notes)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              {!user ? (
                <button onClick={signIn} className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2 font-medium transition-colors">
                  <LogIn className="w-4 h-4" /> 登录以保存记录
                </button>
              ) : (
                <button onClick={handleSave} className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2 font-medium transition-colors shadow-md">
                  <Save className="w-4 h-4" /> 保存账单记录
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <div className="min-w-[700px] bg-white p-10 border border-slate-200 shadow-sm relative" ref={noteRef}>
              {/* Header */}
              <div className="flex justify-between items-start mb-10 border-b-2 border-black pb-4 relative z-10">
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
                  <h2 className="text-3xl font-bold text-black tracking-widest mb-1">DEBIT NOTE</h2>
                  <p className="text-sm text-gray-600 uppercase tracking-widest">账 单</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="flex justify-between mb-8 text-sm text-black relative z-10">
                <div className="w-1/2 pr-8">
                  <div className="font-bold mb-2 border-b border-gray-400 pb-1">TO (致):</div>
                  <div className="font-bold text-lg">{billTo || '_________________'}</div>
                </div>
                <div className="w-1/3">
                  <div className="grid grid-cols-2 gap-y-2">
                    <div className="font-bold">Note No.:</div>
                    <div>{noteNo}</div>
                    <div className="font-bold">Date:</div>
                    <div>{date}</div>
                    <div className="font-bold">Currency:</div>
                    <div>{currency}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-8 border-collapse text-sm text-black relative z-10">
                <thead>
                  <tr className="bg-gray-100 border-y-2 border-black">
                    <th className="p-3 text-left w-12">No.</th>
                    <th className="p-3 text-left">Description (费用描述)</th>
                    <th className="p-3 text-center w-24">Qty (数量)</th>
                    <th className="p-3 text-right w-32">Unit Price (单价)</th>
                    <th className="p-3 text-right w-32">Amount (金额)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-300">
                      <td className="p-3 text-left">{index + 1}</td>
                      <td className="p-3">{item.description}</td>
                      <td className="p-3 text-center">{item.qty}</td>
                      <td className="p-3 text-right">{parseFloat(item.unitPrice).toFixed(2)}</td>
                      <td className="p-3 text-right">{parseFloat(item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                  {/* Fill empty rows if needed */}
                  {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
                    <tr key={`empty-${i}`} className="border-b border-gray-300">
                      <td className="p-3 text-transparent">-</td>
                      <td className="p-3 text-transparent">-</td>
                      <td className="p-3 text-transparent">-</td>
                      <td className="p-3 text-transparent">-</td>
                      <td className="p-3 text-transparent">-</td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="font-bold text-base">
                    <td className="p-4 text-right border-t-2 border-black" colSpan={4}>TOTAL AMOUNT (总计):</td>
                    <td className="p-4 text-right border-t-2 border-black text-black">{currency} {totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Footer */}
              <div className="grid grid-cols-2 gap-8 text-sm text-black relative z-10">
                <div>
                  <div className="font-bold mb-2 border-b border-gray-400 pb-1">Bank Details (收款账户):</div>
                  <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">{bankDetails}</pre>
                  
                  {notes && (
                    <div className="mt-4">
                      <div className="font-bold mb-1">Remarks (备注):</div>
                      <p className="text-gray-800">{notes}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end justify-end pt-12 relative">
                  <div className="w-48 border-b-2 border-black mb-2 relative z-10"></div>
                  <div className="font-bold text-center w-48 relative z-10">Authorized Signature<br/>(授权签字)</div>
                  
                  {/* Stamp */}
                  <div className="absolute bottom-[-10px] right-8 w-32 h-32 border-4 border-red-600 rounded-full opacity-90 flex items-center justify-center transform -rotate-12 pointer-events-none z-0">
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
      </div>

      <HistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        records={history}
        onLoad={handleLoad}
        onDelete={handleDelete}
        title="账单历史记录"
        renderItemContent={(record) => (
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-slate-500">单号:</span> {record.noteNo}</div>
            <div><span className="text-slate-500">日期:</span> {record.date}</div>
            <div><span className="text-slate-500">客户:</span> {record.billTo}</div>
            <div><span className="text-slate-500">总计:</span> {record.currency} {record.items?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)}</div>
          </div>
        )}
      />
    </div>
  );
}
