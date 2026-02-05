import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Button } from './Button';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    confirmButton: 'danger' as const,
  },
  warning: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
    confirmButton: 'primary' as const,
  },
  info: {
    icon: InformationCircleIcon,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    confirmButton: 'primary' as const,
  },
  success: {
    icon: CheckCircleIcon,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-100',
    confirmButton: 'primary' as const,
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'info',
  isLoading = false,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-start">
                  {/* Ícone */}
                  <div
                    className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${config.iconBg} sm:mx-0 sm:h-10 sm:w-10`}
                  >
                    <Icon className={`h-6 w-6 ${config.iconColor}`} aria-hidden="true" />
                  </div>

                  {/* Conteúdo */}
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      {title}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{message}</p>
                    </div>
                  </div>
                </div>

                {/* Botões */}
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
                  <Button
                    variant={config.confirmButton}
                    onClick={handleConfirm}
                    isLoading={isLoading}
                    disabled={isLoading}
                    fullWidth
                    className="sm:w-auto"
                  >
                    {confirmText}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={isLoading}
                    fullWidth
                    className="mt-3 sm:mt-0 sm:w-auto"
                  >
                    {cancelText}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmDialog;