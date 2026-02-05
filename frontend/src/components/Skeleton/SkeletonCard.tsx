import React from 'react';
import { Skeleton } from './Skeleton';

export interface SkeletonCardProps {
  showHeader?: boolean;
  showFooter?: boolean;
  lines?: number;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showHeader = true,
  showFooter = false,
  lines = 3,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-6 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton width={48} height={48} circle />
          <div className="flex-1">
            <Skeleton width="60%" height={20} className="mb-2" />
            <Skeleton width="40%" height={14} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={`line-${index}`}
            width={index === lines - 1 ? '60%' : '100%'}
            height={14}
          />
        ))}
      </div>

      {/* Footer */}
      {showFooter && (
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
          <Skeleton width={80} height={14} />
          <Skeleton width={100} height={32} className="rounded" />
        </div>
      )}
    </div>
  );
};

export default SkeletonCard;
