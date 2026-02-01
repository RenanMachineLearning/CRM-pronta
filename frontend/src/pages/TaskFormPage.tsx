/**
 * Página de formulário de tarefa
 * Suporta modo criação e edição
 */

import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { TaskForm } from '../components/TaskForm';
import { createTask, updateTask } from '../services/taskService';
import type { TaskFormData, RelatedEntityType } from '../types/task';

export function TaskFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const relatedEntityType = searchParams.get('relatedEntityType') as RelatedEntityType | null;
  const relatedEntityId = searchParams.get('relatedEntityId') || undefined;

  const handleSubmit = async (data: TaskFormData) => {
    try {
      if (id) {
        // Modo edição
        await updateTask(id, data);
      } else {
        // Modo criação
        await createTask(data);
      }
      // Redirecionar apenas após sucesso
      navigate('/tasks');
    } catch (error) {
      // Erro já é tratado no TaskForm, apenas re-lançar para não redirecionar
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/tasks');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Editar Tarefa' : 'Nova Tarefa'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {id ? 'Atualize as informações da tarefa' : 'Preencha os dados da nova tarefa'}
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <TaskForm
          taskId={id}
          relatedEntityType={relatedEntityType || undefined}
          relatedEntityId={relatedEntityId}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
