
import React from 'react';

export const LoadingSpinner: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
      {text && <p className="text-slate-500">{text}</p>}
    </div>
  );
};
