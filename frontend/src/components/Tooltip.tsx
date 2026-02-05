/**
 * Componente Tooltip
 * Tooltip acessível usando Radix UI
 */

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  delayDuration?: number;
  disabled?: boolean;
}

const TooltipProvider = TooltipPrimitive.Provider;

const TooltipRoot = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={`
      z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white
      shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out
      data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
      data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2
      data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2
      ${className}
    `}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  sideOffset = 4,
  delayDuration = 200,
  disabled = false,
}: TooltipProps) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align} sideOffset={sideOffset}>
          {content}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}

export default Tooltip;
