'use client';

import { CheckCircle2, XCircle, Info } from 'lucide-react';

interface Props {
  message: string;
  type?: 'success' | 'error' | 'info';
}

const icons = {
  success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  error:   <XCircle className="w-4 h-4 text-red-500" />,
  info:    <Info className="w-4 h-4 text-blue-500" />,
};

const colors = {
  success: 'bg-white border-green-200',
  error:   'bg-white border-red-200',
  info:    'bg-white border-blue-200',
};

export default function Toast({ message, type = 'success' }: Props) {
  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium text-gray-800 max-w-xs w-max ${colors[type]} animate-in fade-in slide-in-from-top-2 duration-300`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  );
}
