import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import { ContactsPage } from './pages/ContactsPage';
import { ContactFormPage } from './pages/ContactFormPage';
import { ContactDetailPage } from './pages/ContactDetailPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanyFormPage } from './pages/CompanyFormPage';
import { CompanyDetailPage } from './pages/CompanyDetailPage';
import { LeadsPage } from './pages/LeadsPage';
import { LeadFormPage } from './pages/LeadFormPage';
import { LeadDetailPage } from './pages/LeadDetailPage';
import { OpportunitiesPage } from './pages/OpportunitiesPage';
import { OpportunityFormPage } from './pages/OpportunityFormPage';
import { OpportunityDetailPage } from './pages/OpportunityDetailPage';
import { TasksPage } from './pages/TasksPage';
import { TaskFormPage } from './pages/TaskFormPage';
import { NotesPage } from './pages/NotesPage';
import { NoteFormPage } from './pages/NoteFormPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { ImportPage } from './pages/ImportPage';
import { NotFoundPage } from './pages/NotFoundPage';
import DesignSystemDemo from './components/DesignSystemDemo';
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<div>Dashboard (a implementar)</div>} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/contacts/new" element={<ContactFormPage />} />
              <Route path="/contacts/:id/edit" element={<ContactFormPage />} />
              <Route path="/contacts/:id" element={<ContactDetailPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/companies/new" element={<CompanyFormPage />} />
              <Route path="/companies/:id/edit" element={<CompanyFormPage />} />
              <Route path="/companies/:id" element={<CompanyDetailPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/leads/new" element={<LeadFormPage />} />
              <Route path="/leads/:id" element={<LeadDetailPage />} />
              <Route path="/leads/:id/edit" element={<LeadFormPage />} />
              <Route path="/leads/:id/convert" element={<div>Conversão de Lead (a implementar)</div>} />
              <Route path="/opportunities" element={<OpportunitiesPage />} />
              <Route path="/opportunities/new" element={<OpportunityFormPage />} />
              <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
              <Route path="/opportunities/:id/edit" element={<OpportunityFormPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/tasks/new" element={<TaskFormPage />} />
              <Route path="/tasks/:id/edit" element={<TaskFormPage />} />
              <Route path="/tasks/:id" element={<div>Detalhes da Tarefa (a implementar)</div>} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/notes/new" element={<NoteFormPage />} />
              <Route path="/notes/:id/edit" element={<NoteFormPage />} />
              <Route path="/notes/:id" element={<div>Detalhes da Nota (a implementar)</div>} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/design-system" element={<DesignSystemDemo />} />
              {/* Rota 404 - deve ser sempre a última */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
