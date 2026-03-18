import React, { useState, useEffect, useRef } from 'react';
import { db, auth, signIn, logOut } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Package, Calculator, History, Image as ImageIcon, Trash2, Plus, LogIn, LogOut, Save, X, Download, ClipboardPaste } from 'lucide-react';

type Mode = 'express' | 'freight';

interface RowData {
  id: string;
  l: string;
  w: string;
  h: string;
  qty: string;
  weight: string;
}

interface MeasurementRecord {
  id: string;
  userId: string;
  length: number;
  width: number;
  height: number;
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  mode: Mode;
  createdAt: any;
}

export default function VolumeCalculator() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<Mode>('express');
  const [divisor, setDivisor] = useState<number>(5000);
  const [cbmRatio, setCbmRatio] = useState<number>(167);
  const [freightPricingMethod, setFreightPricingMethod] = useState<'cbm' | 'kg'>('cbm');
  const [rows, setRows] = useState<RowData[]>([{ id: Date.now().toString(), l: '', w: '', h: '', qty: '1', weight: '' }]);
  const [trackingNo, setTrackingNo] = useState('');
  
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [insuranceFee, setInsuranceFee] = useState<string>('');
  const [overLengthFee, setOverLengthFee] = useState<string>('');
  const [overWeightFee, setOverWeightFee] = useState<string>('');
  const [remoteFee, setRemoteFee] = useState<string>('');
  
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<MeasurementRecord[]>([]);
  
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageRow, setImageRow] = useState<RowData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && showHistory) {
      const q = query(collection(db, `users/${user.uid}/measurements`), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const records: MeasurementRecord[] = [];
        snapshot.forEach((doc) => {
          records.push({ id: doc.id, ...doc.data() } as MeasurementRecord);
        });
        setHistory(records);
      }, (error) => {
        console.error("Error fetching history:", error);
      });
      return () => unsubscribe();
    }
  }, [user, showHistory]);

  const addRow = () => {
    setRows([...rows, { id: Date.now().toString(), l: '', w: '', h: '', qty: '1', weight: '' }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    } else {
      setRows([{ id: Date.now().toString(), l: '', w: '', h: '', qty: '1', weight: '' }]);
    }
  };

  const updateRow = (id: string, field: keyof RowData, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const clearRows = () => {
    setRows([{ id: Date.now().toString(), l: '', w: '', h: '', qty: '1', weight: '' }]);
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    
    const lines = bulkText.split('\n');
    const newRows: RowData[] = [];
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      const nums = line.match(/\d+(\.\d+)?/g);
      if (nums && nums.length >= 3) {
        let l = nums[0];
        let w = nums[1];
        let h = nums[2];
        let qty = '1';
        let weight = '';
        
        const weightMatch = line.match(/(\d+(?:\.\d+)?)\s*(kg|千克|公斤|重)/i);
        const qtyMatch = line.match(/(\d+)\s*(件|箱|ctn|pcs)/i);
        
        if (weightMatch) weight = weightMatch[1];
        if (qtyMatch) qty = qtyMatch[1];
        
        if (!weightMatch && !qtyMatch) {
            if (nums.length === 4) {
                if (nums[3].includes('.')) weight = nums[3];
                else qty = nums[3];
            } else if (nums.length >= 5) {
                qty = nums[3];
                weight = nums[4];
            }
        }
        
        newRows.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          l, w, h, qty, weight
        });
      }
    });
    
    if (newRows.length > 0) {
      if (rows.length === 1 && !rows[0].l && !rows[0].w && !rows[0].h && !rows[0].weight) {
        setRows(newRows);
      } else {
        setRows([...rows, ...newRows]);
      }
      setShowBulkModal(false);
      setBulkText('');
    } else {
      alert('未能识别到有效的尺寸数据，请检查格式。(No valid dimensions found)');
    }
  };

  const calculateTotals = () => {
    let totalVolWeight = 0;
    let totalActualWeight = 0;
    let totalCBM = 0;
    let totalCtns = 0;

    rows.forEach(row => {
      const l = parseFloat(row.l) || 0;
      const w = parseFloat(row.w) || 0;
      const h = parseFloat(row.h) || 0;
      const qty = parseFloat(row.qty) || 0;
      const weightPerCtn = parseFloat(row.weight) || 0;

      const rowVolumeCm3 = l * w * h * qty;
      const rowActualWeight = weightPerCtn * qty;

      totalCtns += qty;
      totalActualWeight += rowActualWeight;
      totalCBM += rowVolumeCm3 / 1000000;

      if (mode === 'express') {
        totalVolWeight += rowVolumeCm3 / divisor;
      }
    });

    if (mode === 'freight') {
      totalVolWeight = totalCBM * cbmRatio;
    }

    const chargeableWeight = Math.max(totalActualWeight, totalVolWeight);
    
    let baseFreightCost = 0;
    if (mode === 'express' || (mode === 'freight' && freightPricingMethod === 'kg')) {
      baseFreightCost = chargeableWeight * (parseFloat(unitPrice) || 0);
    } else {
      baseFreightCost = totalCBM * (parseFloat(unitPrice) || 0);
    }

    const finalCost = baseFreightCost +
                      (parseFloat(insuranceFee) || 0) +
                      (parseFloat(overLengthFee) || 0) +
                      (parseFloat(overWeightFee) || 0) +
                      (parseFloat(remoteFee) || 0);

    return { totalCtns, totalActualWeight, totalVolWeight, totalCBM, chargeableWeight, finalCost };
  };

  const totals = calculateTotals();

  const saveRecord = async () => {
    if (!user) {
      alert("请先登录！(Please login first)");
      return;
    }
    
    try {
      for (const row of rows) {
        const l = parseFloat(row.l) || 0;
        const w = parseFloat(row.w) || 0;
        const h = parseFloat(row.h) || 0;
        const qty = parseFloat(row.qty) || 0;
        const weightPerCtn = parseFloat(row.weight) || 0;
        
        if (l === 0 && w === 0 && h === 0 && weightPerCtn === 0) continue;

        const rowVolumeCm3 = l * w * h;
        let volWeight = 0;
        if (mode === 'express') {
          volWeight = rowVolumeCm3 / divisor;
        } else {
          volWeight = (rowVolumeCm3 / 1000000) * cbmRatio;
        }
        
        const chargeableWeight = Math.max(weightPerCtn, volWeight);

        await addDoc(collection(db, `users/${user.uid}/measurements`), {
          userId: user.uid,
          length: l,
          width: w,
          height: h,
          actualWeight: weightPerCtn,
          volumetricWeight: volWeight,
          chargeableWeight: chargeableWeight,
          mode: mode,
          createdAt: serverTimestamp()
        });
      }
      alert("记录保存成功！(Records saved successfully!)");
    } catch (error) {
      console.error("Error saving record:", error);
      alert("保存失败 (Save failed)");
    }
  };

  const deleteRecord = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/measurements`, id));
    } catch (error) {
      console.error("Error deleting record:", error);
    }
  };

  const openImageModal = (row: RowData) => {
    setImageRow(row);
    setShowImageModal(true);
  };

  useEffect(() => {
    if (showImageModal && imageRow && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const length = parseFloat(imageRow.l) || 0;
      const width = parseFloat(imageRow.w) || 0;
      const height = parseFloat(imageRow.h) || 0;
      const weight = parseFloat(imageRow.weight) || 0;

      const w = canvas.width = 800;
      const h = canvas.height = 800;

      // Background
      ctx.fillStyle = '#3b5998';
      ctx.fillRect(0, 0, w, h);

      // Top Bar
      const barH = 120;
      const colW = w / 4;
      
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(0, 0, colW - 2, barH);
      ctx.fillStyle = '#8e44ad';
      ctx.fillRect(colW, 0, colW - 2, barH);
      ctx.fillRect(colW * 2, 0, colW - 2, barH);
      ctx.fillRect(colW * 3, 0, colW, barH);

      ctx.fillStyle = 'white';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('重量', 10, 30);
      ctx.fillText('长', colW + 10, 30);
      ctx.fillText('宽', colW * 2 + 10, 30);
      ctx.fillText('高', colW * 3 + 10, 30);

      ctx.font = 'bold 60px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(weight.toFixed(2), colW - 40, 90);
      ctx.fillText(length.toString(), colW * 2 - 40, 90);
      ctx.fillText(width.toString(), colW * 3 - 40, 90);
      ctx.fillText(height.toString(), colW * 4 - 40, 90);

      ctx.font = '20px sans-serif';
      ctx.fillText('kg', colW - 10, 90);
      ctx.fillText('cm', colW * 2 - 10, 90);
      ctx.fillText('cm', colW * 3 - 10, 90);
      ctx.fillText('cm', colW * 4 - 10, 90);

      // Main Area Texts
      ctx.textAlign = 'left';
      ctx.font = '24px sans-serif';
      ctx.fillText('俯视图', 10, barH + 30);
      
      const now = new Date();
      const dateStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
      ctx.textAlign = 'right';
      ctx.fillText(dateStr, w - 10, barH + 30);

      // Draw Box
      ctx.save();
      ctx.translate(w / 2, barH + (h - barH) / 2);
      ctx.rotate(-10 * Math.PI / 180);

      const maxDim = Math.max(length, width);
      const scale = maxDim > 0 ? 400 / maxDim : 1;
      const boxW = length * scale;
      const boxH = width * scale;

      ctx.fillStyle = 'white';
      ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);

      ctx.strokeStyle = '#ff9800';
      ctx.lineWidth = 4;
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

      ctx.strokeStyle = 'white';
      ctx.fillStyle = 'white';
      ctx.lineWidth = 2;
      ctx.textBaseline = 'bottom';

      // Top Ruler
      ctx.beginPath();
      ctx.moveTo(-boxW / 2, -boxH / 2 - 20);
      ctx.lineTo(boxW / 2, -boxH / 2 - 20);
      ctx.stroke();
      
      ctx.textAlign = 'center';
      for (let i = 0; i <= 10; i++) {
          const x = -boxW / 2 + (boxW / 10) * i;
          const tickH = (i % 5 === 0) ? 15 : 8;
          ctx.beginPath();
          ctx.moveTo(x, -boxH / 2 - 20);
          ctx.lineTo(x, -boxH / 2 - 20 - tickH);
          ctx.stroke();
          if (i === 0) {
              ctx.font = '20px sans-serif';
              ctx.fillText('0', x, -boxH / 2 - 40);
          } else if (i === 5) {
              ctx.font = '20px sans-serif';
              ctx.fillText(Math.round(length / 2).toString(), x, -boxH / 2 - 40);
          } else if (i === 10) {
              ctx.font = '20px sans-serif';
              ctx.fillText(length.toString(), x, -boxH / 2 - 40);
          }
      }
      ctx.font = 'bold 60px sans-serif';
      ctx.fillText(length.toString(), 0, -boxH / 2 - 70);

      // Left Ruler
      ctx.beginPath();
      ctx.moveTo(-boxW / 2 - 20, -boxH / 2);
      ctx.lineTo(-boxW / 2 - 20, boxH / 2);
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= 10; i++) {
          const y = boxH / 2 - (boxH / 10) * i;
          const tickW = (i % 5 === 0) ? 15 : 8;
          ctx.beginPath();
          ctx.moveTo(-boxW / 2 - 20, y);
          ctx.lineTo(-boxW / 2 - 20 - tickW, y);
          ctx.stroke();
          if (i === 0) {
              ctx.font = '20px sans-serif';
              ctx.fillText('0', -boxW / 2 - 40, y);
          } else if (i === 5) {
              ctx.font = '20px sans-serif';
              ctx.fillText(Math.round(width / 2).toString(), -boxW / 2 - 40, y);
          } else if (i === 10) {
              ctx.font = '20px sans-serif';
              ctx.fillText(width.toString(), -boxW / 2 - 40, y);
          }
      }
      
      ctx.save();
      ctx.translate(-boxW / 2 - 70, 0);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.font = 'bold 60px sans-serif';
      ctx.fillText(width.toString(), 0, 0);
      ctx.restore();

      ctx.restore();

      // Tracking Number
      if (trackingNo) {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`单号: ${trackingNo}`, w - 20, h - 20);
      }
    }
  }, [showImageModal, imageRow, trackingNo]);

  const downloadImage = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `volume-weight-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Header */}
        <header className="lg:col-span-12 bg-white p-4 md:p-6 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-slate-800" />
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              集运巴巴物流智能计费系统
              <span className="bg-slate-800 text-white text-xs px-2 py-1 rounded-full font-normal">Pro</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistory(true)} className="flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
              <History className="w-4 h-4" /> 历史记录
            </button>
          </div>
        </header>

        {/* Main Calculator */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button 
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors relative ${mode === 'express' ? 'text-slate-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setMode('express')}
            >
              ✈️ 快递/空派 (体积重)
              {mode === 'express' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-600" />}
            </button>
            <button 
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors relative ${mode === 'freight' ? 'text-slate-600 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setMode('freight')}
            >
              🚢 海运/大货 (CBM)
              {mode === 'freight' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-600" />}
            </button>
          </div>

          <div className="p-6 flex-1">
            <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100 flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-slate-600 mb-1">运单号 (Tracking No.)</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-300 rounded-md font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-slate-500 outline-none"
                  placeholder="输入单号 (选填)"
                  value={trackingNo}
                  onChange={(e) => setTrackingNo(e.target.value)}
                />
              </div>
              {mode === 'express' ? (
                <>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm text-slate-600 mb-1">体积除数 (Divisor)</label>
                    <select 
                      className="w-full p-2 border border-slate-300 rounded-md font-semibold text-slate-700 bg-white"
                      value={divisor}
                      onChange={(e) => setDivisor(Number(e.target.value))}
                    >
                      <option value="5000">5000 (国际快递标准)</option>
                      <option value="6000">6000 (空派/专线)</option>
                      <option value="4000">4000 (特殊/EMS)</option>
                    </select>
                  </div>
                  <div className="flex-[2] min-w-[200px]">
                    <label className="block text-sm text-slate-600 mb-1">当前公式说明</label>
                    <div className="text-sm text-slate-500 mt-1">
                      长(cm) × 宽(cm) × 高(cm) ÷ <span className="font-bold text-slate-700">{divisor}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm text-slate-600 mb-1">计价方式</label>
                    <select 
                      className="w-full p-2 border border-slate-300 rounded-md font-semibold text-slate-700 bg-white"
                      value={freightPricingMethod}
                      onChange={(e) => setFreightPricingMethod(e.target.value as 'cbm' | 'kg')}
                    >
                      <option value="cbm">按体积 (CBM)</option>
                      <option value="kg">按重量 (KG)</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-sm text-slate-600 mb-1">海运/大货比率 (1 CBM : KG)</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border border-slate-300 rounded-md font-semibold text-slate-700 bg-white"
                      value={cbmRatio}
                      onChange={(e) => setCbmRatio(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm text-slate-600 mb-1">常见比率参考</label>
                    <div className="text-sm text-slate-500 mt-1">
                      海运 1:167 | 铁路 1:500 | 卡派 1:363
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full min-w-[600px] text-left border-collapse">
                <thead>
                  <tr>
                    <th className="pb-3 text-sm font-medium text-slate-500 border-b-2 border-slate-200">长 (cm)</th>
                    <th className="pb-3 text-sm font-medium text-slate-500 border-b-2 border-slate-200">宽 (cm)</th>
                    <th className="pb-3 text-sm font-medium text-slate-500 border-b-2 border-slate-200">高 (cm)</th>
                    <th className="pb-3 text-sm font-medium text-slate-500 border-b-2 border-slate-200">箱数</th>
                    <th className="pb-3 text-sm font-medium text-slate-500 border-b-2 border-slate-200">单箱实重(kg)</th>
                    <th className="pb-3 text-sm font-medium text-slate-500 border-b-2 border-slate-200 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-2"><input type="number" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all font-mono" placeholder="0" value={row.l} onChange={(e) => updateRow(row.id, 'l', e.target.value)} /></td>
                      <td className="py-2 pr-2"><input type="number" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all font-mono" placeholder="0" value={row.w} onChange={(e) => updateRow(row.id, 'w', e.target.value)} /></td>
                      <td className="py-2 pr-2"><input type="number" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all font-mono" placeholder="0" value={row.h} onChange={(e) => updateRow(row.id, 'h', e.target.value)} /></td>
                      <td className="py-2 pr-2"><input type="number" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all font-mono" placeholder="1" value={row.qty} onChange={(e) => updateRow(row.id, 'qty', e.target.value)} /></td>
                      <td className="py-2 pr-2"><input type="number" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all font-mono" placeholder="0" value={row.weight} onChange={(e) => updateRow(row.id, 'weight', e.target.value)} /></td>
                      <td className="py-2 flex items-center justify-center gap-2">
                        <button onClick={() => openImageModal(row)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-md transition-colors" title="过机体积重量图">
                          <ImageIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => removeRow(row.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="删除">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex gap-3">
                <button onClick={addRow} className="flex items-center gap-1 px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-md font-medium transition-colors">
                  <Plus className="w-4 h-4" /> 增加规格
                </button>
                <button onClick={() => setShowBulkModal(true)} className="flex items-center gap-1 px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-md font-medium transition-colors">
                  <ClipboardPaste className="w-4 h-4" /> 批量导入
                </button>
                <button onClick={clearRows} className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-md font-medium transition-colors">
                  清空
                </button>
              </div>
            </div>

            {/* Billing Settings */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-slate-600" /> 计费设置 (选填)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    单价 ({mode === 'freight' && freightPricingMethod === 'cbm' ? '元/CBM' : '元/计费重'})
                  </label>
                  <input type="number" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all" placeholder="0.00" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">附加费: 保险费</label>
                  <input type="number" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all" placeholder="0.00" value={insuranceFee} onChange={(e) => setInsuranceFee(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">附加费: 超长费</label>
                  <input type="number" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all" placeholder="0.00" value={overLengthFee} onChange={(e) => setOverLengthFee(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">附加费: 超重费</label>
                  <input type="number" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all" placeholder="0.00" value={overWeightFee} onChange={(e) => setOverWeightFee(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">附加费: 偏远费</label>
                  <input type="number" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all" placeholder="0.00" value={remoteFee} onChange={(e) => setRemoteFee(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="bg-slate-800 text-white rounded-xl p-6 grid grid-cols-2 lg:grid-cols-6 gap-6">
              {mode === 'express' ? (
                <>
                  <div className="lg:col-span-1">
                    <h4 className="text-xs text-slate-400 mb-1">总件数 (Ctns)</h4>
                    <div className="text-2xl font-bold">{totals.totalCtns.toLocaleString('en-US')}</div>
                  </div>
                  <div className="lg:col-span-1">
                    <h4 className="text-xs text-slate-400 mb-1">总实重 (GW)</h4>
                    <div className="text-2xl font-bold">{totals.totalActualWeight.toLocaleString('en-US', { maximumFractionDigits: 3 })}<span className="text-sm font-normal text-slate-400 ml-1">kg</span></div>
                  </div>
                  <div className="lg:col-span-1">
                    <h4 className="text-xs text-slate-400 mb-1">体积重 (VW)</h4>
                    <div className="text-2xl font-bold">{totals.totalVolWeight.toLocaleString('en-US', { maximumFractionDigits: 3 })}<span className="text-sm font-normal text-slate-400 ml-1">kg</span></div>
                  </div>
                  <div className="border-l border-slate-600 pl-6 lg:col-span-1">
                    <h4 className="text-xs text-amber-400 mb-1">最终计费重</h4>
                    <div className="text-2xl font-bold text-amber-400">{totals.chargeableWeight.toLocaleString('en-US', { maximumFractionDigits: 3 })}<span className="text-sm font-normal opacity-80 ml-1">kg</span></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="lg:col-span-1">
                    <h4 className="text-xs text-amber-400 mb-1">总体积 (Volume)</h4>
                    <div className="text-2xl font-bold text-amber-400">{totals.totalCBM.toLocaleString('en-US', { maximumFractionDigits: 3 })}<span className="text-sm font-normal opacity-80 ml-1">CBM</span></div>
                  </div>
                  <div className="lg:col-span-1">
                    <h4 className="text-xs text-slate-400 mb-1">总实重 (GW)</h4>
                    <div className="text-2xl font-bold">{totals.totalActualWeight.toLocaleString('en-US', { maximumFractionDigits: 3 })}<span className="text-sm font-normal text-slate-400 ml-1">kg</span></div>
                  </div>
                  <div className="lg:col-span-1">
                    <h4 className="text-xs text-slate-400 mb-1">折算计费重</h4>
                    <div className="text-2xl font-bold">{totals.totalVolWeight.toLocaleString('en-US', { maximumFractionDigits: 3 })}<span className="text-sm font-normal text-slate-400 ml-1">kg</span></div>
                  </div>
                  <div className="border-l border-slate-600 pl-6 lg:col-span-1">
                    <h4 className="text-xs text-slate-400 mb-1">实际货重比</h4>
                    <div className="text-xl font-bold">1:{totals.totalCBM > 0 ? (totals.totalActualWeight / totals.totalCBM).toFixed(0) : 0}</div>
                    <div className="text-xs text-slate-500 mt-1">(标准为 1:{cbmRatio})</div>
                  </div>
                </>
              )}
              <div className="border-l border-slate-600 pl-6 col-span-2 lg:col-span-2 overflow-hidden flex flex-col justify-center">
                <h4 className="text-xs text-slate-400 mb-1">最终运费 (预估)</h4>
                <div 
                  className="text-2xl md:text-3xl font-bold text-slate-400 break-all leading-tight" 
                  title={`¥${totals.finalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                >
                  ¥{totals.finalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-sm p-6 h-fit">
          <h2 className="text-lg font-bold text-slate-800 border-b-2 border-slate-100 pb-4 mb-6">📚 实用物流知识库</h2>
          
          <div className="mb-6">
            <h3 className="text-slate-700 font-semibold mb-2 flex items-center gap-2"><Calculator className="w-4 h-4" /> 体积重计算原理</h3>
            <p className="text-sm text-slate-600 mb-2">飞机/货车的装载空间有限。当货物密度较小（如棉花、泡沫）时，物流商会按其占用的体积空间折算成重量收费，即<b>“抛货”</b>。</p>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-sm text-amber-800 rounded-r-md">
              公式：体积重 = (长×宽×高) ÷ 除数<br/>
              计费重 = 实重与体积重取<b>大</b>者
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-slate-700 font-semibold mb-2">📏 尺寸测量指南</h3>
            <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
              <li><b>鼓包测量：</b>如果纸箱因装货鼓起，必须测量<b>最凸出</b>的点，而非边缘。</li>
              <li><b>进位规则：</b>国际快递通常以 0.5cm 或 1cm 为单位进位（例：20.3cm 计为 21cm）。</li>
              <li><b>叠放误差：</b>多个箱子堆叠测量时，由于缝隙存在，总尺寸往往大于单箱尺寸之和。</li>
            </ul>
          </div>

          <div>
            <h3 className="text-slate-700 font-semibold mb-2">🌐 各国/渠道除数标准</h3>
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-2 font-medium text-slate-600">渠道类型</th>
                  <th className="p-2 font-medium text-slate-600">常见除数</th>
                  <th className="p-2 font-medium text-slate-600">适用场景</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr className="border-b border-slate-100">
                  <td className="p-2">国际快递</td><td className="p-2">5000</td><td className="p-2">DHL, UPS, FedEx</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-2">空运/专线</td><td className="p-2">6000</td><td className="p-2">空派包税, 专线渠道</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-2">国内/铁路</td><td className="p-2">6000/7000</td><td className="p-2">国内快运, 中欧班列</td>
                </tr>
                <tr>
                  <td className="p-2">特殊渠道</td><td className="p-2">4000/8000</td><td className="p-2">部分EMS或超大件</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Action Bar for Login / Save */}
        <div className="lg:col-span-12 mt-4">
          {!user ? (
            <button onClick={signIn} className="w-full py-4 bg-slate-800 text-white rounded-xl hover:bg-slate-700 flex items-center justify-center gap-2 text-lg font-medium transition-colors shadow-md">
              <LogIn className="w-5 h-5" /> 登录账号，开启云端同步保存功能
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <button onClick={saveRecord} className="w-full py-4 bg-slate-600 text-white rounded-xl hover:bg-slate-700 flex items-center justify-center gap-2 text-lg font-medium transition-colors shadow-md">
                <Save className="w-5 h-5" /> 保存当前计算记录到云端
              </button>
              <div className="flex justify-between items-center text-sm text-slate-500 px-2">
                <span>当前登录账号: {user.email}</span>
                <button onClick={logOut} className="hover:text-slate-800 flex items-center gap-1 transition-colors">
                  <LogOut className="w-4 h-4" /> 退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-slate-800" /> 历史记录</h2>
              <button onClick={() => setShowHistory(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-500">暂无保存的记录</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-sm text-slate-600">
                      <th className="p-3">时间</th>
                      <th className="p-3">模式</th>
                      <th className="p-3">尺寸 (L×W×H)</th>
                      <th className="p-3">实重</th>
                      <th className="p-3">体积重</th>
                      <th className="p-3">计费重</th>
                      <th className="p-3 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {history.map(record => (
                      <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 text-slate-500">{record.createdAt?.toDate?.()?.toLocaleString() || '刚刚'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${record.mode === 'express' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'}`}>
                            {record.mode === 'express' ? '快递' : '海运'}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{record.length} × {record.width} × {record.height}</td>
                        <td className="p-3">{record.actualWeight} kg</td>
                        <td className="p-3">{record.volumetricWeight.toFixed(2)} kg</td>
                        <td className="p-3 font-bold text-amber-600">{record.chargeableWeight.toFixed(2)} kg</td>
                        <td className="p-3 text-center">
                          <button onClick={() => deleteRecord(record.id)} className="text-red-500 hover:text-red-700 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ClipboardPaste className="w-5 h-5 text-slate-600" /> 批量导入尺寸</h2>
              <button onClick={() => setShowBulkModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1">
              <div className="mb-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="font-semibold mb-1">支持智能识别多种格式，每行一条数据：</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-500">
                  <li>纯数字：<code className="bg-white px-1 rounded">50*40*30</code> 或 <code className="bg-white px-1 rounded">50 40 30</code></li>
                  <li>带箱数：<code className="bg-white px-1 rounded">50*40*30 2箱</code> 或 <code className="bg-white px-1 rounded">50*40*30*2</code></li>
                  <li>带重量：<code className="bg-white px-1 rounded">50*40*30 15kg</code></li>
                  <li>完整版：<code className="bg-white px-1 rounded">50*40*30 2件 15.5kg</code></li>
                </ul>
              </div>
              <textarea
                className="w-full h-64 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none resize-none font-mono text-sm"
                placeholder="在此粘贴您的数据...&#10;50*40*30&#10;60x50x40 2件 15kg&#10;45 45 45 3 12.5"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              ></textarea>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium">
                取消
              </button>
              <button onClick={handleBulkImport} className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm">
                解析并导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Generation Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-slate-800" /> 过机体积重量图</h2>
              <button onClick={() => setShowImageModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center bg-slate-200">
              <div className="bg-white p-2 rounded-lg shadow-md max-w-full overflow-hidden">
                <canvas ref={canvasRef} className="w-full max-w-[500px] h-auto border border-slate-300 rounded" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setShowImageModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium">
                取消
              </button>
              <button onClick={downloadImage} className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm">
                <Download className="w-4 h-4" /> 保存图片
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
