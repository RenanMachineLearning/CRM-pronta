import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  circle = false,
  animate = true,
}) => {
  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  return (
    <div
      className={`
        bg-gray-200
        ${circle ? 'rounded-full' : 'rounded'}
        ${animate ? 'animate-pulse' : ''}
        ${className}
      `}
      style={style}
      aria-hidden="true"
    />
  );
};

export default Skeleton;
