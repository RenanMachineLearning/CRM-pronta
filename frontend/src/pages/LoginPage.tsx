/**
 * Página de Login - Design Moderno e Profissional
 * 
 * Melhorias implementadas:
 * - Layout centralizado com card elegante
 * - Contraste adequado nos inputs (texto escuro)
 * - Fundo gradiente moderno
 * - Glassmorphism no card
 * - Ícones e elementos visuais aprimorados
 * - Animações suaves
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ErrorMessage } from '../components/ErrorMessage';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  EnvelopeIcon, 
  LockClosedIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Obtém a URL de origem para redirecionar após login
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(formData);
      // Redireciona para a página original ou dashboard
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      {/* Padrão de fundo decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500 rounded-full mix-blend-overlay filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Container principal */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row gap-8 items-center justify-center">
        
        {/* Lado Esquerdo - Informações (apenas desktop) */}
        <div className="hidden lg:flex flex-col items-center lg:items-start text-white max-w-md space-y-8">
          {/* Logo grande */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/50">
              <ShieldCheckIcon className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                CRM SaaS
              </h1>
              <p className="text-blue-200 text-sm">Gestão de Relacionamento</p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0">
                <UserGroupIcon className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">Gestão de Contatos</h3>
                <p className="text-blue-200 text-sm leading-relaxed">
                  Organize todos os seus contatos e empresas em um só lugar com facilidade.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0">
                <ChartBarIcon className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-white">Pipeline de Vendas</h3>
                <p className="text-blue-200 text-sm leading-relaxed">
                  Acompanhe leads e oportunidades em um pipeline visual e intuitivo.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex space-x-8 pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">10k+</div>
              <div className="text-blue-300 text-sm">Contatos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-blue-300 text-sm">Empresas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">98%</div>
              <div className="text-blue-300 text-sm">Satisfação</div>
            </div>
          </div>
        </div>

        {/* Card de Login */}
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 lg:p-10 border border-white/20">
            {/* Header do card */}
            <div className="text-center mb-8">
              {/* Ícone/Logo (mobile) */}
              <div className="lg:hidden flex justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
                  <ShieldCheckIcon className="w-9 h-9 text-white" />
                </div>
              </div>

              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                Bem-vindo de volta
              </h2>
              <p className="text-gray-500 text-sm lg:text-base">
                Entre com suas credenciais para acessar sua conta
              </p>
            </div>

            {/* Erro */}
            {error && (
              <div className="mb-6 animate-shake">
                <ErrorMessage message={error} />
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="seu@email.com"
                    className="pl-12 pr-4 py-3 bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Senha
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    placeholder="Digite sua senha"
                    className="pl-12 pr-12 py-3 bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Opções */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-gray-600 group-hover:text-gray-800 transition-colors">
                    Lembrar-me
                  </span>
                </label>

                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>

              {/* Botão de Login */}
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                disabled={isLoading}
                className="py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            {/* Divisor */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">ou</span>
              </div>
            </div>

            {/* Rodapé */}
            <div className="text-center">
              <p className="text-gray-600 text-sm">
                Não tem uma conta?{' '}
                <Link 
                  to="/register" 
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Entre em contato
                </Link>
              </p>
            </div>
          </div>

          {/* Texto de segurança */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center space-x-2 text-gray-400 text-xs">
              <ShieldCheckIcon className="w-4 h-4" />
              <span>Conexão segura e criptografada</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
