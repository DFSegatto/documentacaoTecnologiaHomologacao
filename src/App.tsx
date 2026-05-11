import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

import Login           from './pages/Login'
import RedefinirSenha  from './pages/RedefinirSenha'
import Home            from './pages/Home'
import NovoRegistro    from './pages/NovoRegistro'
import VerRegistro     from './pages/VerRegistro'
import EditarRegistro  from './pages/EditarRegistro'
import Categorias      from './pages/Categorias'
import Sessoes         from './pages/Sessoes'
import Historico       from './pages/Historico'
import RestaurarVersao from './pages/RestaurarVersao'
import Configuracoes   from './pages/Configuracoes'
import Chamados        from './pages/Chamados'
import VerChamado      from './pages/VerChamado'
import GerenciarPerfis from './pages/GerenciarPerfis'
import ReleaseNotes     from './pages/ReleaseNotes'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

function Spinner() {
  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function RotaProtegida({ estado, children }: { estado: AuthState; children: React.ReactNode }) {
  if (estado === 'loading')         return <Spinner />
  if (estado === 'unauthenticated') return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const [user,   setUser]   = useState<User | null>(null)
  const [estado, setEstado] = useState<AuthState>('loading')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setEstado(data.user ? 'authenticated' : 'unauthenticated')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u); setEstado(u ? 'authenticated' : 'unauthenticated')
      if (event === 'PASSWORD_RECOVERY') navigate('/redefinir-senha')
    })
    return () => subscription.unsubscribe()
  }, [])

  const P = ({ children }: { children: React.ReactNode }) => (
    <RotaProtegida estado={estado}>{children}</RotaProtegida>
  )

  return (
    <Routes>
      <Route path="/login" element={
        estado === 'loading' ? <Spinner />
        : estado === 'authenticated' ? <Navigate to="/" replace />
        : <Login />
      } />
      <Route path="/"                                element={<P><Home user={user} /></P>} />
      <Route path="/registros/novo"                  element={<P><NovoRegistro user={user} /></P>} />
      <Route path="/registros/:id"                   element={<P><VerRegistro user={user} /></P>} />
      <Route path="/registros/:id/editar"            element={<P><EditarRegistro user={user} /></P>} />
      <Route path="/registros/:id/historico"         element={<P><Historico user={user} /></P>} />
      <Route path="/registros/:id/restaurar/:versaoId" element={<P><RestaurarVersao user={user} /></P>} />
      <Route path="/categorias"                      element={<P><Categorias user={user} /></P>} />
      <Route path="/sessoes"                         element={<P><Sessoes user={user} /></P>} />
      <Route path="/configuracoes"                   element={<P><Configuracoes user={user} /></P>} />
      <Route path="/chamados"                        element={<P><Chamados user={user} /></P>} />
      <Route path="/chamados/:id"                    element={<P><VerChamado user={user} /></P>} />
      <Route path="/perfis"                          element={<P><GerenciarPerfis user={user} /></P>} />
      <Route path="/notas-de-versao"                  element={<P><ReleaseNotes user={user} /></P>} />
      <Route path="/redefinir-senha"                 element={<P><RedefinirSenha /></P>} />
      <Route path="*"                                element={<Navigate to="/" replace />} />
    </Routes>
  )
}
