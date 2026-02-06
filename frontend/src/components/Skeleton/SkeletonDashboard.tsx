import React from 'react';
import { Skeleton } from './Skeleton';
import { SkeletonCard } from './SkeletonCard';

export const SkeletonStatCard: React.FC = () => {
  return (
    <div className="bg-bg-surface rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton width="60%" height={16} className="mb-2" />
          <Skeleton width="40%" height={32} className="mb-3" />
          <Skeleton width="50%" height={20} />
        </div>
        <Skeleton width={48} height={48} circle className="ml-4" />
      </div>
    </div>
  );
};

export const SkeletonChart: React.FC<{ height?: number }> = ({ height = 300 }) => {
  return (
    <div className="bg-bg-surface rounded-xl shadow-sm p-6">
      <Skeleton width="40%" height={24} className="mb-6" />
      <Skeleton width="100%" height={height} />
    </div>
  );
};

export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton width={200} height={32} className="mb-2" />
          <Skeleton width={300} height={20} />
        </div>
        <Skeleton width={140} height={36} />
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart height={280} />
        <SkeletonChart height={280} />
      </div>

      {/* Bottom Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonCard showHeader lines={3} className="lg:col-span-2" />
        <SkeletonCard showHeader lines={4} />
      </div>
    </div>
  );
};

export default SkeletonDashboard;
