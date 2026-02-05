/**
 * Página de Esqueci Minha Senha
 * Design profissional
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ErrorMessage } from '../components/ErrorMessage';
import { EnvelopeIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await forgotPassword({ email });
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado Esquerdo - Formulário */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Voltar */}
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-8"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Voltar para login
          </Link>

          {/* Logo */}
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="ml-3 text-2xl font-bold text-gray-900">CRM SaaS</span>
          </div>

          {isSuccess ? (
            // Estado de Sucesso
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email enviado!
              </h2>
              <p className="text-gray-600 mb-6">
                Verifique sua caixa de entrada em <strong>{email}</strong> para instruções de recuperação de senha.
              </p>
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Voltar para login
              </Link>
            </div>
          ) : (
            // Formulário
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">
                  Esqueceu a senha?
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Não se preocupe! Informe seu email e enviaremos instruções para recuperar sua conta.
                </p>
              </div>

              {/* Erro */}
              {error && (
                <div className="mb-6">
                  <ErrorMessage message={error} />
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  Enviar instruções
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Lado Direito - Decoração */}
      <div className="hidden lg:block relative flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        {/* Padrão decorativo */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        {/* Conteúdo */}
        <div className="absolute inset-0 flex items-center justify-center px-12">
          <div className="max-w-lg text-center text-white">
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>

            <h3 className="text-3xl font-bold mb-4">
              Recupere sua conta
            </h3>
            <p className="text-lg text-blue-100">
              Sua segurança é nossa prioridade. Siga as instruções enviadas por email para redefinir sua senha de forma segura.
            </p>
          </div>
        </div>

        {/* Elementos decorativos */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
