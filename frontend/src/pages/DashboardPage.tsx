/**
 * Página de Dashboard
 * Com estatísticas, gráficos e visão geral
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { SkeletonDashboard } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import {
  UsersIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

// Dados mockados (em produção, viriam da API)
const mockData = {
  stats: {
    totalContacts: 128,
    totalCompanies: 45,
    totalLeads: 32,
    totalOpportunities: 18,
    totalValue: 125000,
    tasksPending: 12,
    contactsGrowth: 12,
    companiesGrowth: 8,
    opportunitiesGrowth: -5,
    leadsGrowth: 23,
  },
  leadsByStatus: [
    { name: 'Novo', value: 15, color: '#3B82F6' },
    { name: 'Qualificado', value: 10, color: '#10B981' },
    { name: 'Convertido', value: 5, color: '#8B5CF6' },
    { name: 'Perdido', value: 2, color: '#EF4444' },
  ],
  opportunitiesByStage: [
    { name: 'Prospecção', value: 8 },
    { name: 'Qualificação', value: 5 },
    { name: 'Proposta', value: 3 },
    { name: 'Negociação', value: 2 },
  ],
  monthlyRevenue: [
    { month: 'Jan', value: 45000 },
    { month: 'Fev', value: 52000 },
    { month: 'Mar', value: 48000 },
    { month: 'Abr', value: 61000 },
    { month: 'Mai', value: 55000 },
    { month: 'Jun', value: 72000 },
  ],
  activitiesByDay: [
    { day: 'Seg', tasks: 5, calls: 3, emails: 8 },
    { day: 'Ter', tasks: 7, calls: 4, emails: 6 },
    { day: 'Qua', tasks: 4, calls: 6, emails: 9 },
    { day: 'Qui', tasks: 8, calls: 2, emails: 7 },
    { day: 'Sex', tasks: 6, calls: 5, emails: 10 },
  ],
  recentTasks: [
    { id: '1', title: 'Ligar para cliente XYZ', dueDate: '2026-02-06', priority: 'HIGH', completed: false },
    { id: '2', title: 'Enviar proposta comercial', dueDate: '2026-02-07', priority: 'MEDIUM', completed: false },
    { id: '3', title: 'Reunião com equipe de vendas', dueDate: '2026-02-05', priority: 'HIGH', completed: true },
    { id: '4', title: 'Follow-up leads', dueDate: '2026-02-08', priority: 'LOW', completed: false },
  ],
  recentOpportunities: [
    { id: '1', name: 'Projeto Alpha', value: 50000, stage: 'Proposta', probability: 70 },
    { id: '2', name: 'Contrato Beta', value: 35000, stage: 'Negociação', probability: 85 },
    { id: '3', name: 'Parceria Gamma', value: 28000, stage: 'Qualificação', probability: 40 },
  ],
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  color: string;
  linkTo: string;
}

function StatCard({ title, value, icon: Icon, trend, trendLabel, color, linkTo }: StatCardProps) {
  return (
    <Link
      to={linkTo}
      className="bg-bg-surface rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${trend >= 0 ? 'text-success-600' : 'text-error-600'}`}>
              {trend >= 0 ? (
                <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
              )}
              <span>{Math.abs(trend)}%</span>
              {trendLabel && <span className="text-text-tertiary ml-1">{trendLabel}</span>}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-text-inverse" />
        </div>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data] = useState(mockData);

  useEffect(() => {
    // Simula carregamento de dados
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Bem-vindo de volta, {user?.name?.split(' ')[0] || 'Usuário'}! Aqui está o resumo do seu CRM.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/contacts/new">
            <Button variant="primary" size="sm">
              <PlusIcon className="w-4 h-4 mr-2" />
              Novo Contato
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Contatos"
          value={data.stats.totalContacts}
          icon={UsersIcon}
          trend={data.stats.contactsGrowth}
          trendLabel="vs mês passado"
          color="bg-blue-500"
          linkTo="/contacts"
        />
        <StatCard
          title="Empresas"
          value={data.stats.totalCompanies}
          icon={BuildingOfficeIcon}
          trend={data.stats.companiesGrowth}
          trendLabel="vs mês passado"
          color="bg-indigo-500"
          linkTo="/companies"
        />
        <StatCard
          title="Oportunidades"
          value={data.stats.totalOpportunities}
          icon={CurrencyDollarIcon}
          trend={data.stats.opportunitiesGrowth}
          trendLabel="vs mês passado"
          color="bg-green-500"
          linkTo="/opportunities"
        />
        <StatCard
          title="Tarefas Pendentes"
          value={data.stats.tasksPending}
          icon={ClipboardDocumentListIcon}
          color="bg-orange-500"
          linkTo="/tasks"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Receita Mensal */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Receita Mensal
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyRevenue}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(value: number) => `R$${value / 1000}k`} />
                <Tooltip
                  formatter={(value) => [`R$ ${Number(value).toLocaleString()}`, 'Receita']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Leads por Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Leads por Status
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.leadsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.leadsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {data.leadsByStatus.map((item) => (
              <div key={item.name} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="ml-1 text-sm font-medium text-gray-900">({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de Atividades */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Atividades da Semana
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.activitiesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="day" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="tasks" name="Tarefas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="calls" name="Ligações" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="emails" name="Emails" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Oportunidades por Estágio */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Oportunidades por Estágio
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.opportunitiesByStage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" stroke="#6B7280" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={12} width={100} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Seção Inferior: Tarefas e Oportunidades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarefas Pendentes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tarefas Pendentes</h3>
            <Link to="/tasks" className="text-sm text-blue-600 hover:text-blue-500">
              Ver todas
            </Link>
          </div>
          
          {data.recentTasks.length === 0 ? (
            <EmptyState
              title="Nenhuma tarefa pendente"
              description="Você está em dia!"
              icon="task"
              variant="card"
            />
          ) : (
            <div className="space-y-3">
              {data.recentTasks.filter(t => !t.completed).slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      task.priority === 'HIGH' ? 'bg-red-500' :
                      task.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-500">
                        Vencimento: {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                    task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {task.priority === 'HIGH' ? 'Alta' : task.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Oportunidades Recentes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Oportunidades em Destaque</h3>
            <Link to="/opportunities" className="text-sm text-blue-600 hover:text-blue-500">
              Ver todas
            </Link>
          </div>
          
          {data.recentOpportunities.length === 0 ? (
            <EmptyState
              title="Nenhuma oportunidade"
              description="Crie sua primeira oportunidade"
              icon="opportunity"
              variant="card"
            />
          ) : (
            <div className="space-y-3">
              {data.recentOpportunities.slice(0, 4).map((opp) => (
                <div
                  key={opp.id}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{opp.name}</p>
                    <span className="text-sm font-semibold text-green-600">
                      R$ {opp.value.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{opp.stage}</span>
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${opp.probability}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{opp.probability}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
