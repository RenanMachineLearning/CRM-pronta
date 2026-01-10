/**
 * Página de listagem de contatos
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ContactList } from '../components/ContactList';

export function ContactsPage() {
  const navigate = useNavigate();

  const handleContactClick = (contactId: string) => {
    navigate(`/contacts/${contactId}`);
  };

  const handleNewContact = () => {
    navigate('/contacts/new');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contatos</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gerencie seus contatos e empresas
        </p>
      </div>

      <ContactList
        onContactClick={handleContactClick}
        onNewContact={handleNewContact}
      />
    </div>
  );
}

