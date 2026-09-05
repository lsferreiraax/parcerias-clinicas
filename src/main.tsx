import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Lancamentos from '@/pages/Lancamentos'
import Parcelas from '@/pages/Parcelas'
import Resumo from '@/pages/Resumo'
import './index.css'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index           element={<Dashboard />} />
            <Route path="lancamentos" element={<Lancamentos />} />
            <Route path="parcelas"    element={<Parcelas />} />
            <Route path="resumo"      element={<Resumo />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
