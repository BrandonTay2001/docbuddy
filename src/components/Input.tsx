import type { ChangeEvent, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

const Input = ({
  label,
  error,
  fullWidth = false,
  className = '',
  id,
  onChange,
  ...rest
}: InputProps) => {
  const widthClass = fullWidth ? 'w-full' : '';
  const errorClass = error ? 'border-red-500 focus:ring-red-500' : '';
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
  
  return (
    <div className={`mb-4 ${widthClass}`}>
      {label && (
        <label htmlFor={inputId} className="block mb-2 text-sm font-medium">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`input ${widthClass} ${errorClass} ${className}`}
        onChange={onChange}
        {...rest}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default Input; 