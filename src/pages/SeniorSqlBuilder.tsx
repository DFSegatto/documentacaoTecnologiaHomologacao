import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Tabela {
  codigo: string
  nome:   string
}

interface Campo {
  tabela:    string
  campo:     string
  tituloCurto:  string
  tituloMedio:  string
  descricao:    string
}

type TipoComando = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'

// ── Parser CSV ────────────────────────────────────────────────────────────────
function parseTabelas(csv: string): Tabela[] {
  const linhas = csv.split('\n').slice(1) // remove header
  return linhas
    .map(l => l.replace(/\r$/, '').split(';'))
    .filter(p => p.length >= 2 && p[0].trim())
    .map(p => ({ codigo: p[0].trim(), nome: p[1].trim() }))
}

function parseCampos(csv: string): Map<string, Campo[]> {
  const map = new Map<string, Campo[]>()
  const linhas = csv.split('\n').slice(1)

  // Agrupa por tabela+campo, depois by propriedade
  const temp = new Map<string, { p1: string; p2: string; p3: string }>()

  for (const linha of linhas) {
    const partes = linha.replace(/\r$/, '').split(';')
    if (partes.length < 4 || !partes[0].trim()) continue
    const tabela  = partes[0].trim()
    const campo   = partes[1].trim()
    const prop    = partes[2].trim()
    const ptbr    = partes[3].trim()
    const chave   = `${tabela}||${campo}`

    if (!temp.has(chave)) temp.set(chave, { p1: '', p2: '', p3: '' })
    const entry = temp.get(chave)!
    if (prop === '1') entry.p1 = ptbr
    if (prop === '2') entry.p2 = ptbr
    if (prop === '3') entry.p3 = ptbr
  }

  for (const [chave, props] of temp.entries()) {
    const [tabela, campo] = chave.split('||')
    if (!map.has(tabela)) map.set(tabela, [])
    map.get(tabela)!.push({
      tabela,
      campo,
      tituloCurto:  props.p1 || props.p2 || campo,
      tituloMedio:  props.p2 || props.p1 || campo,
      descricao:    props.p3 || props.p2 || props.p1 || campo,
    })
  }

  return map
}

