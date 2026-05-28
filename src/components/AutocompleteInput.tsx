import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  suggestions: string[];
  className?: string;
  disabled?: boolean;
}

export function AutocompleteInput({
  value,
  onChange,
  placeholder = '',
  required = false,
  suggestions = [],
  className = '',
  disabled = false,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clean suggestions to unique, non-empty, sorted values
  const uniqueSuggestions = React.useMemo(() => {
    return Array.from(new Set(suggestions))
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .sort((a, b) => a.localeCompare(b));
  }, [suggestions]);

  // Filter suggestions as soon as user types something (at least 1 letter)
  const filteredSuggestions = React.useMemo(() => {
    if (!value || value.trim().length === 0) {
      return [];
    }
    const cleanVal = value.toLowerCase().trim();
    return uniqueSuggestions.filter(s => 
      s.toLowerCase().includes(cleanVal) && 
      s.toLowerCase() !== cleanVal
    );
  }, [value, uniqueSuggestions]);

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show dropdown when filtered suggestions change and input is focused
  useEffect(() => {
    if (filteredSuggestions.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
    setActiveIndex(-1); // Reset keyboard navigation when suggestions change
  }, [filteredSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1 >= filteredSuggestions.length ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 < 0 ? filteredSuggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
        onChange(filteredSuggestions[activeIndex]);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        required={required}
        disabled={disabled}
        type="text"
        placeholder={placeholder}
        className={`${className} focus:ring-1 focus:ring-white/40 transition-all`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (filteredSuggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
      />
      
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#1e293b]/95 backdrop-blur-md shadow-2xl custom-scrollbar py-1">
          {filteredSuggestions.map((suggestion, index) => {
            const isSelected = index === activeIndex;
            return (
              <button
                key={suggestion}
                type="button"
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors text-white/90 font-light flex items-center gap-2
                  ${isSelected ? 'bg-white/15 text-white font-medium' : 'hover:bg-white/10 hover:text-white'}
                `}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-80" />
                <span>{suggestion}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
