import React from 'react';

export type SkeletonEffect = 'pulse' | 'shimmer';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  animate?: boolean;
  effect?: SkeletonEffect;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  circle = false,
  animate = true,
  effect = 'pulse',
}) => {
  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  const getAnimationClasses = () => {
    if (!animate) return '';
    
    switch (effect) {
      case 'shimmer':
        return 'skeleton-shimmer';
      case 'pulse':
      default:
        return 'animate-pulse';
    }
  };

  return (
    <div
      className={`
        bg-bg-page
        ${circle ? 'rounded-full' : 'rounded'}
        ${getAnimationClasses()}
        ${className}
      `}
      style={style}
      aria-hidden="true"
    />
  );
};

export default Skeleton;
