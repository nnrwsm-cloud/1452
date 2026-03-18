import React, { useState, useEffect, useRef } from 'react';
import { db, auth, signIn } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Receipt, History, Save, Download, LogIn, Plus, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import HistoryDrawer from '../components/HistoryDrawer';

interface ReceiptRecord {
  id: string;
  createdAt: any;
  receiptNo: string;
  date: string;
  receivedFrom: string;
  amount: string;
  paymentMethod: string;
  description: string;
  receiver: string;
  currency: string;
}

export default function PaymentReceipt() {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<ReceiptRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Form State
  const [receiptNo, setReceiptNo] = useState(`PR${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedFrom, setReceivedFrom] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('CNY');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [description, setDescription] = useState('');
  const [receiver, setReceiver] = useState('');

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
    const q = query(collection(db, `users/${user.uid}/payment_receipts`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: ReceiptRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as ReceiptRecord);
      });
      setHistory(records);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      alert('请先登录以保存记录');
      return;
    }
    if (!receivedFrom || !amount) {
      alert('请填写交款人和金额');
      return;
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/payment_receipts`), {
        receiptNo,
        date,
        receivedFrom,
        amount,
        currency,
        paymentMethod,
        description,
        receiver,
        createdAt: serverTimestamp()
      });
      alert('保存成功！');
    } catch (error) {
      console.error("Error saving document: ", error);
      alert('保存失败，请重试');
    }
  };

  const handleLoad = (record: ReceiptRecord) => {
    setReceiptNo(record.receiptNo);
    setDate(record.date);
    setReceivedFrom(record.receivedFrom);
    setAmount(record.amount);
    setCurrency(record.currency || 'CNY');
    setPaymentMethod(record.paymentMethod);
    setDescription(record.description);
    setReceiver(record.receiver);
    setShowHistory(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/payment_receipts`, id));
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
      link.download = `收款收据_${receiptNo}.png`;
      link.href = url;
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      alert("导出图片失败");
    }
  };

  // Helper to convert number to Chinese uppercase (simplified version)
  const toChineseAmount = (numStr: string) => {
    const num = parseFloat(numStr);
    if (isNaN(num)) return '';
    // A simplified placeholder for actual conversion logic
    return `RMB ${num.toFixed(2)}`; 
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-800">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">收款收据生成器</h1>
            <p className="text-slate-500 text-sm">快速生成、保存和导出标准收款收据</p>
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
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">收据信息</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">收据编号</label>
                  <input type="text" value={receiptNo} onChange={e => setReceiptNo(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">交款人/单位 <span className="text-red-500">*</span></label>
                <input type="text" value={receivedFrom} onChange={e => setReceivedFrom(e.target.value)} placeholder="输入交款方名称" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">币种</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none">
                    <option value="CNY">人民币 (CNY)</option>
                    <option value="USD">美元 (USD)</option>
                    <option value="HKD">港币 (HKD)</option>
                    <option value="EUR">欧元 (EUR)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">金额 <span className="text-red-500">*</span></label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">收款方式</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none">
                  <option value="bank_transfer">银行转账</option>
                  <option value="cash">现金</option>
                  <option value="alipay">支付宝</option>
                  <option value="wechat">微信支付</option>
                  <option value="check">支票</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">收款事由</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="例如：运费、仓储费等" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">收款人</label>
                <input type="text" value={receiver} onChange={e => setReceiver(e.target.value)} placeholder="输入收款人姓名" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              {!user ? (
                <button onClick={signIn} className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2 font-medium transition-colors">
                  <LogIn className="w-4 h-4" /> 登录以保存记录
                </button>
              ) : (
                <button onClick={handleSave} className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2 font-medium transition-colors shadow-md">
                  <Save className="w-4 h-4" /> 保存收据记录
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <div className="min-w-[600px] bg-white p-8 border-2 border-slate-100 relative" ref={receiptRef}>
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none overflow-hidden">
                <div className="text-9xl font-bold transform -rotate-45 whitespace-nowrap">集运巴巴</div>
              </div>

              <div className="flex justify-between items-center mb-8 relative z-10 border-b-2 border-black pb-4">
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
                  <h2 className="text-2xl font-bold text-black tracking-widest mb-1">收 款 收 据</h2>
                  <div className="text-sm text-gray-600 uppercase tracking-widest">OFFICIAL RECEIPT</div>
                </div>
              </div>

              <div className="flex justify-between mb-6 text-sm text-black relative z-10">
                <div><span className="font-bold">No:</span> {receiptNo}</div>
                <div><span className="font-bold">Date:</span> {date}</div>
              </div>

              <div className="space-y-6 relative z-10 text-black">
                <div className="flex items-end border-b border-gray-400 pb-2">
                  <span className="w-32 font-bold text-black">交款单位/人：<br/><span className="text-xs text-gray-600 font-normal">Received From</span></span>
                  <span className="flex-1 px-4 text-lg">{receivedFrom || '_________________'}</span>
                </div>

                <div className="flex items-end border-b border-gray-400 pb-2">
                  <span className="w-32 font-bold text-black">收款事由：<br/><span className="text-xs text-gray-600 font-normal">For Payment Of</span></span>
                  <span className="flex-1 px-4 text-lg">{description || '_________________'}</span>
                </div>

                <div className="flex items-end border-b border-gray-400 pb-2">
                  <span className="w-32 font-bold text-black">人民币(大写)：<br/><span className="text-xs text-gray-600 font-normal">Amount in Words</span></span>
                  <span className="flex-1 px-4 text-lg">{amount ? toChineseAmount(amount) : '_________________'}</span>
                </div>

                <div className="flex justify-between items-end pt-4">
                  <div className="flex items-center gap-2 border-2 border-black p-2 rounded">
                    <span className="font-bold text-xl">{currency}</span>
                    <span className="text-2xl font-bold min-w-[150px]">{amount ? parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</span>
                  </div>
                  
                  <div className="flex items-end border-b border-gray-400 pb-2 w-64 relative">
                    <span className="w-20 font-bold text-black">收款人：<br/><span className="text-xs text-gray-600 font-normal">Receiver</span></span>
                    <span className="flex-1 px-2 text-center relative z-10">{receiver || '_________________'}</span>
                    
                    {/* Stamp */}
                    <div className="absolute bottom-[-20px] right-0 w-28 h-28 border-4 border-red-600 rounded-full opacity-90 flex items-center justify-center transform -rotate-12 pointer-events-none z-0">
                      <div className="w-24 h-24 border border-red-600 rounded-full flex flex-col items-center justify-center text-red-600">
                        <span className="text-xs font-bold tracking-widest">集运巴巴</span>
                        <span className="text-base font-black tracking-widest my-1">财务专用章</span>
                      </div>
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
        title="收据历史记录"
        renderItemContent={(record) => (
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-slate-500">编号:</span> {record.receiptNo}</div>
            <div><span className="text-slate-500">日期:</span> {record.date}</div>
            <div className="col-span-2"><span className="text-slate-500">交款人:</span> {record.receivedFrom}</div>
            <div><span className="text-slate-500">金额:</span> {record.currency} {record.amount}</div>
            <div><span className="text-slate-500">事由:</span> {record.description}</div>
          </div>
        )}
      />
    </div>
  );
}
