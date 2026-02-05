/**
 * Página de formulário de contato
 * Suporta modo criação e edição
 */

import { useNavigate, useParams } from 'react-router-dom';
import { ContactForm } from '../components/ContactForm';
import { useToast } from '../components/Toast';
import { createContact, updateContact } from '../services/contactService';
import type { ContactFormData } from '../types/contact';

export function ContactFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { success } = useToast();

  const handleSubmit = async (data: ContactFormData) => {
    try {
      if (id) {
        // Modo edição
        await updateContact(id, data);
        success('Contato atualizado com sucesso!');
      } else {
        // Modo criação
        await createContact(data);
        success('Contato criado com sucesso!');
      }
      // Redirecionar apenas após sucesso
      navigate('/contacts');
    } catch (error) {
      // Erro já é tratado no ContactForm, apenas re-lançar para não redirecionar
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/contacts');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {id ? 'Editar Contato' : 'Novo Contato'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {id ? 'Atualize as informações do contato' : 'Preencha os dados do novo contato'}
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <ContactForm
          contactId={id}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

