import React from 'react';

interface LocationInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({ 
  value, 
  onChange, 
  placeholder = "Search city...",
  className = "w-full bg-transparent focus:outline-none text-sm font-semibold text-ink placeholder:text-stone-300 placeholder:font-normal"
}) => {
  return (
    <div className="w-full">
      <input 
        type="text"
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
