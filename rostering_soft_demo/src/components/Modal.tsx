'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:items-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-white border border-border rounded-[32px] shadow-2xl w-full max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto my-4 sm:my-0 flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b border-border flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 sm:px-8 py-6 sm:py-8 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="px-6 sm:px-8 py-4 sm:py-5 border-t border-border flex-shrink-0 bg-white rounded-b-[32px]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
