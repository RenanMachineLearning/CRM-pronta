import React from 'react';
import { Skeleton } from './Skeleton';

export interface SkeletonFormProps {
  fields?: number;
  columns?: number;
  showButtons?: boolean;
  className?: string;
}

export const SkeletonForm: React.FC<SkeletonFormProps> = ({
  fields = 4,
  columns = 1,
  showButtons = true,
  className = '',
}) => {
  const rows = Math.ceil(fields / columns);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Form Fields */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className={`grid gap-6 ${
            columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {Array.from({ length: columns }).map((_, colIndex) => {
            const fieldIndex = rowIndex * columns + colIndex;
            if (fieldIndex >= fields) return null;

            return (
              <div key={`field-${fieldIndex}`} className="space-y-2">
                {/* Label */}
                <Skeleton width={80} height={16} />
                {/* Input */}
                <Skeleton width="100%" height={40} className="rounded" />
              </div>
            );
          })}
        </div>
      ))}

      {/* Buttons */}
      {showButtons && (
        <div className="flex justify-end space-x-3 pt-4">
          <Skeleton width={100} height={40} className="rounded" />
          <Skeleton width={120} height={40} className="rounded" />
        </div>
      )}
    </div>
  );
};

export default SkeletonForm;
