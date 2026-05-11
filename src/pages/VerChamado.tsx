import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import {
  supabase, nomeExibicao,
  type Chamado, type ChamadoComentario, type PerfilDB,
  TIPOS_CHAMADO, PRIORIDADES_CHAMADO, STATUS_CHAMADO,
  type StatusChamado, type PrioridadeChamado,
} from '../lib/supabase'
import { usePerfil } from '../hooks/usePerfil'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function VerChamado({ user }: { user: User | null }) {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin, isSuporte } = usePerfil(user)

  const [chamado,     setChamado]     = useState<Chamado | null>(null)
  const [comentarios, setComentarios] = useState<ChamadoComentario[]>([])
  const [loading,     setLoading]     = useState(true)
  const [confirmando,  setConfirmando]  = useState(false)
  const [nomeCriador,  setNomeCriador]  = useState<string | null>(null)

  // Comentário
  const [novoComentario, setNovoComentario] = useState('')
  const [salvandoComentario, setSalvandoComentario] = useState(false)

  // Edição de status/prioridade (suporte/admin)
  const [editandoStatus,     setEditandoStatus]     = useState(false)
  const [editandoPrioridade, setEditandoPrioridade] = useState(false)

  useEffect(() => {
    if (!id) return
    carregar()
  }, [id])

  async function carregar() {
    const [{ data: c }, { data: coms }] = await Promise.all([
      supabase.from('chamados').select('*').eq('id', id).single(),
      supabase.from('chamados_comentarios').select('*').eq('chamado_id', id).order('criado_em'),
    ])
    setChamado(c as Chamado | null)
    setComentarios((coms ?? []) as ChamadoComentario[])

    // Busca nome do criador do chamado
    if (c?.criado_por) {
      const { data: perfil } = await supabase
        .from('perfis_usuario')
        .select('nome, email')
        .eq('user_id', c.criado_por)
        .single()
      if (perfil) setNomeCriador(nomeExibicao(perfil as PerfilDB))
    }

    setLoading(false)
  }

  async function handleAlterarStatus(novoStatus: StatusChamado) {
    if (!chamado) return
    await supabase.from('chamados').update({ status: novoStatus }).eq('id', id)
    setChamado({ ...chamado, status: novoStatus })
    setEditandoStatus(false)
  }

  async function handleAlterarPrioridade(novaPrioridade: PrioridadeChamado) {
    if (!chamado) return
    await supabase.from('chamados').update({ prioridade: novaPrioridade }).eq('id', id)
    setChamado({ ...chamado, prioridade: novaPrioridade })
    setEditandoPrioridade(false)
  }

  async function handleComentario() {
    if (!novoComentario.trim() || !user) return
    setSalvandoComentario(true)
    const { data } = await supabase.from('chamados_comentarios').insert({
      chamado_id: id,
      conteudo: novoComentario.trim(),
      criado_por: user.id,
    }).select().single()
    if (data) setComentarios(prev => [...prev, data as ChamadoComentario])
    setNovoComentario('')
    setSalvandoComentario(false)
  }

  async function handleExcluirChamado() {
    await supabase.from('chamados').delete().eq('id', id)
    navigate('/chamados')
  }

  async function handleExcluirComentario(comentarioId: string) {
    await supabase.from('chamados_comentarios').delete().eq('id', comentarioId)
    setComentarios(prev => prev.filter(c => c.id !== comentarioId))
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
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

  if (!chamado) return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />
      <div className="max-w-md mx-auto px-4 py-32 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Chamado não encontrado</h1>
        <Link to="/chamados" className="text-sm text-brand-600 hover:underline">← Voltar para chamados</Link>
      </div>
    </div>
  )

  const statusInfo   = STATUS_CHAMADO.find(s => s.value === chamado.status)!
  const prioInfo     = PRIORIDADES_CHAMADO.find(p => p.value === chamado.prioridade)!
  const tipoInfo     = TIPOS_CHAMADO.find(t => t.value === chamado.tipo)!
  const ehCriador    = user?.id === chamado.criado_por
  const podeExcluir  = isAdmin || (ehCriador && chamado.status === 'aberto')
  const podeGerir    = isSuporte

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />

      <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-6 min-w-0 overflow-hidden">
          <Link to="/chamados" className="hover:text-gray-600 dark:hover:text-gray-300 transition shrink-0">Chamados</Link>
          <span className="shrink-0">/</span>
          <span className="text-gray-700 dark:text-gray-200 truncate min-w-0">{chamado.titulo}</span>
        </div>

        <div className="space-y-4">
          {/* Card principal */}
          <article className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl">{tipoInfo.icon}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${prioInfo.cor}`}>
                  {prioInfo.label}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.cor}`}>
                  {statusInfo.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Controles de suporte/admin */}
                {podeGerir && (
                  <>
                    <div className="relative">
                      <button
                        onClick={() => { setEditandoStatus(v => !v); setEditandoPrioridade(false) }}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition border border-gray-200 dark:border-gray-700"
                      >
                        Status ▾
                      </button>
                      {editandoStatus && (
                        <div className="absolute right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 py-1 min-w-[160px]">
                          {STATUS_CHAMADO.map(s => (
                            <button
                              key={s.value}
                              onClick={() => handleAlterarStatus(s.value)}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition
                                ${chamado.status === s.value ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => { setEditandoPrioridade(v => !v); setEditandoStatus(false) }}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition border border-gray-200 dark:border-gray-700"
                      >
                        Prioridade ▾
                      </button>
                      {editandoPrioridade && (
                        <div className="absolute right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 py-1 min-w-[140px]">
                          {PRIORIDADES_CHAMADO.map(p => (
                            <button
                              key={p.value}
                              onClick={() => handleAlterarPrioridade(p.value)}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition
                                ${chamado.prioridade === p.value ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Excluir */}
                {podeExcluir && (
                  confirmando ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Excluir?</span>
                      <button onClick={handleExcluirChamado} className="text-xs text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg transition">
                        Sim
                      </button>
                      <button onClick={() => setConfirmando(false)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1.5 transition">
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmando(true)}
                      className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir
                    </button>
                  )
                )}
              </div>
            </div>

            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{chamado.titulo}</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              Aberto em {formatarData(chamado.criado_em)}
              {nomeCriador && (
                <> por <span className="font-medium text-gray-600 dark:text-gray-300">{nomeCriador}</span></>
              )}
            </p>

            {chamado.descricao && (
              <>
                <div className="h-px bg-gray-100 dark:bg-gray-800 mb-4" />
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {chamado.descricao}
                </p>
              </>
            )}
          </article>

          {/* Comentários */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
              Comentários ({comentarios.length})
            </h2>

            {comentarios.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Nenhum comentário ainda.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {comentarios.map(com => (
                  <div key={com.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-950/60 flex items-center justify-center text-brand-700 dark:text-brand-300 text-xs font-semibold shrink-0">
                      {com.criado_por ? '👤' : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{formatarData(com.criado_em)}</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{com.conteudo}</p>
                    </div>
                    {(isSuporte || user?.id === com.criado_por) && (
                      <button
                        onClick={() => handleExcluirComentario(com.id)}
                        className="shrink-0 text-gray-300 dark:text-gray-600 hover:text-red-400 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Caixa de comentário */}
            <div className="flex gap-2">
              <textarea
                value={novoComentario}
                onChange={e => setNovoComentario(e.target.value)}
                rows={2}
                placeholder="Adicione um comentário..."
                className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                  rounded-xl px-3 py-2 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
              />
              <button
                onClick={handleComentario}
                disabled={salvandoComentario || !novoComentario.trim()}
                className="self-end bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
              >
                {salvandoComentario ? '...' : 'Enviar'}
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <Link to="/chamados" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition">
              ← Voltar para chamados
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
