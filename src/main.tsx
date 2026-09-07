import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AuthProvider } from '@/contexts/AuthContext'
import { PerfilProvider } from '@/contexts/PerfilContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import RoleGuard from '@/components/auth/RoleGuard'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Lancamentos from '@/pages/Lancamentos'
import Parcelas from '@/pages/Parcelas'
import Resumo from '@/pages/Resumo'
import Extrato from '@/pages/Extrato'
import Usuarios from '@/pages/Usuarios'
import Configuracoes from '@/pages/Configuracoes'
import './index.css'

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <PerfilProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route index              element={
                      <RoleGuard roles={['admin', 'gestor']} redirect="/extrato">
                        <Dashboard />
                      </RoleGuard>
                    } />
                    <Route path="lancamentos" element={
                      <RoleGuard roles={['admin', 'gestor']} redirect="/extrato">
                        <Lancamentos />
                      </RoleGuard>
                    } />
                    <Route path="parcelas"    element={
                      <RoleGuard roles={['admin', 'gestor']} redirect="/extrato">
                        <Parcelas />
                      </RoleGuard>
                    } />
                    <Route path="resumo"      element={
                      <RoleGuard roles={['admin', 'gestor']} redirect="/extrato">
                        <Resumo />
                      </RoleGuard>
                    } />
                    <Route path="extrato"     element={<Extrato />} />
                    <Route path="usuarios"    element={
                      <RoleGuard roles={['admin']} redirect="/">
                        <Usuarios />
                      </RoleGuard>
                    } />
                    <Route path="configuracoes" element={
                      <RoleGuard roles={['admin']} redirect="/">
                        <Configuracoes />
                      </RoleGuard>
                    } />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </PerfilProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
