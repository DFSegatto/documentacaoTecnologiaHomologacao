import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, agruparSessoes, type CategoriaDB, type Sessao, type SessaoComFilhas } from '../lib/supabase'
import Navbar from '../components/Navbar'
import CategoriaBadge from '../components/CategoriaBadge'
import Footer from '../components/Footer'
import MuralAvisos from '../components/MuralAvisos'

interface RegistroLista {
  id: string
  titulo: string
  conteudo: string
  criado_em: string
  sessao: Sessao | null
  categoria: CategoriaDB | null
}

const POR_PAGINA = 10

export default function Home({ user }: { user: User | null }) {
  const [registros,          setRegistros]          = useState<RegistroLista[]>([])
  const [total,              setTotal]              = useState(0)
  const [pagina,             setPagina]             = useState(1)
  const [arvore,             setArvore]             = useState<SessaoComFilhas[]>([])
  const [todasSessoes,       setTodasSessoes]       = useState<Sessao[]>([])
  const [categorias,         setCategorias]         = useState<CategoriaDB[]>([])
  const [contagensSessao,    setContagensSessao]    = useState<Record<string, number>>({})
  const [contagensCategoria, setContagensCategoria] = useState<Record<string, number>>({})
  const [loading,            setLoading]            = useState(true)
  const [searchParams,       setSearchParams]       = useSearchParams()

  const sessaoFiltro    = searchParams.get('sessao')    ?? ''
  const categoriaFiltro = searchParams.get('categoria') ?? ''
  const busca           = searchParams.get('q')         ?? ''

  // Carrega sessões e categorias uma única vez
  useEffect(() => {
    supabase.from('sessoes').select('*').order('nome').then(({ data }) => {
      const lista = (data ?? []) as Sessao[]
      setTodasSessoes(lista)
      setArvore(agruparSessoes(lista))
    })
    supabase.from('categorias').select('*').order('nome').then(({ data }) =>
      setCategorias((data ?? []) as CategoriaDB[])
    )
  }, [])

  // Carrega contagens totais por sessão/categoria (sem paginação — só IDs)
  useEffect(() => {
    supabase.from('registros').select('sessao_id, categoria_id').then(({ data }) => {
      const mapS: Record<string, number> = {}
      const mapC: Record<string, number> = {}
      data?.forEach(r => {
        const sk = r.sessao_id ?? 'sem-sessao'
        mapS[sk] = (mapS[sk] || 0) + 1
        if (r.categoria_id) mapC[r.categoria_id] = (mapC[r.categoria_id] || 0) + 1
      })
      setContagensSessao(mapS)
      setContagensCategoria(mapC)
    })
  }, [])

  // Carrega página atual — reseta para página 1 quando filtros mudam
  const carregarPagina = useCallback(async (pag: number) => {
    setLoading(true)

    const from = (pag - 1) * POR_PAGINA
    const to   = from + POR_PAGINA - 1

    let query = supabase
      .from('registros')
      .select(
        'id, titulo, conteudo, criado_em, sessao:sessoes(id,nome,cor,descricao,criado_em), categoria:categorias(id,nome,cor,criado_em)',
        { count: 'exact' }
      )
      .order('criado_em', { ascending: false })
      .range(from, to)

    if (sessaoFiltro === 'sem-sessao') query = query.is('sessao_id', null)
    else if (sessaoFiltro)             query = query.eq('sessao_id', sessaoFiltro)
    if (categoriaFiltro)               query = query.eq('categoria_id', categoriaFiltro)
    if (busca)                         query = query.or(`titulo.ilike.%${busca}%,conteudo.ilike.%${busca}%`)

    const { data, count } = await query
    setRegistros((data ?? []) as unknown as RegistroLista[])
    setTotal(count ?? 0)
    setLoading(false)
  }, [sessaoFiltro, categoriaFiltro, busca])

  // Quando filtros mudam, volta para página 1
  useEffect(() => {
    setPagina(1)
  }, [sessaoFiltro, categoriaFiltro, busca])

  // Carrega sempre que página ou filtros mudam
  useEffect(() => {
    carregarPagina(pagina)
  }, [pagina, carregarPagina])

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value); else p.delete(key)
    if (key === 'sessao') p.delete('categoria')
    setSearchParams(p)
  }

  function irParaPagina(nova: number) {
    setPagina(nova)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resumo(html: string, termo = '') {
    const texto = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!termo) return texto.slice(0, 130) + (texto.length > 130 ? '...' : '')
    const idx = texto.toLowerCase().indexOf(termo.toLowerCase())
    if (idx === -1) return texto.slice(0, 130) + '...'
    const start = Math.max(0, idx - 40)
    const end   = Math.min(texto.length, idx + termo.length + 80)
    return (start > 0 ? '...' : '') + texto.slice(start, end) + (end < texto.length ? '...' : '')
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  const totalPaginas   = Math.ceil(total / POR_PAGINA)
  const totalSessoes   = Object.values(contagensSessao).reduce((a, b) => a + b, 0)
  const categoriasVis  = categoriaFiltro || sessaoFiltro
    ? categorias.filter(c => contagensCategoria[c.id])
    : categorias

  // Gera os números de página a mostrar: sempre primeira, última e janela de ±2 ao redor da atual
  function paginasVisiveis(): (number | '...')[] {
    if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1)
    const set = new Set([1, totalPaginas, pagina - 1, pagina, pagina + 1, pagina - 2, pagina + 2])
    const nums = [...set].filter(n => n >= 1 && n <= totalPaginas).sort((a, b) => a - b)
    const result: (number | '...')[] = []
    nums.forEach((n, i) => {
      if (i > 0 && n - (nums[i - 1] as number) > 1) result.push('...')
      result.push(n)
    })
    return result
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950">
      <Navbar userEmail={user?.email} />
      <main className="max-w-6xl mx-auto px-4 py-8">

        <MuralAvisos />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Registros</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total} {total === 1 ? 'registro' : 'registros'}
            {busca && <> para <strong>"{busca}"</strong></>}
          </p>
        </div>

        <div className="flex gap-6">
          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <aside className="w-56 flex-shrink-0 space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 mb-1.5">Sessões</p>
              <div className="space-y-0.5">
                <button onClick={() => setParam('sessao', '')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition
                    ${!sessaoFiltro ? 'bg-brand-600 text-white font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'}`}>
                  <span>Todas</span>
                  <span className={`text-xs ${!sessaoFiltro ? 'text-brand-200' : 'text-gray-400'}`}>{totalSessoes}</span>
                </button>

                {arvore.map(sessao => {
                  const totalSessao = (contagensSessao[sessao.id] ?? 0) +
                    sessao.filhas.reduce((acc, f) => acc + (contagensSessao[f.id] ?? 0), 0)
                  const ativa      = sessaoFiltro === sessao.id
                  const filhaAtiva = sessao.filhas.some(f => f.id === sessaoFiltro)
                  return (
                    <div key={sessao.id}>
                      <button onClick={() => setParam('sessao', sessao.id)}
                        className={`w-full flex items-center gap-2 justify-between px-3 py-2 rounded-lg text-sm transition
                          ${ativa ? 'font-medium text-white' : filhaAtiva ? 'text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-800' : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'}`}
                        style={ativa ? { backgroundColor: sessao.cor } : {}}>
                        <span className="flex items-center gap-1.5 min-w-0">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            style={{ color: ativa ? 'white' : sessao.cor }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          <span className="truncate">{sessao.nome}</span>
                        </span>
                        <span className={`text-xs flex-shrink-0 ${ativa ? 'opacity-70' : 'text-gray-400'}`}>{totalSessao}</span>
                      </button>
                      {sessao.filhas.map((filha, idx) => {
                        const filhaAtv = sessaoFiltro === filha.id
                        return (
                          <button key={filha.id} onClick={() => setParam('sessao', filha.id)}
                            className={`w-full flex items-center gap-1.5 justify-between pl-6 pr-3 py-1.5 rounded-lg text-xs transition
                              ${filhaAtv ? 'font-medium text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            style={filhaAtv ? { backgroundColor: filha.cor } : {}}>
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="flex-shrink-0 text-gray-300" style={{ fontSize: 10 }}>
                                {idx === sessao.filhas.length - 1 ? '└' : '├'}
                              </span>
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                style={{ color: filhaAtv ? 'white' : filha.cor }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                              <span className="truncate">{filha.nome}</span>
                            </span>
                            <span className={`flex-shrink-0 ${filhaAtv ? 'opacity-70' : 'text-gray-400'}`}>
                              {contagensSessao[filha.id] ?? 0}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}

                <button onClick={() => setParam('sessao', 'sem-sessao')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition
                    ${sessaoFiltro === 'sem-sessao' ? 'bg-gray-700 dark:bg-gray-600 text-white font-medium' : 'text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                  <span>Sem sessão</span>
                  <span className={`text-xs ${sessaoFiltro === 'sem-sessao' ? 'text-gray-300' : 'text-gray-300'}`}>
                    {contagensSessao['sem-sessao'] ?? 0}
                  </span>
                </button>
              </div>
            </div>

            {/* Categorias */}
            {categoriasVis.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 mb-1.5">Categorias</p>
                <div className="space-y-0.5">
                  {categoriaFiltro && (
                    <button onClick={() => setParam('categoria', '')}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
                      ← Todas as categorias
                    </button>
                  )}
                  {categoriasVis.map(cat => (
                    <button key={cat.id}
                      onClick={() => setParam('categoria', categoriaFiltro === cat.id ? '' : cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition
                        ${categoriaFiltro === cat.id ? 'bg-gray-100 dark:bg-gray-800 font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'}`}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cat.cor}`}>
                        {cat.nome}
                      </span>
                      <span className="text-xs text-gray-400">{contagensCategoria[cat.id] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {todasSessoes.length === 0 && (
              <Link to="/sessoes" className="block px-3 py-2 text-xs text-brand-600 dark:text-brand-400 hover:underline">
                + Criar sessões
              </Link>
            )}
          </aside>

          {/* ── Lista de registros ──────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-3">

            {/* Busca */}
            <div className="mb-4">
              <input type="search" value={busca} onChange={e => setParam('q', e.target.value)}
                placeholder="Busca por título ou conteúdo..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent
                           placeholder:text-gray-400 dark:placeholder:text-gray-500 transition" />
            </div>

            {/* Cards */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : registros.length > 0 ? (
              <>
                {registros.map(r => (
                  <Link key={r.id} to={`/registros/${r.id}`}
                    className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5
                               hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-sm transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {r.sessao && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md"
                              style={{ backgroundColor: r.sessao.cor + '22', color: r.sessao.cor }}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                              {r.sessao.nome}
                            </span>
                          )}
                          {r.categoria && <CategoriaBadge categoria={r.categoria} />}
                          <span className="text-xs text-gray-400 dark:text-gray-500">{formatarData(r.criado_em)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition truncate">
                          {r.titulo}
                        </h2>
                        {(r as any).privado && (
                          <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                      </div>
                        {busca && !r.titulo.toLowerCase().includes(busca.toLowerCase()) &&
                          r.conteudo.toLowerCase().includes(busca.toLowerCase()) && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Encontrado no conteúdo
                          </span>
                        )}
                        {r.conteudo && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                            {resumo(r.conteudo, busca)}
                          </p>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-brand-400 transition flex-shrink-0 mt-1"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}

                {/* ── Paginação ─────────────────────────────────────── */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                    {/* Info */}
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {((pagina - 1) * POR_PAGINA) + 1}–{Math.min(pagina * POR_PAGINA, total)} de {total}
                    </p>

                    {/* Controles */}
                    <div className="flex items-center gap-1">
                      {/* Anterior */}
                      <button
                        onClick={() => irParaPagina(pagina - 1)}
                        disabled={pagina === 1}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400
                                   hover:bg-white dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 transition disabled:opacity-30
                                   disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">Anterior</span>
                      </button>

                      {/* Números */}
                      <div className="flex items-center gap-0.5">
                        {paginasVisiveis().map((p, i) =>
                          p === '...' ? (
                            <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-gray-400 dark:text-gray-500 select-none">
                              …
                            </span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => irParaPagina(p as number)}
                              className={`w-8 h-8 rounded-lg text-sm transition font-medium
                                ${pagina === p
                                  ? 'bg-brand-600 text-white'
                                  : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100'}`}
                            >
                              {p}
                            </button>
                          )
                        )}
                      </div>

                      {/* Próxima */}
                      <button
                        onClick={() => irParaPagina(pagina + 1)}
                        disabled={pagina === totalPaginas}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400
                                   hover:bg-white dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 transition disabled:opacity-30
                                   disabled:cursor-not-allowed"
                      >
                        <span className="hidden sm:inline">Próxima</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 text-gray-400 dark:text-gray-500">
                <div className="text-5xl mb-3">🗂</div>
                <p className="font-medium text-gray-600 dark:text-gray-300">Nenhum registro encontrado</p>
                <p className="text-sm mt-1">
                  {sessaoFiltro
                    ? <Link to={`/registros/novo?sessao=${sessaoFiltro}`} className="text-brand-600 dark:text-brand-400 hover:underline">
                        Criar registro nesta sessão
                      </Link>
                    : 'Crie o primeiro usando o botão "Novo registro"'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
