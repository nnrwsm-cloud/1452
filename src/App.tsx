import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Workspace from './pages/Workspace';
import VolumeCalculator from './pages/VolumeCalculator';
import PaymentReceipt from './pages/PaymentReceipt';
import WarehouseReceipt from './pages/WarehouseReceipt';
import DeliveryNote from './pages/DeliveryNote';
import DebitNote from './pages/DebitNote';
import ProformaInvoice from './pages/ProformaInvoice';
import Quotation from './pages/Quotation';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Workspace />} />
          <Route path="calculator" element={<VolumeCalculator />} />
        <Route path="payment-receipt" element={<PaymentReceipt />} />
        <Route path="warehouse-receipt" element={<WarehouseReceipt />} />
        <Route path="delivery-note" element={<DeliveryNote />} />
        <Route path="debit-note" element={<DebitNote />} />
        <Route path="invoice" element={<ProformaInvoice />} />
          <Route path="quotation" element={<Quotation />} />
          <Route path="reconciliation" element={<div className="p-8 text-center text-slate-500">财务对账模块开发中...</div>} />
          <Route path="labels" element={<div className="p-8 text-center text-slate-500">标签打印模块开发中...</div>} />
          <Route path="sop" element={<div className="p-8 text-center text-slate-500">全能导演SOP模块开发中...</div>} />
          <Route path="batch-order" element={<div className="p-8 text-center text-slate-500">批量录单模块开发中...</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
