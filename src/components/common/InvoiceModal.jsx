import React from 'react';
import { Printer, X, Film } from 'lucide-react';

export const InvoiceModal = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" onClick={onClose}>
      <div 
        className="bg-[#1A1A1A] border border-white/15 rounded-[16px] max-w-2xl w-full p-8 text-[#FAFAF5] shadow-2xl relative" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[#00CDB8] text-[#111111] flex items-center justify-center font-mono font-bold text-xs">
              TP
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">TRIPHORIA INVOICE</h2>
              <p className="text-xs text-[#A1A1A6] font-mono">{order.invoiceNumber || `INV-${order.id}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={13} /> Print
            </button>
            <button 
              onClick={onClose}
              className="text-[#A1A1A6] hover:text-white p-1 text-lg leading-none cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="py-6 space-y-6">
          {/* Metadata Row */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-[#111111] p-5 rounded-[10px] border border-white/[0.06]">
            <div>
              <span className="text-[#6F7075] uppercase tracking-wider block text-[10px] font-mono mb-1">Billed To</span>
              <p className="font-semibold text-white text-sm">{order.customerName}</p>
              <p className="text-[#A1A1A6] font-mono">{order.customerEmail}</p>
            </div>
            <div>
              <span className="text-[#6F7075] uppercase tracking-wider block text-[10px] font-mono mb-1">Settlement Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30">
                &bull; {order.paymentStatus || 'Settled'}
              </span>
              <p className="text-[#6F7075] text-[11px] mt-1 font-mono">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#6F7075]">Production Scope</h4>
            <div className="bg-[#111111] border border-white/[0.08] rounded-[10px] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] text-[#6F7075] font-mono uppercase text-[10px] border-b border-white/[0.06]">
                  <tr>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5">Platform</th>
                    <th className="p-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-[#A1A1A6]">
                  <tr>
                    <td className="p-3.5 font-medium text-white">
                      {order.packageName} Post-Production
                      <span className="block text-[11px] text-[#6F7075] font-normal">
                        Project: {order.details?.projectName}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[#A1A1A6]">{order.details?.platform}</td>
                    <td className="p-3.5 text-right font-mono font-semibold text-white">${order.amount || 399}.00</td>
                  </tr>
                  <tr>
                    <td className="p-3.5 text-[#6F7075]">Color Conforming &amp; Broadcast Audio Master (-14 LUFS)</td>
                    <td className="p-3.5 font-mono text-[#6F7075]">Included</td>
                    <td className="p-3.5 text-right font-mono text-[#6F7075]">$0.00</td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-white/[0.02] p-4 border-t border-white/[0.06] flex justify-between items-center text-sm font-medium text-white">
                <span>Total Settled</span>
                <span className="text-lg font-mono font-bold text-[#00CDB8]">${order.amount || 399}.00 USD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#6F7075] font-mono">
          <span>TRIPHORIA POST-PRODUCTION &bull; ORDER {order.id}</span>
          <button 
            onClick={onClose}
            className="btn-primary py-2 px-5 text-xs font-semibold cursor-pointer"
          >
            Close document
          </button>
        </div>
      </div>
    </div>
  );
};
