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
import RsauiPocCreateLayout from './pages/rsaui/RsauiPocCreateLayout.jsx'
import RsauiPocCreateIndex from './pages/rsaui/RsauiPocCreateIndex.jsx'
import RsauiPocSelectStep from './pages/rsaui/RsauiPocSelectStep.jsx'
import RsauiPocProductConfig from './pages/rsaui/RsauiPocProductConfig.jsx'
import RsauiPocReviewSummary from './pages/rsaui/RsauiPocReviewSummary.jsx'
import RsauiPocSubmit from './pages/rsaui/RsauiPocSubmit.jsx'
import RsauiPocViewDetail from './pages/rsaui/RsauiPocViewDetail.jsx'
import BUFMDashboard from './pages/BUFMDashboard.jsx'
import KMTDashboard from './pages/KMTDashboard.jsx'
import KmtDocumentReviewLayout from './pages/kmt/KmtDocumentReviewLayout.jsx'
import KmtReportsBody from './pages/kmt/KmtReportsBody.jsx'
import KmtDocumentView from './pages/kmt/KmtDocumentView.jsx'
import KmtRsaSubmissionView from './pages/kmt/KmtRsaSubmissionView.jsx'
import KmtDocumentsPage from './pages/kmt/KmtDocumentsPage.jsx'
import KmtUsersPage from './pages/kmt/KmtUsersPage.jsx'
import KmtDelegationsPage from './pages/kmt/KmtDelegationsPage.jsx'
import KmtSettingsPage from './pages/kmt/KmtSettingsPage.jsx'
import KmtTemplateView from './pages/kmt/KmtTemplateView.jsx'
import KmtTemplateWizard from './pages/kmt/KmtTemplateWizard.jsx'
import DocumentReviewRedirect from './components/DocumentReviewRedirect.jsx'
import LegacyRsauiRedirect from './components/LegacyRsauiRedirect.jsx'
import BufmRsaReviewQueue from './pages/bufm/BufmRsaReviewQueue.jsx'
import BufmRsaApprovedList from './pages/bufm/BufmRsaApprovedList.jsx'
import BufmRsaRejectedList from './pages/bufm/BufmRsaRejectedList.jsx'
import BufmRsaTaskReview from './pages/bufm/BufmRsaTaskReview.jsx'
import BufmRsaRejectPage from './pages/bufm/BufmRsaRejectPage.jsx'
import BufmRsaExpiryQueue from './pages/bufm/BufmRsaExpiryQueue.jsx'
import RsauiKmtEscalate from './pages/kmt/RsauiKmtEscalate.jsx'
import RsauiKmtExtend from './pages/kmt/RsauiKmtExtend.jsx'
import RsauiKmtArchive from './pages/kmt/RsauiKmtArchive.jsx'
import RsauiKmtEditLayout from './pages/kmt/RsauiKmtEditLayout.jsx'
import RsauiKmtEditIndex from './pages/kmt/RsauiKmtEditIndex.jsx'
import WorkflowChatPage from './pages/chat/WorkflowChatPage.jsx'

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
                    <Route path="/ceui/login" element={<Navigate to="/login" replace />} />
                    <Route path="/rsaui/login" element={<Navigate to="/login" replace />} />

                    {/* POC — Knowledge docs + RSA service-area workflows (unified CEUI) */}
                    <Route path="/poc" element={<ProtectedRoute role="POC" />}>
                      <Route index element={<KnowledgeDocuments />} />
                      <Route path="create" element={<CreateDocument />} />
                      <Route path="editor" element={<DocumentEditor />} />
                      <Route path="document-review" element={<RsaUIList syncTabToUrl />} />
                      <Route path="settings" element={<BufmSimplePage title="POC Settings" />} />
                      <Route path="chat" element={<WorkflowChatPage />} />
                      <Route path="service-area" element={<RsauiPocCreateLayout />}>
                        <Route index element={<RsauiPocCreateIndex />} />
                        <Route path="view" element={<RsauiPocViewDetail />} />
                        <Route path="select" element={<RsauiPocSelectStep />} />
                        <Route path="configure" element={<RsauiPocProductConfig />} />
                        <Route path="review" element={<RsauiPocReviewSummary />} />
                        <Route path="submit" element={<RsauiPocSubmit />} />
                      </Route>
                    </Route>

                    {/* BUFM — CEUI + RSAUI document review streams */}
                    <Route path="/bufm" element={<ProtectedRoute role="BUFM" />}>
                      <Route index element={<BUFMDashboard />} />
                      <Route path="dashboard" element={<Navigate to="/bufm" replace />} />
                      <Route path="review/:id" element={<BufmRsaTaskReview />} />
                      <Route path="reject/:id" element={<BufmRsaRejectPage />} />
                      <Route path="document-review" element={<BufmReportsLayout />}>
                        <Route index element={<Navigate to="ceui/review" replace />} />
                        <Route path="ceui/review" element={<BufmReviewQueue />} />
                        <Route path="ceui/rejected" element={<BufmDocumentList mode="rejected" />} />
                        <Route path="ceui/approved" element={<BufmDocumentList mode="approved" />} />
                        <Route path="ceui/expiry" element={<BufmDocumentList mode="expiry" />} />
                        <Route path="rsaui/review" element={<BufmRsaReviewQueue />} />
                        <Route path="rsaui/rejected" element={<BufmRsaRejectedList />} />
                        <Route path="rsaui/approved" element={<BufmRsaApprovedList />} />
                        <Route path="rsaui/expiry" element={<BufmRsaExpiryQueue />} />
                      </Route>
                      <Route
                        path="reports/*"
                        element={<DocumentReviewRedirect fromPrefix="/bufm/reports" toPrefix="/bufm/document-review/ceui" />}
                      />
                      <Route path="document/:id" element={<BufmDocumentView />} />
                      <Route path="users/:userId/documents" element={<BufmUserDocuments />} />
                      <Route path="users" element={<BufmUsersPage />} />
                      <Route path="settings" element={<BufmSimplePage title="BUFM Settings" />} />
                      <Route path="chat" element={<WorkflowChatPage />} />
                    </Route>

                    {/* KMT — templates, combined document review, RSA tools */}
                    <Route path="/kmt" element={<ProtectedRoute role="KMT" />}>
                      <Route index element={<KMTDashboard />} />
                      <Route path="document-review" element={<KmtDocumentReviewLayout />}>
                        <Route index element={<Navigate to="ceui/review" replace />} />
                        <Route path=":stream/:queue" element={<KmtReportsBody />} />
                      </Route>
                      <Route path="reports/*" element={<DocumentReviewRedirect fromPrefix="/kmt/reports" toPrefix="/kmt/document-review/ceui" />} />
                      <Route path="document/:id" element={<KmtDocumentView />} />
                      <Route path="rsaui-submission/:id" element={<KmtRsaSubmissionView />} />
                      <Route path="documents/new" element={<KmtTemplateWizard />} />
                      <Route path="documents/:id/edit" element={<KmtTemplateWizard />} />
                      <Route path="documents/:id" element={<KmtTemplateView />} />
                      <Route path="documents" element={<KmtDocumentsPage />} />
                      <Route path="workflow-builder" element={<Navigate to="/kmt/documents" replace />} />
                      <Route path="form-builder" element={<Navigate to="/kmt/documents" replace />} />
                      <Route path="edit" element={<RsauiKmtEditLayout />}>
                        <Route index element={<RsauiKmtEditIndex />} />
                        <Route path="select" element={<RsauiPocSelectStep />} />
                        <Route path="configure" element={<RsauiPocProductConfig />} />
                        <Route path="review" element={<RsauiPocReviewSummary />} />
                        <Route path="submit" element={<RsauiPocSubmit />} />
                      </Route>
                      <Route path="escalate/:id" element={<RsauiKmtEscalate />} />
                      <Route path="extend/:id" element={<RsauiKmtExtend />} />
                      <Route path="archive/:id" element={<RsauiKmtArchive />} />
                      <Route path="users" element={<KmtUsersPage />} />
                      <Route path="delegations" element={<KmtDelegationsPage />} />
                      <Route path="settings" element={<KmtSettingsPage />} />
                      <Route path="chat" element={<WorkflowChatPage />} />
                    </Route>

                    <Route path="/rsaui/*" element={<LegacyRsauiRedirect />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
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
