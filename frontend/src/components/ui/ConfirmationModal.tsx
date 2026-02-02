'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import HardShadowCard from './HardShadowCard';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmationModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <HardShadowCard className="relative w-full max-w-md p-6 z-[101] shadow-[8px_8px_0px_#000]">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-void-black hover:text-hot-pink transition-colors"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Title */}
        <h2 className="font-headline text-2xl uppercase mb-4 pr-8">
          {title}
        </h2>

        {/* Message */}
        <p className="font-display text-base mb-6 text-gray-700">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-stark-white border-2 border-black px-6 py-3 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-200 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 ${
              isDestructive ? 'bg-hot-pink' : 'bg-acid-lime'
            } border-2 border-black px-6 py-3 font-display font-bold uppercase shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-200 cursor-pointer`}
          >
            {confirmText}
          </button>
        </div>
      </HardShadowCard>
    </div>
  );
}
