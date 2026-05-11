import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, CORES_SESSAO, agruparSessoes, type Sessao, type SessaoComFilhas } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Sessoes({ user }: { user: User | null }) {
  const [arvore,      setArvore]      = useState<SessaoComFilhas[]>([])
  const [todasSessoes,setTodasSessoes]= useState<Sessao[]>([])
  const [contagens,   setContagens]   = useState<Record<string, number>>({})
  const [loading,     setLoading]     = useState(true)
  const [salvando,    setSalvando]    = useState(false)
  const [excluindo,   setExcluindo]   = useState<string | null>(null)
  const [editando,    setEditando]    = useState<Sessao | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nome,        setNome]        = useState('')
  const [descricao,   setDescricao]   = useState('')
  const [cor,         setCor]         = useState(CORES_SESSAO[0].value)
  const [parentId,    setParentId]    = useState<string>('')
  const [erro,        setErro]        = useState('')

  async function carregar() {
    setLoading(true)
    const { data: sess } = await supabase.from('sessoes').select('*').order('nome')
    const { data: regs } = await supabase.from('registros').select('sessao_id')
    const map: Record<string, number> = {}
    regs?.forEach(r => { if (r.sessao_id) map[r.sessao_id] = (map[r.sessao_id] || 0) + 1 })
    const lista = (sess ?? []) as Sessao[]
    setTodasSessoes(lista)
    setArvore(agruparSessoes(lista))
    setContagens(map)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrirFormNovo(parentIdInicial = '') {
    setEditando(null)
    setNome(''); setDescricao(''); setCor(CORES_SESSAO[0].value); setParentId(parentIdInicial)
    setMostrarForm(true); setErro('')
  }

  function iniciarEdicao(s: Sessao) {
    setEditando(s)
    setNome(s.nome); setDescricao(s.descricao); setCor(s.cor); setParentId(s.parent_id ?? '')
    setMostrarForm(true); setErro('')
  }

  function cancelar() {
    setEditando(null); setNome(''); setDescricao(''); setCor(CORES_SESSAO[0].value); setParentId('')
    setMostrarForm(false); setErro('')
  }

  async function salvar() {
    if (!nome.trim()) { setErro('O nome é obrigatório.'); return }
    // Impede sub-sessão de uma sub-sessão (máximo 2 níveis)
    if (parentId) {
      const pai = todasSessoes.find(s => s.id === parentId)
      if (pai?.parent_id) { setErro('Não é possível criar sub-sessão de uma sub-sessão.'); return }
    }
    setSalvando(true); setErro('')

    const payload = {
      nome:      nome.trim(),
      descricao: descricao.trim(),
      cor,
      parent_id: parentId || null,
    }

    if (editando) {
      // Impede que uma sessão seja pai de si mesma
      if (parentId === editando.id) { setErro('Uma sessão não pode ser sub-sessão de si mesma.'); setSalvando(false); return }
      const { error } = await supabase.from('sessoes').update(payload).eq('id', editando.id)
      if (error) { setErro('Erro ao salvar.'); setSalvando(false); return }
    } else {
      const { error } = await supabase.from('sessoes').insert(payload)
      if (error) { setErro('Erro ao criar.'); setSalvando(false); return }
    }

    await carregar(); cancelar(); setSalvando(false)
  }

  async function excluir(id: string) {
    setExcluindo(id)
    // Promove filhas para o nível raiz antes de excluir
    await supabase.from('sessoes').update({ parent_id: null }).eq('parent_id', id)
    await supabase.from('sessoes').delete().eq('id', id)
    await carregar(); setExcluindo(null)
  }

  // Sessões raiz disponíveis para ser pai (exclui a que está sendo editada e suas filhas)
  const paísDisponiveis = todasSessoes.filter(s =>
    !s.parent_id &&
    s.id !== editando?.id
  )

  function contagem(s: Sessao, filhas: Sessao[]) {
    const propria = contagens[s.id] ?? 0
    const filhasTotal = filhas.reduce((acc, f) => acc + (contagens[f.id] ?? 0), 0)
    return propria + filhasTotal
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />
      <main className="max-w-2xl mx-auto px-4 py-8 flex-1">

        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-6">
          <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition">Registros</Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-200">Sessões</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Sessões</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Organize registros em sessões e sub-sessões</p>
          </div>
          {!mostrarForm && (
            <button onClick={() => abrirFormNovo()}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova sessão
            </button>
          )}
        </div>

        {/* Formulário */}
        {mostrarForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {editando
                ? `Editar: ${editando.nome}`
                : parentId
                  ? `Nova sub-sessão de "${todasSessoes.find(s => s.id === parentId)?.nome}"`
                  : 'Nova sessão'
              }
            </h2>

            <div className="space-y-4">
              {/* Sessão pai */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Tipo
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setParentId('')}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition border
                      ${!parentId ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                    Sessão principal
                  </button>
                  {paísDisponiveis.length > 0 && (
                    <select
                      value={parentId}
                      onChange={e => setParentId(e.target.value)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-sm border transition
                        ${parentId ? 'border-brand-400 bg-brand-50 text-brand-700 font-medium' : 'border-gray-200 text-gray-500'}`}
                    >
                      <option value="">Sub-sessão de...</option>
                      {paísDisponiveis.map(s => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                  )}
                </div>
                {parentId && (
                  <p className="text-xs text-brand-600 mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Sub-sessão de <strong>{todasSessoes.find(s => s.id === parentId)?.nome}</strong>
                  </p>
                )}
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nome</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && salvar()}
                  placeholder={parentId ? 'Ex: Módulo de Férias, Versão 2.0...' : 'Ex: ERP, eDocs, Apontamento Web...'}
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-gray-500" />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Descrição <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Descreva brevemente o conteúdo desta sessão"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-gray-500" />
              </div>

              {/* Cor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {CORES_SESSAO.map(c => (
                    <button key={c.value} type="button" onClick={() => setCor(c.value)}
                      className={`w-8 h-8 rounded-lg transition border-2 ${cor === c.value ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.value }} title={c.label} />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Pré-visualização:</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-white`}
                    style={{ backgroundColor: cor }}>
                    {parentId && (
                      <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {nome || (parentId ? 'Nome da sub-sessão' : 'Nome da sessão')}
                  </span>
                </div>
              </div>

              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button type="button" onClick={cancelar} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
                  Cancelar
                </button>
                <button type="button" onClick={salvar} disabled={salvando}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition disabled:opacity-60">
                  {salvando
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</>
                    : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>{editando ? 'Salvar alterações' : parentId ? 'Criar sub-sessão' : 'Criar sessão'}</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista em árvore */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : arvore.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📂</div>
              <p className="font-medium text-gray-600">Nenhuma sessão criada</p>
              <p className="text-sm mt-1">Clique em "Nova sessão" para começar</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {arvore.map(sessao => (
                <div key={sessao.id}>
                  {/* Sessão raiz */}
                  <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: sessao.cor + '22' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          style={{ color: sessao.cor }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{sessao.nome}</p>
                        {sessao.descricao && <p className="text-xs text-gray-400 truncate">{sessao.descricao}</p>}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                        {contagem(sessao, sessao.filhas)} reg.
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => abrirFormNovo(sessao.id)} title="Nova sub-sessão"
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition text-xs flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline text-xs">Sub-sessão</span>
                      </button>
                      <button onClick={() => iniciarEdicao(sessao)} title="Editar"
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => excluir(sessao.id)} disabled={excluindo === sessao.id}
                        title="Excluir"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                        {excluindo === sessao.id
                          ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        }
                      </button>
                    </div>
                  </div>

                  {/* Sub-sessões */}
                  {sessao.filhas.map((filha, idx) => (
                    <div key={filha.id}
                      className="flex items-center justify-between pl-14 pr-5 py-3 bg-gray-50/60 dark:bg-gray-800/40 hover:bg-gray-100/60 dark:hover:bg-gray-800/80 transition group border-t border-gray-100/80 dark:border-gray-800/80">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Conector visual */}
                        <div className="flex-shrink-0 flex items-center">
                          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d={idx === sessao.filhas.length - 1 ? "M4 6v6 M4 12h8" : "M4 4v14 M4 12h8"} />
                          </svg>
                        </div>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: filha.cor + '33' }}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            style={{ color: filha.cor }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{filha.nome}</p>
                          {filha.descricao && <p className="text-xs text-gray-400 truncate">{filha.descricao}</p>}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                          {contagens[filha.id] ?? 0} reg.
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-3 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => iniciarEdicao(filha)} title="Editar"
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => excluir(filha.id)} disabled={excluindo === filha.id}
                          title="Excluir"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                          {excluindo === filha.id
                            ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sessões sem filhas — botão para adicionar sub-sessão visível na lista */}
        {!loading && arvore.length > 0 && (
          <p className="text-xs text-gray-400 mt-3 px-1">
            Passe o mouse sobre uma sessão para ver as opções de editar, excluir e adicionar sub-sessão.
          </p>
        )}
      </main>
      <Footer />
    </div>
  )
}
