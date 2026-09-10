import React from 'react';
import { Clock, Play, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { STATE_EXPLANATIONS } from '../../context/OrderContext';

export const StatusBadge = ({ status, showDetails = false }) => {
  const explanation = STATE_EXPLANATIONS[status] || '';

  const renderBadge = () => {
    switch (status) {
      case 'Pending Approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-mono font-medium bg-[#f0eee6] text-[#71695f] border border-[#d6d2c4]">
            <Clock size={12} className="text-[#8c8273] animate-pulse" />
            Pending Approval
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-mono font-medium bg-[#1a1714] text-[#ffffff] border border-[#2e2a25]">
            <Play size={12} className="text-[#e2b76c] fill-current" />
            In Progress
          </span>
        );
      case 'Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-mono font-medium bg-[#eae8ff] text-[#2c266b] border border-[#bebaf5]">
            <Eye size={12} className="text-[#4e44b8]" />
            Review Ready
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-mono font-medium bg-[#e7f4ea] text-[#1c5427] border border-[#b2ddb9]">
            <CheckCircle2 size={12} className="text-[#2e7d32]" />
            Completed & Delivered
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-mono font-medium bg-[#fde8e8] text-[#842020] border border-[#f5b8b8]">
            <XCircle size={12} className="text-[#b91c1c]" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-mono bg-[#edece7] text-[#444444]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="inline-flex flex-col gap-1">
      {renderBadge()}
      {showDetails && explanation && (
        <span className="text-[11px] text-[#766a7c] max-w-xs leading-tight">
          {explanation}
        </span>
      )}
    </div>
  );
};
