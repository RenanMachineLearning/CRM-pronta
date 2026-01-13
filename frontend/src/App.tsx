import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ContactsPage } from './pages/ContactsPage';
import { ContactFormPage } from './pages/ContactFormPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanyFormPage } from './pages/CompanyFormPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Dashboard (a implementar)</div>} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/new" element={<ContactFormPage />} />
        <Route path="/contacts/:id/edit" element={<ContactFormPage />} />
        <Route path="/contacts/:id" element={<div>Detalhes do Contato (a implementar)</div>} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/new" element={<CompanyFormPage />} />
        <Route path="/companies/:id/edit" element={<CompanyFormPage />} />
        <Route path="/companies/:id" element={<div>Detalhes da Empresa (a implementar)</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

