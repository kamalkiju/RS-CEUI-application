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
import ApplicationSelector from './pages/landing/ApplicationSelector.jsx'
import RsauiLogin from './pages/auth/RsauiLogin.jsx'
import RsauiRoleSelect from './pages/auth/RsauiRoleSelect.jsx'
import CeuiComingSoon from './pages/auth/CeuiComingSoon.jsx'
import BufmRsaReviewQueue from './pages/bufm/BufmRsaReviewQueue.jsx'
import BufmRsaUnclaimedQueue from './pages/bufm/BufmRsaUnclaimedQueue.jsx'
import BufmRsaApprovedList from './pages/bufm/BufmRsaApprovedList.jsx'
import BufmRsaRejectedList from './pages/bufm/BufmRsaRejectedList.jsx'
import BufmRsaTaskReview from './pages/bufm/BufmRsaTaskReview.jsx'
import BufmRsaRejectPage from './pages/bufm/BufmRsaRejectPage.jsx'
import KmtRsaShell from './pages/kmt/KmtRsaShell.jsx'
import KmtRsaBody from './pages/kmt/KmtRsaBody.jsx'
import RsauiKmtEscalate from './pages/kmt/RsauiKmtEscalate.jsx'
import RsauiKmtExtend from './pages/kmt/RsauiKmtExtend.jsx'
import RsauiKmtArchive from './pages/kmt/RsauiKmtArchive.jsx'
import RsauiKmtEditLayout from './pages/kmt/RsauiKmtEditLayout.jsx'
import RsauiKmtEditIndex from './pages/kmt/RsauiKmtEditIndex.jsx'

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
            <Route path="/" element={<ApplicationSelector />} />
            <Route path="/ceui/login" element={<CeuiComingSoon />} />
            <Route path="/login" element={<Login />} />
            <Route path="/rsaui/login" element={<RsauiLogin />} />
            <Route path="/rsaui/role-select" element={<RsauiRoleSelect />} />

            {/* POC Routes */}
            <Route path="/poc" element={<ProtectedRoute role="POC" app="CEUI" />}>
              <Route index element={<KnowledgeDocuments />} />
              <Route path="create" element={<CreateDocument />} />
              <Route path="editor" element={<DocumentEditor />} />
            </Route>

            <Route path="/rsaui" element={<ProtectedRoute role="POC" app="RSAUI" />}>
              <Route index element={<Navigate to="/rsaui/poc/document-review" replace />} />
              <Route path="service-area" element={<Navigate to="/rsaui/poc/create/select" replace />} />
              <Route path="pricing" element={<Navigate to="/rsaui/poc/create/review" replace />} />
              <Route path="products" element={<Navigate to="/rsaui/poc/create/configure" replace />} />
            </Route>

            <Route path="/rsaui/poc" element={<ProtectedRoute role="POC" app="RSAUI" />}>
              <Route path="dashboard" element={<Navigate to="/rsaui/poc/document-review" replace />} />
              <Route path="document-review" element={<RsaUIList syncTabToUrl />} />
              <Route path="create" element={<RsauiPocCreateLayout />}>
                <Route index element={<RsauiPocCreateIndex />} />
                <Route path="view" element={<RsauiPocViewDetail />} />
                <Route path="select" element={<RsauiPocSelectStep />} />
                <Route path="configure" element={<RsauiPocProductConfig />} />
                <Route path="review" element={<RsauiPocReviewSummary />} />
                <Route path="submit" element={<RsauiPocSubmit />} />
              </Route>
              <Route path="settings" element={<BufmSimplePage title="POC Settings" />} />
            </Route>

            <Route path="/rsaui/bufm" element={<ProtectedRoute role="BUFM" app="RSAUI" />}>
              <Route path="dashboard" element={<BUFMDashboard />} />
              <Route path="review/:id" element={<BufmRsaTaskReview />} />
              <Route path="reject/:id" element={<BufmRsaRejectPage />} />
              <Route path="document-review" element={<BufmReportsLayout />}>
                <Route index element={<Navigate to="review" replace />} />
                <Route path="review" element={<BufmRsaReviewQueue />} />
                <Route path="approved" element={<BufmRsaApprovedList />} />
                <Route path="rejected" element={<BufmRsaRejectedList />} />
                <Route path="unclaimed" element={<BufmRsaUnclaimedQueue />} />
              </Route>
              <Route path="settings" element={<BufmSimplePage title="BUFM Settings" />} />
            </Route>

            <Route path="/rsaui/kmt" element={<ProtectedRoute role="KMT" app="RSAUI" />}>
              <Route path="dashboard" element={<KMTDashboard />} />
              <Route path="submission/:id" element={<KmtRsaSubmissionView />} />
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
              <Route path="document-review" element={<KmtRsaShell />}>
                <Route index element={<Navigate to="review" replace />} />
                <Route path=":queue" element={<KmtRsaBody />} />
              </Route>
              <Route path="settings" element={<KmtSettingsPage />} />
            </Route>

            {/* BUFM Routes */}
            <Route path="/bufm" element={<ProtectedRoute role="BUFM" app="CEUI" />}>
              <Route index element={<BUFMDashboard />} />
              <Route path="dashboard" element={<Navigate to="/bufm" replace />} />
              <Route path="review/:id" element={<BufmRsaTaskReview />} />
              <Route path="reject/:id" element={<BufmRsaRejectPage />} />
              <Route path="document-review" element={<BufmReportsLayout />}>
                <Route index element={<Navigate to="review" replace />} />
                <Route path="review" element={<BufmReviewQueue />} />
                <Route path="approved" element={<BufmDocumentList mode="approved" />} />
                <Route path="rejected" element={<BufmDocumentList mode="rejected" />} />
                <Route path="unclaimed" element={<BufmRsaUnclaimedQueue />} />
              </Route>
              <Route path="reports/*" element={<DocumentReviewRedirect fromPrefix="/bufm/reports" toPrefix="/bufm/document-review" />} />
              <Route path="document/:id" element={<BufmDocumentView />} />
              <Route path="users/:userId/documents" element={<BufmUserDocuments />} />
              <Route path="users" element={<BufmUsersPage />} />
              <Route path="settings" element={<BufmSimplePage title="Settings" />} />
            </Route>

            {/* KMT Routes */}
            <Route path="/kmt" element={<ProtectedRoute role="KMT" app="CEUI" />}>
              <Route index element={<KMTDashboard />} />
              <Route path="document-review" element={<KmtReportsShell />}>
                <Route index element={<Navigate to="review" replace />} />
                <Route path=":queue" element={<KmtReportsBody />} />
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
