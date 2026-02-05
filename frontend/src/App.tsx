import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import PageLoading from './components/PageLoading';
import './index.css';

// Lazy loading das páginas para melhor performance
// Páginas de Autenticação
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));

// Páginas Principais
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const ContactsPage = lazy(() => import('./pages/ContactsPage').then(module => ({ default: module.ContactsPage })));
const ContactFormPage = lazy(() => import('./pages/ContactFormPage').then(module => ({ default: module.ContactFormPage })));
const ContactDetailPage = lazy(() => import('./pages/ContactDetailPage').then(module => ({ default: module.ContactDetailPage })));
const CompaniesPage = lazy(() => import('./pages/CompaniesPage').then(module => ({ default: module.CompaniesPage })));
const CompanyFormPage = lazy(() => import('./pages/CompanyFormPage').then(module => ({ default: module.CompanyFormPage })));
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage').then(module => ({ default: module.CompanyDetailPage })));
const LeadsPage = lazy(() => import('./pages/LeadsPage').then(module => ({ default: module.LeadsPage })));
const LeadFormPage = lazy(() => import('./pages/LeadFormPage').then(module => ({ default: module.LeadFormPage })));
const LeadDetailPage = lazy(() => import('./pages/LeadDetailPage').then(module => ({ default: module.LeadDetailPage })));
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage').then(module => ({ default: module.OpportunitiesPage })));
const OpportunityFormPage = lazy(() => import('./pages/OpportunityFormPage').then(module => ({ default: module.OpportunityFormPage })));
const OpportunityDetailPage = lazy(() => import('./pages/OpportunityDetailPage').then(module => ({ default: module.OpportunityDetailPage })));
const TasksPage = lazy(() => import('./pages/TasksPage').then(module => ({ default: module.TasksPage })));
const TaskFormPage = lazy(() => import('./pages/TaskFormPage').then(module => ({ default: module.TaskFormPage })));
const NotesPage = lazy(() => import('./pages/NotesPage').then(module => ({ default: module.NotesPage })));
const NoteFormPage = lazy(() => import('./pages/NoteFormPage').then(module => ({ default: module.NoteFormPage })));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage').then(module => ({ default: module.SearchResultsPage })));
const ImportPage = lazy(() => import('./pages/ImportPage').then(module => ({ default: module.ImportPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));
const DesignSystemDemo = lazy(() => import('./components/DesignSystemDemo').then(module => ({ default: module.default })));

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Rotas Públicas - Sem Layout */}
            <Route path="/login" element={
              <Suspense fallback={<PageLoading />}>
                <LoginPage />
              </Suspense>
            } />
            <Route path="/forgot-password" element={
              <Suspense fallback={<PageLoading />}>
                <ForgotPasswordPage />
              </Suspense>
            } />
            <Route path="/reset-password" element={
              <Suspense fallback={<PageLoading />}>
                <ResetPasswordPage />
              </Suspense>
            } />
            
            {/* Rotas Protegidas - Com Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout><Outlet /></Layout>}>
                <Route path="/" element={
                  <Suspense fallback={<PageLoading />}>
                    <DashboardPage />
                  </Suspense>
                } />
                <Route path="/contacts" element={
                  <Suspense fallback={<PageLoading />}>
                    <ContactsPage />
                  </Suspense>
                } />
                <Route path="/contacts/new" element={
                  <Suspense fallback={<PageLoading />}>
                    <ContactFormPage />
                  </Suspense>
                } />
                <Route path="/contacts/:id/edit" element={
                  <Suspense fallback={<PageLoading />}>
                    <ContactFormPage />
                  </Suspense>
                } />
                <Route path="/contacts/:id" element={
                  <Suspense fallback={<PageLoading />}>
                    <ContactDetailPage />
                  </Suspense>
                } />
                <Route path="/companies" element={
                  <Suspense fallback={<PageLoading />}>
                    <CompaniesPage />
                  </Suspense>
                } />
                <Route path="/companies/new" element={
                  <Suspense fallback={<PageLoading />}>
                    <CompanyFormPage />
                  </Suspense>
                } />
                <Route path="/companies/:id/edit" element={
                  <Suspense fallback={<PageLoading />}>
                    <CompanyFormPage />
                  </Suspense>
                } />
                <Route path="/companies/:id" element={
                  <Suspense fallback={<PageLoading />}>
                    <CompanyDetailPage />
                  </Suspense>
                } />
                <Route path="/leads" element={
                  <Suspense fallback={<PageLoading />}>
                    <LeadsPage />
                  </Suspense>
                } />
                <Route path="/leads/new" element={
                  <Suspense fallback={<PageLoading />}>
                    <LeadFormPage />
                  </Suspense>
                } />
                <Route path="/leads/:id" element={
                  <Suspense fallback={<PageLoading />}>
                    <LeadDetailPage />
                  </Suspense>
                } />
                <Route path="/leads/:id/edit" element={
                  <Suspense fallback={<PageLoading />}>
                    <LeadFormPage />
                  </Suspense>
                } />
                <Route path="/leads/:id/convert" element={
                  <Suspense fallback={<PageLoading />}>
                    <div>Conversão de Lead (a implementar)</div>
                  </Suspense>
                } />
                <Route path="/opportunities" element={
                  <Suspense fallback={<PageLoading />}>
                    <OpportunitiesPage />
                  </Suspense>
                } />
                <Route path="/opportunities/new" element={
                  <Suspense fallback={<PageLoading />}>
                    <OpportunityFormPage />
                  </Suspense>
                } />
                <Route path="/opportunities/:id" element={
                  <Suspense fallback={<PageLoading />}>
                    <OpportunityDetailPage />
                  </Suspense>
                } />
                <Route path="/opportunities/:id/edit" element={
                  <Suspense fallback={<PageLoading />}>
                    <OpportunityFormPage />
                  </Suspense>
                } />
                <Route path="/tasks" element={
                  <Suspense fallback={<PageLoading />}>
                    <TasksPage />
                  </Suspense>
                } />
                <Route path="/tasks/new" element={
                  <Suspense fallback={<PageLoading />}>
                    <TaskFormPage />
                  </Suspense>
                } />
                <Route path="/tasks/:id/edit" element={
                  <Suspense fallback={<PageLoading />}>
                    <TaskFormPage />
                  </Suspense>
                } />
                <Route path="/tasks/:id" element={
                  <Suspense fallback={<PageLoading />}>
                    <div>Detalhes da Tarefa (a implementar)</div>
                  </Suspense>
                } />
                <Route path="/notes" element={
                  <Suspense fallback={<PageLoading />}>
                    <NotesPage />
                  </Suspense>
                } />
                <Route path="/notes/new" element={
                  <Suspense fallback={<PageLoading />}>
                    <NoteFormPage />
                  </Suspense>
                } />
                <Route path="/notes/:id/edit" element={
                  <Suspense fallback={<PageLoading />}>
                    <NoteFormPage />
                  </Suspense>
                } />
                <Route path="/notes/:id" element={
                  <Suspense fallback={<PageLoading />}>
                    <div>Detalhes da Nota (a implementar)</div>
                  </Suspense>
                } />
                <Route path="/search" element={
                  <Suspense fallback={<PageLoading />}>
                    <SearchResultsPage />
                  </Suspense>
                } />
                <Route path="/import" element={
                  <Suspense fallback={<PageLoading />}>
                    <ImportPage />
                  </Suspense>
                } />
                <Route path="/profile" element={
                  <Suspense fallback={<PageLoading />}>
                    <ProfilePage />
                  </Suspense>
                } />
                <Route path="/design-system" element={
                  <Suspense fallback={<PageLoading />}>
                    <DesignSystemDemo />
                  </Suspense>
                } />
              </Route>
            </Route>
            
            {/* 404 - Fora do Layout para tela cheia */}
            <Route path="*" element={
              <Suspense fallback={<PageLoading />}>
                <NotFoundPage />
              </Suspense>
            } />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;