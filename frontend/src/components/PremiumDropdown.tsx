"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export default function PremiumDropdown({
  value,
  onChange,
  options,
  placeholder,
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((option) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const label = option.label.toLowerCase();
    if (label.includes(term)) return true;

    // Helpful alias matches for universities
    if ((term === 'jntu' || term === 'jntua' || term === 'jntu-a') && label.includes('jawaharlal') && label.includes('anantapur')) return true;
    if ((term === 'jntuk' || term === 'jntu-k') && label.includes('jawaharlal') && label.includes('kakinada')) return true;
    if (term === 'svu' && label.includes('venkateswara')) return true;
    if (term === 'sku' && label.includes('krishnadevaraya')) return true;
    if (term === 'yvu' && label.includes('yogi vemana')) return true;
    if (term === 'anu' && label.includes('nagarjuna')) return true;
    if (term === 'aknu' && label.includes('nannaya')) return true;

    return false;
  });

  return (
    <div className={`relative ${isOpen ? 'z-[60]' : 'z-10'} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50/80 hover:border-gray-300 transition-all text-sm font-semibold text-gray-700 w-full min-w-[160px] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
      >
        <span className="truncate text-left" title={selectedOption ? selectedOption.label : placeholder}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`text-gray-400 transition-transform duration-300 ease-in-out flex-shrink-0 ${isOpen ? 'rotate-180 text-[#007aff]' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-[100] mt-2 min-w-full w-max max-w-[540px] left-0 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.15)] py-2 overflow-hidden ring-1 ring-black/[0.04]"
          >
            {options.length > 5 && (
              <div className="px-3 pb-2 pt-1 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50/90 rounded-lg border border-gray-200/80 focus-within:border-[#007aff] focus-within:ring-2 focus-within:ring-[#007aff]/10 transition-all">
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Type to filter..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 font-medium"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchTerm && (
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchTerm('');
                      }} 
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200/60"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-200 flex items-center justify-between group
                      ${value === option.value 
                        ? 'bg-[#007aff]/5 text-[#007aff] font-bold' 
                        : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900 font-medium'
                      }`}
                  >
                    <span className="truncate group-hover:translate-x-1 transition-transform duration-200">{option.label}</span>
                    {value === option.value && (
                      <Check size={16} className="text-[#007aff] flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-gray-400 text-center italic">
                  No matching options found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
