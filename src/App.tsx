import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TenantsPage from './pages/TenantsPage'
import TenantDetailPage from './pages/TenantDetailPage'
import UsersPage from './pages/UsersPage'
import UserDetailPage from './pages/UserDetailPage'
import EmployeeDetailPage from './pages/EmployeeDetailPage'
import DocumentsPage from './pages/DocumentsPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import PlansPage from './pages/billing/PlansPage'
import PricingPage from './pages/billing/PricingPage'
import SubscriptionsPage from './pages/billing/SubscriptionsPage'
import TransactionsPage from './pages/billing/TransactionsPage'
import AdjustmentsPage from './pages/billing/AdjustmentsPage'
import TeamPage from './pages/admin/TeamPage'
import RolesPage from './pages/admin/RolesPage'
import AuditPage from './pages/admin/AuditPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/tenants/:id" element={<TenantDetailPage />} />
          <Route
            path="/tenants/:companyId/users/:userId"
            element={<EmployeeDetailPage />}
          />

          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />

          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />

          <Route path="/billing/plans" element={<PlansPage />} />
          <Route path="/billing/pricing" element={<PricingPage />} />
          <Route path="/billing/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/billing/transactions" element={<TransactionsPage />} />
          <Route path="/billing/adjustments" element={<AdjustmentsPage />} />

          <Route path="/admin/team" element={<TeamPage />} />
          <Route path="/admin/roles" element={<RolesPage />} />
          <Route path="/audit" element={<AuditPage />} />

          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
