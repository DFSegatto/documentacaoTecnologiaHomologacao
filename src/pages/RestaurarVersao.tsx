import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, type HistoricoRegistro } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function RestaurarVersao({ user }: { user: User | null }) {
  const { id, versaoId } = useParams<{ id: string; versaoId: string }>()
  const navigate = useNavigate()
  const [versao,      setVersao]      = useState<HistoricoRegistro | null>(null)
  const [restaurando, setRestaurando] = useState(false)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!versaoId) return
    supabase
      .from('registro_historico').select('*').eq('id', versaoId).single()
      .then(({ data }) => { setVersao(data as HistoricoRegistro); setLoading(false) })
  }, [versaoId])

  async function handleRestaurar() {
    if (!versao || !id) return
    setRestaurando(true)

    const { data: atual } = await supabase
      .from('registros').select('titulo, conteudo').eq('id', id).single()

    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // Salva versão atual no histórico antes de restaurar
    if (atual) {
      await supabase.from('registro_historico').insert({
        registro_id: id,
        titulo:      atual.titulo,
        conteudo:    atual.conteudo,
        editado_por: currentUser?.id,
      })
    }

    await supabase
      .from('registros')
      .update({
        titulo:        versao.titulo,
        conteudo:      versao.conteudo,
        atualizado_em: new Date().toISOString(),
        editado_por:   currentUser?.id,
      })
      .eq('id', id)

    navigate(`/registros/${id}`)
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />
      <main className="max-w-3xl mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-6">
          <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition">Registros</Link>
          <span>/</span>
          <Link to={`/registros/${id}`} className="hover:text-gray-600 dark:hover:text-gray-300 transition">Registro</Link>
          <span>/</span>
          <Link to={`/registros/${id}/historico`} className="hover:text-gray-600 dark:hover:text-gray-300 transition">Histórico</Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-200">Restaurar</span>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 mb-6 flex gap-3">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Atenção antes de restaurar</p>
            <p className="text-sm text-amber-700 dark:text-amber-300/90 mt-0.5">
              O conteúdo atual será salvo automaticamente no histórico antes da restauração.
              Você poderá desfazer esta ação pelo histórico de edições.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Versão de {versao ? formatarData(versao.editado_em) : ''}</p>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{versao?.titulo}</h2>
            </div>
            <span className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-full font-medium">Pré-visualização</span>
          </div>
          <div className="px-6 py-5 max-h-96 overflow-y-auto">
            <div
              className="tiptap-editor text-sm"
              dangerouslySetInnerHTML={{ __html: versao?.conteudo ?? '' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link to={`/registros/${id}/historico`}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
            ← Voltar ao histórico
          </Link>
          <button
            onClick={handleRestaurar}
            disabled={restaurando}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-60"
          >
            {restaurando ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Restaurando...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>Restaurar esta versão</>
            )}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  )
}
