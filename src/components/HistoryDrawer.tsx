import React from 'react';
import { History, X, Download, Trash2, RefreshCw } from 'lucide-react';

interface HistoryDrawerProps<T> {
  isOpen: boolean;
  onClose: () => void;
  records: T[];
  onLoad: (record: T) => void;
  onDelete: (id: string) => void;
  onExport?: (record: T) => void;
  renderItemContent: (record: T) => React.ReactNode;
  title?: string;
}

export default function HistoryDrawer<T extends { id: string; createdAt: any }>({
  isOpen,
  onClose,
  records,
  onLoad,
  onDelete,
  onExport,
  renderItemContent,
  title = "历史记录"
}: HistoryDrawerProps<T>) {
  if (!isOpen) return null;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-800" /> {title}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {records.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <History className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p>暂无历史记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map(record => (
                <div key={record.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100">
                    <div className="text-sm text-slate-500 font-medium">
                      保存时间: {formatDate(record.createdAt)}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onLoad(record)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-sm font-medium transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> 载入
                      </button>
                      {onExport && (
                        <button 
                          onClick={() => onExport(record)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-sm font-medium transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> 导出
                        </button>
                      )}
                      <button 
                        onClick={() => onDelete(record.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-sm font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> 删除
                      </button>
                    </div>
                  </div>
                  
                  {/* Custom content for each record type */}
                  <div className="text-sm text-slate-700">
                    {renderItemContent(record)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
