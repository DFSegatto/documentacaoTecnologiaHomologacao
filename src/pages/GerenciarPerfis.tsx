import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, type PerfilDB, type PerfilUsuario } from '../lib/supabase'
import { usePerfil } from '../hooks/usePerfil'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Navigate } from 'react-router-dom'

const PERFIS: { value: PerfilUsuario; label: string; descricao: string; cor: string }[] = [
  { value: 'admin',   label: 'Admin',   descricao: 'Acesso total. Gerencia perfis, chamados e conteúdo.',      cor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' },
  { value: 'suporte', label: 'Suporte', descricao: 'Pode gerenciar chamados (status, prioridade, comentários).', cor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
  { value: 'usuario', label: 'Usuário', descricao: 'Pode abrir chamados e comentar.',                           cor: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
]

export default function GerenciarPerfis({ user }: { user: User | null }) {
  const { isAdmin, loading: loadingPerfil } = usePerfil(user)
  const [perfis,  setPerfis]  = useState<PerfilDB[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)

  useEffect(() => {
    if (!loadingPerfil && isAdmin) carregar()
  }, [loadingPerfil, isAdmin])

  async function carregar() {
    const { data } = await supabase.from('perfis_usuario').select('*').order('email')
    setPerfis((data ?? []) as PerfilDB[])
    setLoading(false)
  }

  async function handleAlterarPerfil(userId: string, novoPerfil: PerfilUsuario) {
    setSalvando(userId)
    await supabase.from('perfis_usuario').update({ perfil: novoPerfil }).eq('user_id', userId)
    setPerfis(prev => prev.map(p => p.user_id === userId ? { ...p, perfil: novoPerfil } : p))
    setSalvando(null)
  }

  if (loadingPerfil) return null
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />

      <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            Gerenciar Perfis
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Defina o nível de acesso de cada usuário no sistema de chamados.
          </p>
        </div>

        {/* Legenda de perfis */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {PERFIS.map(p => (
            <div key={p.value} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${p.cor}`}>{p.label}</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">{p.descricao}</p>
            </div>
          ))}
        </div>

        {/* Lista de usuários */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : perfis.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
              Nenhum usuário registrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {perfis.map(p => {
                const perfilInfo = PERFIS.find(pf => pf.value === p.perfil)!
                const ehVoce = user?.id === p.user_id
                return (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-4 flex-wrap">
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950/60 flex items-center justify-center text-brand-700 dark:text-brand-300 text-xs font-semibold shrink-0">
                      {p.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {p.email} {ehVoce && <span className="text-xs text-gray-400">(você)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${perfilInfo.cor}`}>
                        {perfilInfo.label}
                      </span>
                      {!ehVoce && (
                        <select
                          value={p.perfil}
                          disabled={salvando === p.user_id}
                          onChange={e => handleAlterarPerfil(p.user_id, e.target.value as PerfilUsuario)}
                          className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5
                            text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                        >
                          {PERFIS.map(pf => <option key={pf.value} value={pf.value}>{pf.label}</option>)}
                        </select>
                      )}
                      {salvando === p.user_id && (
                        <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
