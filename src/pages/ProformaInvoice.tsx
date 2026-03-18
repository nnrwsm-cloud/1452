import React, { useState, useEffect, useRef } from 'react';
import { db, auth, signIn } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { FileSignature, History, Save, Download, LogIn, Plus, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import HistoryDrawer from '../components/HistoryDrawer';

interface Item {
  id: string;
  description: string;
  hsCode: string;
  qty: string;
  unit: string;
  unitPrice: string;
  amount: string;
}

interface InvoiceRecord {
  id: string;
  createdAt: any;
  invoiceNo: string;
  date: string;
  shipper: string;
  consignee: string;
  currency: string;
  items: Item[];
  notes: string;
}

export default function ProformaInvoice() {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<InvoiceRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Form State
  const [invoiceNo, setInvoiceNo] = useState(`PI${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-001`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shipper, setShipper] = useState('JIYUNBABA LOGISTICS CO., LTD.\nSHENZHEN, CHINA');
  const [consignee, setConsignee] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('I declare that the above information is true and correct to the best of my knowledge.');
  const [items, setItems] = useState<Item[]>([
    { id: '1', description: '', hsCode: '', qty: '1', unit: 'PCS', unitPrice: '0', amount: '0' }
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
    const q = query(collection(db, `users/${user.uid}/proforma_invoices`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: InvoiceRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as InvoiceRecord);
      });
      setHistory(records);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', hsCode: '', qty: '1', unit: 'PCS', unitPrice: '0', amount: '0' }]);
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
    if (!consignee) {
      alert('请填写收货人信息');
      return;
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/proforma_invoices`), {
        invoiceNo,
        date,
        shipper,
        consignee,
        currency,
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

  const handleLoad = (record: InvoiceRecord) => {
    setInvoiceNo(record.invoiceNo);
    setDate(record.date);
    setShipper(record.shipper);
    setConsignee(record.consignee);
    setCurrency(record.currency || 'USD');
    setItems(record.items || []);
    setNotes(record.notes || '');
    setShowHistory(false);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/proforma_invoices`, id));
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  const handleExportImage = async () => {
    if (!invoiceRef.current) return;
    try {
      const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `形式发票_${invoiceNo}.png`;
      link.href = url;
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      alert("导出图片失败");
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-800">
            <FileSignature className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">形式发票 (Proforma Invoice)</h1>
            <p className="text-slate-500 text-sm">快速生成、保存和导出外贸形式发票</p>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">发票编号 (Invoice No.)</label>
                  <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">日期 (Date)</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">发货人 (Shipper/Exporter)</label>
                <textarea value={shipper} onChange={e => setShipper(e.target.value)} rows={3} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">收货人 (Consignee) <span className="text-red-500">*</span></label>
                <textarea value={consignee} onChange={e => setConsignee(e.target.value)} rows={3} placeholder="输入收货人名称、地址、电话等信息" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">币种 (Currency)</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none">
                  <option value="USD">美元 (USD)</option>
                  <option value="EUR">欧元 (EUR)</option>
                  <option value="GBP">英镑 (GBP)</option>
                  <option value="CNY">人民币 (CNY)</option>
                  <option value="HKD">港币 (HKD)</option>
                  <option value="JPY">日元 (JPY)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h2 className="text-lg font-bold text-slate-800">商品明细</h2>
              <button onClick={handleAddItem} className="flex items-center gap-1 text-sm text-slate-800 hover:text-slate-700 font-medium">
                <Plus className="w-4 h-4" /> 添加商品
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
                      <label className="block text-xs text-slate-500 mb-1">商品描述 (Description of Goods)</label>
                      <input type="text" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" placeholder="如：Men's Cotton T-Shirt" />
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <label className="block text-xs text-slate-500 mb-1">海关编码 (HS Code)</label>
                      <input type="text" value={item.hsCode} onChange={e => handleItemChange(item.id, 'hsCode', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" placeholder="选填" />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">数量 (Qty)</label>
                      <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">单位 (Unit)</label>
                      <input type="text" value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" />
                    </div>
                    <div className="col-span-4 md:col-span-4">
                      <label className="block text-xs text-slate-500 mb-1">单价 (Unit Price)</label>
                      <input type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none text-sm" />
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
                <label className="block text-sm font-medium text-slate-700 mb-1">声明/备注 (Declaration/Notes)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 outline-none" />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              {!user ? (
                <button onClick={signIn} className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2 font-medium transition-colors">
                  <LogIn className="w-4 h-4" /> 登录以保存记录
                </button>
              ) : (
                <button onClick={handleSave} className="w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-2 font-medium transition-colors shadow-md">
                  <Save className="w-4 h-4" /> 保存发票记录
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <div className="min-w-[700px] bg-white p-10 border border-slate-200 shadow-sm relative" ref={invoiceRef}>
              {/* Header */}
              <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4 relative z-10">
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
                  <h2 className="text-2xl font-bold text-black tracking-widest">PROFORMA INVOICE</h2>
                  <h3 className="text-lg font-bold text-gray-700 tracking-widest">形 式 发 票</h3>
                </div>
              </div>

              {/* Info Grid */}
              <div className="flex justify-between mb-8 text-sm text-black relative z-10">
                <div className="w-1/2 pr-4 space-y-4">
                  <div>
                    <div className="font-bold mb-1 bg-gray-100 p-1 border-l-4 border-black">Shipper / Exporter (发货人):</div>
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed pl-2">{shipper}</pre>
                  </div>
                  <div>
                    <div className="font-bold mb-1 bg-gray-100 p-1 border-l-4 border-black">Consignee (收货人):</div>
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed pl-2">{consignee || '_________________'}</pre>
                  </div>
                </div>
                <div className="w-1/3 space-y-4">
                  <div className="flex border-b border-gray-400 pb-1">
                    <div className="font-bold w-32">Invoice No. (发票号):</div>
                    <div className="flex-1 text-right">{invoiceNo}</div>
                  </div>
                  <div className="flex border-b border-gray-400 pb-1">
                    <div className="font-bold w-32">Date (日期):</div>
                    <div className="flex-1 text-right">{date}</div>
                  </div>
                  <div className="flex border-b border-gray-400 pb-1">
                    <div className="font-bold w-32">Currency (币种):</div>
                    <div className="flex-1 text-right font-bold text-black">{currency}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-8 border-collapse text-sm border border-black text-black relative z-10">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2 text-left">Description of Goods<br/><span className="text-xs font-normal">商品描述</span></th>
                    <th className="border border-black p-2 text-center w-24">HS Code<br/><span className="text-xs font-normal">海关编码</span></th>
                    <th className="border border-black p-2 text-center w-20">Qty<br/><span className="text-xs font-normal">数量</span></th>
                    <th className="border border-black p-2 text-right w-24">Unit Price<br/><span className="text-xs font-normal">单价</span></th>
                    <th className="border border-black p-2 text-right w-28">Total Value<br/><span className="text-xs font-normal">总价</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border border-black p-2">{item.description}</td>
                      <td className="border border-black p-2 text-center">{item.hsCode}</td>
                      <td className="border border-black p-2 text-center">{item.qty} {item.unit}</td>
                      <td className="border border-black p-2 text-right">{parseFloat(item.unitPrice).toFixed(2)}</td>
                      <td className="border border-black p-2 text-right">{parseFloat(item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                  {/* Fill empty rows if needed */}
                  {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td className="border border-black p-2 text-transparent">-</td>
                      <td className="border border-black p-2 text-transparent">-</td>
                      <td className="border border-black p-2 text-transparent">-</td>
                      <td className="border border-black p-2 text-transparent">-</td>
                      <td className="border border-black p-2 text-transparent">-</td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="font-bold text-base bg-gray-50">
                    <td className="border border-black p-3 text-right" colSpan={2}>TOTAL (总计):</td>
                    <td className="border border-black p-3 text-center">{totalQty}</td>
                    <td className="border border-black p-3 text-right"></td>
                    <td className="border border-black p-3 text-right text-black">{currency} {totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Footer */}
              <div className="text-sm text-black mb-12 relative z-10">
                <div className="font-bold mb-1">Declaration (声明):</div>
                <p className="text-gray-800 italic">{notes}</p>
              </div>
              
              <div className="flex justify-end relative z-10">
                <div className="flex flex-col items-center pt-8 w-64 relative">
                  <div className="w-full border-b border-black mb-2 relative z-10"></div>
                  <div className="font-bold text-center text-black relative z-10">Signature & Stamp<br/>(签名及盖章)</div>
                  
                  {/* Stamp */}
                  <div className="absolute top-[-20px] right-8 w-32 h-32 border-4 border-red-600 rounded-full opacity-90 flex items-center justify-center transform -rotate-12 pointer-events-none z-0">
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
        title="发票历史记录"
        renderItemContent={(record) => (
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-slate-500">发票号:</span> {record.invoiceNo}</div>
            <div><span className="text-slate-500">日期:</span> {record.date}</div>
            <div><span className="text-slate-500">收货人:</span> {record.consignee?.split('\n')[0]}</div>
            <div><span className="text-slate-500">总计:</span> {record.currency} {record.items?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)}</div>
          </div>
        )}
      />
    </div>
  );
}
