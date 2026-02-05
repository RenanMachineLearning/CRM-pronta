import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Button } from './Button';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'warning' | 'success' | 'info';
  buttonText?: string;
}

const typeConfig = {
  error: {
    icon: XCircleIcon,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    buttonVariant: 'danger' as const,
  },
  warning: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
    buttonVariant: 'primary' as const,
  },
  success: {
    icon: CheckCircleIcon,
    iconColor: 'text-green-600',
    iconBg: 'bg-green-100',
    buttonVariant: 'primary' as const,
  },
  info: {
    icon: InformationCircleIcon,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    buttonVariant: 'primary' as const,
  },
};

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = 'OK',
}) => {
  const config = typeConfig[type];
  const Icon = config.icon;

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
                <div className="flex flex-col items-center text-center">
                  {/* Ícone */}
                  <div
                    className={`flex items-center justify-center h-14 w-14 rounded-full ${config.iconBg} mb-4`}
                  >
                    <Icon className={`h-8 w-8 ${config.iconColor}`} aria-hidden="true" />
                  </div>

                  {/* Título */}
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 mb-2"
                  >
                    {title}
                  </Dialog.Title>

                  {/* Mensagem */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-500">{message}</p>
                  </div>

                  {/* Botão */}
                  <Button
                    variant={config.buttonVariant}
                    onClick={onClose}
                    fullWidth
                    className="sm:w-auto sm:min-w-[120px]"
                  >
                    {buttonText}
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

export default AlertDialog;