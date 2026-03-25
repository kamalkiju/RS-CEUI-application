import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BufmSimplePage from './pages/BufmSimplePage.jsx'
import BufmReportsLayout from './pages/bufm/BufmReportsLayout.jsx'
import BufmReviewQueue from './pages/bufm/BufmReviewQueue.jsx'
import BufmDocumentList from './pages/bufm/BufmDocumentList.jsx'
import BufmDocumentView from './pages/bufm/BufmDocumentView.jsx'
import BufmUserDocuments from './pages/bufm/BufmUserDocuments.jsx'
import BufmUsersPage from './pages/bufm/BufmUsersPage.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { DocProvider } from './context/DocContext.jsx'
import { RsaUIProvider } from './context/RsaUIContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { KmtTemplateProvider } from './context/KmtTemplateContext.jsx'
import { KmtUsersProvider } from './context/KmtUsersContext.jsx'
import ProtectedRoute from './context/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import KnowledgeDocuments from './pages/poc/KnowledgeDocuments.jsx'
import CreateDocument from './pages/poc/CreateDocument.jsx'
import DocumentEditor from './pages/poc/DocumentEditor/DocumentEditor.jsx'
import RsaUIList from './pages/rsaui/RsaUIList.jsx'
import RsaUILayout from './pages/rsaui/RsaUILayout.jsx'
import RsaUIServiceArea from './pages/rsaui/RsaUIServiceArea.jsx'
import RsaUIPricing from './pages/rsaui/RsaUIPricing.jsx'
import RsaUIProducts from './pages/rsaui/RsaUIProducts.jsx'
import BUFMDashboard from './pages/BUFMDashboard.jsx'
import KMTDashboard from './pages/KMTDashboard.jsx'
import KmtReportsShell from './pages/kmt/KmtReportsShell.jsx'
import KmtReportsBody from './pages/kmt/KmtReportsBody.jsx'
import KmtDocumentView from './pages/kmt/KmtDocumentView.jsx'
import KmtRsaSubmissionView from './pages/kmt/KmtRsaSubmissionView.jsx'
import KmtDocumentsPage from './pages/kmt/KmtDocumentsPage.jsx'
import KmtWorkflowBuilder from './pages/kmt/KmtWorkflowBuilder.jsx'
import KmtFormBuilder from './pages/kmt/KmtFormBuilder.jsx'
import KmtUsersPage from './pages/kmt/KmtUsersPage.jsx'
import KmtDelegationsPage from './pages/kmt/KmtDelegationsPage.jsx'
import KmtSettingsPage from './pages/kmt/KmtSettingsPage.jsx'
import KmtTemplateWizard from './pages/kmt/KmtTemplateWizard.jsx'
import KmtTemplateView from './pages/kmt/KmtTemplateView.jsx'
import DocumentReviewRedirect from './components/DocumentReviewRedirect.jsx'

export default function App() {
  return (
    <NotificationProvider>
    <AuthProvider>
      <DocProvider>
        <RsaUIProvider>
        <KmtTemplateProvider>
        <KmtUsersProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* POC Routes */}
            <Route path="/poc" element={<ProtectedRoute role="POC" />}>
              <Route index element={<KnowledgeDocuments />} />
              <Route path="create" element={<CreateDocument />} />
              <Route path="editor" element={<DocumentEditor />} />
            </Route>

            <Route path="/rsaui" element={<ProtectedRoute role="POC" />}>
              <Route index element={<RsaUIList />} />
              <Route element={<RsaUILayout />}>
                <Route path="service-area" element={<RsaUIServiceArea />} />
                <Route path="pricing" element={<RsaUIPricing />} />
                <Route path="products" element={<RsaUIProducts />} />
              </Route>
            </Route>

            {/* BUFM Routes */}
            <Route path="/bufm" element={<ProtectedRoute role="BUFM" />}>
              <Route index element={<BUFMDashboard />} />
              <Route path="dashboard" element={<Navigate to="/bufm" replace />} />
              <Route path="document-review" element={<BufmReportsLayout />}>
                <Route index element={<Navigate to="review" replace />} />
                <Route path="review" element={<BufmReviewQueue />} />
                <Route path="approved" element={<BufmDocumentList mode="approved" />} />
                <Route path="rejected" element={<BufmDocumentList mode="rejected" />} />
              </Route>
              <Route path="reports/*" element={<DocumentReviewRedirect fromPrefix="/bufm/reports" toPrefix="/bufm/document-review" />} />
              <Route path="document/:id" element={<BufmDocumentView />} />
              <Route path="users/:userId/documents" element={<BufmUserDocuments />} />
              <Route path="users" element={<BufmUsersPage />} />
              <Route path="settings" element={<BufmSimplePage title="Settings" />} />
            </Route>

            {/* KMT Routes */}
            <Route path="/kmt" element={<ProtectedRoute role="KMT" />}>
              <Route index element={<KMTDashboard />} />
              <Route path="document-review" element={<KmtReportsShell />}>
                <Route index element={<Navigate to="knowledge/review" replace />} />
                <Route path=":docType/:queue" element={<KmtReportsBody />} />
              </Route>
              <Route path="reports/*" element={<DocumentReviewRedirect fromPrefix="/kmt/reports" toPrefix="/kmt/document-review" />} />
              <Route path="document/:id" element={<KmtDocumentView />} />
              <Route path="rsaui-submission/:id" element={<KmtRsaSubmissionView />} />
              <Route path="documents/new" element={<KmtTemplateWizard />} />
              <Route path="documents/:id/edit" element={<KmtTemplateWizard />} />
              <Route path="documents/:id" element={<KmtTemplateView />} />
              <Route path="documents" element={<KmtDocumentsPage />} />
              <Route path="workflow-builder" element={<KmtWorkflowBuilder />} />
              <Route path="form-builder" element={<KmtFormBuilder />} />
              <Route path="users" element={<KmtUsersPage />} />
              <Route path="delegations" element={<KmtDelegationsPage />} />
              <Route path="settings" element={<KmtSettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        </KmtUsersProvider>
        </KmtTemplateProvider>
        </RsaUIProvider>
      </DocProvider>
    </AuthProvider>
    </NotificationProvider>
  )
}
