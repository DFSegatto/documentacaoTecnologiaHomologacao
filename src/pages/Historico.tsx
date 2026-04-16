import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, type HistoricoRegistro } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

interface RegistroInfo { id: string; titulo: string }

function diffTexto(anterior: string, atual: string): { adicionadas: number; removidas: number } {
  const limpar = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const palavrasAnt = limpar(anterior).split(' ').filter(Boolean)
  const palavrasAt  = limpar(atual).split(' ').filter(Boolean)
  const setAnt = new Set(palavrasAnt)
  const setAt  = new Set(palavrasAt)
  const adicionadas = palavrasAt.filter(p => !setAnt.has(p)).length
  const removidas   = palavrasAnt.filter(p => !setAt.has(p)).length
  return { adicionadas, removidas }
}

function destacarBusca(html: string, termo: string): string {
  if (!termo) return html
  const texto = html.replace(/<[^>]*>/g, '')
  const idx = texto.toLowerCase().indexOf(termo.toLowerCase())
  if (idx === -1) return texto.slice(0, 200) + '...'
  const start = Math.max(0, idx - 60)
  const end   = Math.min(texto.length, idx + termo.length + 100)
  const trecho = texto.slice(start, end)
  const regex  = new RegExp(`(${termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return (start > 0 ? '...' : '') + trecho.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 rounded px-0.5">$1</mark>') + (end < texto.length ? '...' : '')
}

export default function Historico({ user }: { user: User | null }) {
  const { id } = useParams<{ id: string }>()
  const [registro,   setRegistro]   = useState<RegistroInfo | null>(null)
  const [historico,  setHistorico]  = useState<HistoricoRegistro[]>([])
  const [expandido,  setExpandido]  = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!id) return
    async function carregar() {
      const { data: reg } = await supabase
        .from('registros').select('id, titulo').eq('id', id).single()

      const { data: hist } = await supabase
        .from('registro_historico')
        .select('*')
        .eq('registro_id', id)
        .order('editado_em', { ascending: false })

      setRegistro(reg as RegistroInfo)
      setHistorico((hist ?? []) as HistoricoRegistro[])
      setLoading(false)
    }
    carregar()
  }, [id])

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function resumoConteudo(html: string) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) + '...'
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col">
      <Navbar userEmail={user?.email} />
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col">
      <Navbar userEmail={user?.email} />
      <main className="max-w-3xl mx-auto px-4 py-8 flex-1">

        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-gray-600 transition">Registros</Link>
          <span>/</span>
          <Link to={`/registros/${id}`} className="hover:text-gray-600 transition truncate max-w-xs">
            {registro?.titulo}
          </Link>
          <span>/</span>
          <span className="text-gray-700">Histórico</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Histórico de edições</h1>
          <p className="text-sm text-gray-500 mt-1">
            {historico.length === 0
              ? 'Nenhuma edição registrada ainda'
              : `${historico.length} ${historico.length === 1 ? 'versão anterior salva' : 'versões anteriores salvas'}`
            }
          </p>
        </div>

        {historico.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium text-gray-600">Sem histórico ainda</p>
            <p className="text-sm text-gray-400 mt-1">
              O histórico é salvo automaticamente cada vez que o registro for editado.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Linha do tempo */}
            <div className="absolute left-5 top-5 bottom-5 w-px bg-gray-200" />

            <div className="space-y-4">
              {historico.map((h, idx) => {
                // Compara com a versão seguinte (mais antiga) para mostrar o diff
                const proxima = historico[idx + 1]
                const diff = proxima ? diffTexto(proxima.conteudo, h.conteudo) : null
                const aberto = expandido === h.id

                return (
                  <div key={h.id} className="relative pl-14">
                    {/* Dot na timeline */}
                    <div className={`absolute left-3 top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${idx === 0 ? 'border-brand-600 bg-brand-50' : 'border-gray-300 bg-white'}`}>
                      <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-brand-600' : 'bg-gray-300'}`} />
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      {/* Header da versão */}
                      <button
                        onClick={() => setExpandido(aberto ? null : h.id)}
                        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {idx === 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full">
                                  Versão mais recente salva
                                </span>
                              )}
                              <span className="text-sm text-gray-500">{formatarData(h.editado_em)}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-800 mt-1 truncate">{h.titulo}</p>

                            {/* Diff resumido */}
                            {diff && (diff.adicionadas > 0 || diff.removidas > 0) && (
                              <div className="flex items-center gap-3 mt-1.5">
                                {diff.adicionadas > 0 && (
                                  <span className="text-xs text-green-600 font-medium">
                                    +{diff.adicionadas} {diff.adicionadas === 1 ? 'palavra' : 'palavras'}
                                  </span>
                                )}
                                {diff.removidas > 0 && (
                                  <span className="text-xs text-red-500 font-medium">
                                    −{diff.removidas} {diff.removidas === 1 ? 'palavra' : 'palavras'}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform mt-1 ${aberto ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Conteúdo expandido */}
                      {aberto && (
                        <div className="border-t border-gray-100">
                          <div className="px-5 py-4">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                              Conteúdo desta versão
                            </p>
                            <div
                              className="tiptap-editor text-sm text-gray-700 max-h-80 overflow-y-auto pr-2"
                              dangerouslySetInnerHTML={{ __html: h.conteudo }}
                            />
                          </div>

                          {/* Ações */}
                          <div className="border-t border-gray-50 px-5 py-3 bg-gray-50 flex items-center justify-between">
                            <p className="text-xs text-gray-400">
                              Esta versão foi salva antes de uma edição
                            </p>
                            <Link
                              to={`/registros/${id}/restaurar/${h.id}`}
                              className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
                            >
                              Restaurar esta versão →
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Versão original (criação) */}
              <div className="relative pl-14">
                <div className="absolute left-3 top-4 w-5 h-5 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-gray-200" />
                </div>
                <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
                  <span className="text-xs text-gray-400">Criação do registro</span>
                  <p className="text-sm font-medium text-gray-500 mt-0.5">{registro?.titulo}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