// ── Gerador SQL ───────────────────────────────────────────────────────────────
function gerarSQL(tabela: string, campos: string[], tipo: TipoComando): string {
  if (!campos.length) return '-- Selecione pelo menos um campo'

  switch (tipo) {
    case 'SELECT':
      return `SELECT\n  ${campos.join(',\n  ')}\nFROM ${tabela};`

    case 'INSERT':
      return (
        `INSERT INTO ${tabela} (\n  ${campos.join(',\n  ')}\n) VALUES (\n` +
        campos.map(c => `  :${c.toLowerCase()}`).join(',\n') +
        '\n);'
      )

    case 'UPDATE':
      return (
        `UPDATE ${tabela} SET\n` +
        campos.map(c => `  ${c} = :${c.toLowerCase()}`).join(',\n') +
        `\nWHERE\n  -- adicione a condição aqui\n  1 = 1;`
      )

    case 'DELETE':
      return (
        `DELETE FROM ${tabela}\nWHERE\n  -- adicione a condição aqui\n  1 = 1;\n` +
        `-- Campos de referência:\n-- ${campos.join(', ')}`
      )
  }
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SeniorSqlBuilder({ user }: { user: User | null }) {
  const [tabelas,      setTabelas]      = useState<Tabela[]>([])
  const [camposMap,    setCamposMap]    = useState<Map<string, Campo[]>>(new Map())
  const [loading,      setLoading]      = useState(true)
  const [erro,         setErro]         = useState<string | null>(null)

  // Seleção
  const [buscaTabela,  setBuscaTabela]  = useState('')
  const [tabelaSel,    setTabelaSel]    = useState<Tabela | null>(null)
  const [camposSel,    setCamposSel]    = useState<Set<string>>(new Set())
  const [buscaCampo,   setBuscaCampo]   = useState('')
  const [tipoSQL,      setTipoSQL]      = useState<TipoComando>('SELECT')
  const [copiado,      setCopiado]      = useState(false)
  const [tabelaAberta, setTabelaAberta] = useState(false)

  const inputTabelaRef = useRef<HTMLInputElement>(null)
  const dropdownRef    = useRef<HTMLDivElement>(null)

  // ── Carrega CSVs ─────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/senior_tabelas.csv').then(r => r.text()),
      fetch('/senior_campos.csv').then(r => r.text()),
    ]).then(([csvTab, csvCamp]) => {
      setTabelas(parseTabelas(csvTab))
      setCamposMap(parseCampos(csvCamp))
      setLoading(false)
    }).catch(() => {
      setErro('Não foi possível carregar os dados do Senior.')
      setLoading(false)
    })
  }, [])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTabelaAberta(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Dados derivados ───────────────────────────────────────────────────────
  const tabelasFiltradas = useMemo(() => {
    if (!buscaTabela.trim()) return tabelas.slice(0, 50)
    const q = buscaTabela.toLowerCase()
    return tabelas
      .filter(t => t.codigo.toLowerCase().includes(q) || t.nome.toLowerCase().includes(q))
      .slice(0, 50)
  }, [tabelas, buscaTabela])

  const camposDaTabela = useMemo(() => {
    if (!tabelaSel) return []
    return camposMap.get(tabelaSel.codigo) ?? []
  }, [tabelaSel, camposMap])

  const camposFiltrados = useMemo(() => {
    if (!buscaCampo.trim()) return camposDaTabela
    const q = buscaCampo.toLowerCase()
    return camposDaTabela.filter(c =>
      c.campo.toLowerCase().includes(q) ||
      c.tituloCurto.toLowerCase().includes(q) ||
      c.descricao.toLowerCase().includes(q)
    )
  }, [camposDaTabela, buscaCampo])

  const sqlGerado = useMemo(() => {
    if (!tabelaSel) return ''
    return gerarSQL(tabelaSel.codigo, Array.from(camposSel), tipoSQL)
  }, [tabelaSel, camposSel, tipoSQL])

  // ── Ações ─────────────────────────────────────────────────────────────────
  function selecionarTabela(t: Tabela) {
    setTabelaSel(t)
    setCamposSel(new Set())
    setBuscaCampo('')
    setBuscaTabela(t.codigo)
    setTabelaAberta(false)
  }

  function toggleCampo(campo: string) {
    setCamposSel(prev => {
      const next = new Set(prev)
      next.has(campo) ? next.delete(campo) : next.add(campo)
      return next
    })
  }

  function toggleTodos() {
    if (camposSel.size === camposFiltrados.length) {
      setCamposSel(new Set())
    } else {
      setCamposSel(new Set(camposFiltrados.map(c => c.campo)))
    }
  }

  function copiarSQL() {
    if (!sqlGerado) return
    navigator.clipboard.writeText(sqlGerado).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  function limpar() {
    setTabelaSel(null)
    setCamposSel(new Set())
    setBuscaTabela('')
    setBuscaCampo('')
    setTipoSQL('SELECT')
  }

  const TIPOS: TipoComando[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
  const corTipo: Record<TipoComando, string> = {
    SELECT: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    INSERT: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 border-green-200 dark:border-green-800',
    UPDATE: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800',
  }
  const corTipoAtivo: Record<TipoComando, string> = {
    SELECT: 'bg-blue-600 text-white border-blue-600',
    INSERT: 'bg-green-600 text-white border-green-600',
    UPDATE: 'bg-amber-500 text-white border-amber-500',
    DELETE: 'bg-red-600 text-white border-red-600',
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />

      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-6">
          <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition">Registros</Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-200">Senior SQL Builder</span>
        </div>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Senior SQL Builder</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Selecione a tabela e os campos para gerar comandos SQL do Senior
            </p>
          </div>
          {(tabelaSel || camposSel.size > 0) && (
            <button onClick={limpar}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpar
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Carregando tabelas do Senior…</p>
            </div>
          </div>
        ) : erro ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 text-red-700 dark:text-red-300 text-sm">
            {erro}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] gap-4">

            {/* ── Coluna 1: Selecionar tabela ───────────────────────────── */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  1. Tabela
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {tabelas.length.toLocaleString('pt-BR')} tabelas disponíveis
                </p>
              </div>

              <div className="p-4 flex-1">
                <div className="relative" ref={dropdownRef}>
                  <input
                    ref={inputTabelaRef}
                    type="text"
                    value={buscaTabela}
                    onChange={e => { setBuscaTabela(e.target.value); setTabelaAberta(true) }}
                    onFocus={() => setTabelaAberta(true)}
                    placeholder="Buscar por código ou nome…"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />

                  {tabelaAberta && (
                    <div className="absolute top-full mt-1 left-0 right-0 z-30 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/60 dark:shadow-black/40 overflow-hidden">
                      <div className="max-h-72 overflow-y-auto">
                        {tabelasFiltradas.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-400">Nenhuma tabela encontrada</p>
                        ) : (
                          tabelasFiltradas.map(t => (
                            <button
                              key={t.codigo}
                              onClick={() => selecionarTabela(t)}
                              className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${tabelaSel?.codigo === t.codigo ? 'bg-brand-50 dark:bg-brand-950/40' : ''}`}
                            >
                              <span className="block text-xs font-mono font-semibold text-brand-600 dark:text-brand-400">{t.codigo}</span>
                              <span className="block text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{t.nome}</span>
                            </button>
                          ))
                        )}
                      </div>
                      {!buscaTabela && (
                        <p className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                          Digite para filtrar todas as {tabelas.length.toLocaleString('pt-BR')} tabelas
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {tabelaSel && (
                  <div className="mt-4 p-3.5 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800">
                    <p className="text-xs font-mono font-bold text-brand-700 dark:text-brand-300">{tabelaSel.codigo}</p>
                    <p className="text-xs text-brand-600/80 dark:text-brand-400/80 mt-1 leading-relaxed">{tabelaSel.nome}</p>
                    <p className="text-xs text-brand-500 dark:text-brand-500 mt-2">
                      {camposDaTabela.length} campo{camposDaTabela.length !== 1 ? 's' : ''} disponíve{camposDaTabela.length !== 1 ? 'is' : 'l'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Coluna 2: Selecionar campos ───────────────────────────── */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">2. Campos</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {camposSel.size > 0 ? `${camposSel.size} selecionado${camposSel.size !== 1 ? 's' : ''}` : 'Nenhum selecionado'}
                  </p>
                </div>
                {tabelaSel && camposFiltrados.length > 0 && (
                  <button
                    onClick={toggleTodos}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline shrink-0"
                  >
                    {camposSel.size === camposFiltrados.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col gap-3">
                {!tabelaSel ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
                      Selecione uma tabela primeiro
                    </p>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={buscaCampo}
                      onChange={e => setBuscaCampo(e.target.value)}
                      placeholder="Filtrar campos…"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />

                    <div className="flex-1 overflow-y-auto max-h-80 space-y-1 pr-1">
                      {camposFiltrados.length === 0 ? (
                        <p className="text-sm text-gray-400 py-4 text-center">Nenhum campo encontrado</p>
                      ) : (
                        camposFiltrados.map(c => {
                          const selecionado = camposSel.has(c.campo)
                          return (
                            <button
                              key={c.campo}
                              onClick={() => toggleCampo(c.campo)}
                              className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                                selecionado
                                  ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-300 dark:border-brand-700'
                                  : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-all ${
                                selecionado
                                  ? 'bg-brand-600 border-brand-600'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {selecionado && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-mono font-semibold ${selecionado ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                  {c.campo}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                  {c.descricao}
                                </p>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Coluna 3: Tipo e SQL gerado ───────────────────────────── */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">3. Comando SQL</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Escolha o tipo e copie o comando</p>
              </div>

              <div className="p-4 flex-1 flex flex-col gap-4">

                {/* Tipo de comando */}
                <div className="grid grid-cols-4 gap-1.5">
                  {TIPOS.map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setTipoSQL(tipo)}
                      className={`py-2 rounded-xl border text-xs font-bold tracking-wide transition-all ${
                        tipoSQL === tipo ? corTipoAtivo[tipo] : corTipo[tipo]
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>

                {/* SQL output */}
                <div className="flex-1 flex flex-col gap-2">
                  <div className="relative flex-1">
                    <pre className={`w-full h-full min-h-[220px] max-h-80 overflow-auto p-4 rounded-xl border text-xs font-mono leading-relaxed whitespace-pre-wrap break-all ${
                      tabelaSel && camposSel.size > 0
                        ? 'bg-gray-950 dark:bg-gray-950 text-green-400 border-gray-700'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700'
                    }`}>
                      {tabelaSel && camposSel.size > 0
                        ? sqlGerado
                        : tabelaSel
                          ? '-- Selecione pelo menos um campo'
                          : '-- Selecione uma tabela e campos\n-- para gerar o comando SQL'}
                    </pre>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    <button
                      onClick={copiarSQL}
                      disabled={!tabelaSel || camposSel.size === 0}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {copiado ? (
                        <>
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-600">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copiar SQL
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Campos selecionados */}
                {camposSel.size > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Campos selecionados ({camposSel.size})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(camposSel).map(campo => (
                        <span
                          key={campo}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-mono text-gray-700 dark:text-gray-300"
                        >
                          {campo}
                          <button
                            onClick={() => toggleCampo(campo)}
                            className="text-gray-400 hover:text-red-500 transition ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
