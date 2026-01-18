/**
 * Página de tarefas
 * Exibe listagem de tarefas com filtros por status
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskList } from '../components/TaskList';
import { Button } from '../components/Button';
import type { TaskStatus } from '../types/task';

type StatusTab = 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

const statusTabs: { id: StatusTab; label: string; status?: TaskStatus }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendentes', status: 'PENDING' },
  { id: 'in_progress', label: 'Em Andamento', status: 'IN_PROGRESS' },
  { id: 'completed', label: 'Concluídas', status: 'COMPLETED' },
  { id: 'cancelled', label: 'Canceladas', status: 'CANCELLED' },
];

export function TasksPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StatusTab>('all');

  const handleTaskClick = (taskId: string) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleNewTask = () => {
    navigate('/tasks/new');
  };

  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
  };

  // Obter filtro de status baseado na tab ativa
  const statusFilter = activeTab !== 'all' 
    ? { status: statusTabs.find(t => t.id === activeTab)?.status } 
    : undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tarefas</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gerencie suas tarefas e atividades
            </p>
          </div>
          <Button onClick={handleNewTask} variant="primary">
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Tabs de status */}
      <div className="mb-6">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab.id !== statusTabs[statusTabs.length - 1].id ? 'border-r border-gray-300' : ''
              } ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de tarefas */}
      <div className="bg-white shadow rounded-lg p-6">
        <TaskList
          onTaskClick={handleTaskClick}
          onNewTask={handleNewTask}
          initialFilters={statusFilter}
        />
      </div>
    </div>
  );
}
