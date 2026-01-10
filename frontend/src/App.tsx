import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ContactsPage } from './pages/ContactsPage';
import { ContactFormPage } from './pages/ContactFormPage';
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;

