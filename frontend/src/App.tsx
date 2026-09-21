import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';
import TestExecutionsPage from './pages/TestExecutionsPage';
import DefectsPage from './pages/DefectsPage';
import QaSPage from './pages/QaSPage';
import UATSessionsPage from './pages/UATSessionsPage';
import ChatPage from './pages/ChatPage';
import IngestPage from './pages/IngestPage';
import AIReviewPage from './pages/AIReviewPage';
import DocumentsPage from './pages/DocumentsPage';
import ImportExportPage from './pages/ImportExportPage';
import AuditLogPage from './pages/AuditLogPage';
import UsersPage from './pages/UsersPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/test-executions"
          element={
            <ProtectedRoute>
              <TestExecutionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/defects"
          element={
            <ProtectedRoute>
              <DefectsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/qas"
          element={
            <ProtectedRoute>
              <QaSPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/uat"
          element={
            <ProtectedRoute>
              <UATSessionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ingest"
          element={
            <ProtectedRoute>
              <IngestPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-review"
          element={
            <ProtectedRoute>
              <AIReviewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/import-export"
          element={
            <ProtectedRoute>
              <ImportExportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-log"
          element={
            <ProtectedRoute>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
