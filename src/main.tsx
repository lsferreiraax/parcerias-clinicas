import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AuthProvider } from '@/contexts/AuthContext'
import { PerfilProvider } from '@/contexts/PerfilContext'
import { PermissoesProvider } from '@/contexts/PermissoesContext'
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
import Relatorios from '@/pages/Relatorios'
import Repasses from '@/pages/Repasses'
import Inadimplencia from '@/pages/Inadimplencia'
import ContaCorrente from '@/pages/ContaCorrente'
import Pacientes from '@/pages/Pacientes'
import Agenda from '@/pages/Agenda'
import Prontuario from '@/pages/Prontuario'
import DashboardPsicologia from '@/pages/DashboardPsicologia'
import TitularDados from '@/pages/TitularDados'
import Salas from '@/pages/Salas'
import GradeSalas from '@/pages/GradeSalas'
import Condominio from '@/pages/Condominio'
import Perfis from '@/pages/Perfis'
import SemAcesso from '@/pages/SemAcesso'
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
            <PermissoesProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route index              element={
                      <RoleGuard modulo="parcerias" roles={['admin', 'gestor']} redirect="/extrato">
                        <Dashboard />
                      </RoleGuard>
                    } />
                    <Route path="lancamentos" element={
                      <RoleGuard modulo="parcerias" roles={['admin', 'gestor']} redirect="/extrato">
                        <Lancamentos />
                      </RoleGuard>
                    } />
                    <Route path="parcelas"    element={
                      <RoleGuard modulo="parcerias" roles={['admin', 'gestor']} redirect="/extrato">
                        <Parcelas />
                      </RoleGuard>
                    } />
                    <Route path="inadimplencia" element={
                      <RoleGuard modulo="parcerias" roles={['admin', 'gestor']} redirect="/extrato">
                        <Inadimplencia />
                      </RoleGuard>
                    } />
                    <Route path="resumo"      element={
                      <RoleGuard modulo="parcerias" roles={['admin', 'gestor']} redirect="/extrato">
                        <Resumo />
                      </RoleGuard>
                    } />
                    <Route path="extrato"     element={<Extrato />} />
                    <Route path="usuarios"    element={
                      <RoleGuard modulo="usuarios" roles={['admin']} redirect="/">
                        <Usuarios />
                      </RoleGuard>
                    } />
                    <Route path="repasses" element={
                      <RoleGuard modulo="parcerias" roles={['admin', 'gestor']} redirect="/extrato">
                        <Repasses />
                      </RoleGuard>
                    } />
                    <Route path="relatorios" element={
                      <RoleGuard modulo="relatorios" roles={['admin', 'gestor']} redirect="/extrato">
                        <Relatorios />
                      </RoleGuard>
                    } />
                    <Route path="conta-corrente" element={
                      <RoleGuard modulo="conta_corrente" roles={['admin', 'gestor']} redirect="/extrato">
                        <ContaCorrente />
                      </RoleGuard>
                    } />
                    <Route path="pacientes" element={
                      <RoleGuard modulo="psicologia" roles={['admin', 'gestor', 'profissional']} redirect="/">
                        <Pacientes />
                      </RoleGuard>
                    } />
                    <Route path="agenda" element={
                      <RoleGuard modulo="psicologia" roles={['admin', 'gestor', 'profissional']} redirect="/">
                        <Agenda />
                      </RoleGuard>
                    } />
                    <Route path="prontuario" element={
                      <RoleGuard modulo="psicologia" roles={['profissional']} redirect="/">
                        <Prontuario />
                      </RoleGuard>
                    } />
                    <Route path="dashboard-psicologia" element={
                      <RoleGuard modulo="psicologia" roles={['admin', 'gestor', 'profissional']} redirect="/">
                        <DashboardPsicologia />
                      </RoleGuard>
                    } />
                    <Route path="titular-dados" element={
                      <RoleGuard modulo="psicologia" roles={['admin']} redirect="/">
                        <TitularDados />
                      </RoleGuard>
                    } />
                    <Route path="salas" element={
                      <RoleGuard modulo="salas" roles={['admin']} redirect="/">
                        <Salas />
                      </RoleGuard>
                    } />
                    <Route path="grade-salas" element={
                      <RoleGuard modulo="salas" roles={['admin', 'gestor']} redirect="/">
                        <GradeSalas />
                      </RoleGuard>
                    } />
                    <Route path="condominio" element={
                      <RoleGuard modulo="condominio" roles={['admin']} redirect="/">
                        <Condominio />
                      </RoleGuard>
                    } />
                    <Route path="configuracoes" element={
                      <RoleGuard modulo="configuracoes" roles={['admin']} redirect="/">
                        <Configuracoes />
                      </RoleGuard>
                    } />
                    <Route path="perfis" element={
                      <RoleGuard modulo="usuarios" roles={['admin']} redirect="/">
                        <Perfis />
                      </RoleGuard>
                    } />
                    <Route path="sem-acesso" element={<SemAcesso />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
            </PermissoesProvider>
          </PerfilProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
