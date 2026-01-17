import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ContactsPage } from './pages/ContactsPage';
import { ContactFormPage } from './pages/ContactFormPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanyFormPage } from './pages/CompanyFormPage';
import { LeadsPage } from './pages/LeadsPage';
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
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/new" element={<div>Formulário de Lead (a implementar)</div>} />
        <Route path="/leads/:id" element={<div>Detalhes do Lead (a implementar)</div>} />
        <Route path="/leads/:id/edit" element={<div>Formulário de Lead (a implementar)</div>} />
        <Route path="/leads/:id/convert" element={<div>Conversão de Lead (a implementar)</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

