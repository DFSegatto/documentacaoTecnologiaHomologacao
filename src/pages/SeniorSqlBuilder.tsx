import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Tabela { codigo: string; nome: string }
interface Campo  { tabela: string; campo: string; tituloCurto: string; tituloMedio: string; descricao: string }

type TipoComando = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
type TipoJoin    = 'INNER JOIN' | 'LEFT JOIN' | 'RIGHT JOIN' | 'FULL OUTER JOIN'
type Operador    = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'NOT LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN'
type OrdemDir    = 'ASC' | 'DESC'

interface JoinItem    { id: string; tabela: string; tipo: TipoJoin; campoEsq: string; campoDir: string }
interface WhereItem   { id: string; campo: string; operador: Operador; valor: string; conector: 'AND' | 'OR' }
interface OrderItem   { id: string; campo: string; direcao: OrdemDir }
interface GroupItem   { id: string; campo: string }

type Aba = 'basico' | 'avancado'

// ── Parser CSV ────────────────────────────────────────────────────────────────
function parseTabelas(csv: string): Tabela[] {
  return csv.split('\n').slice(1)
    .map(l => l.replace(/\r$/, '').split(';'))
    .filter(p => p.length >= 2 && p[0].trim())
    .map(p => ({ codigo: p[0].trim(), nome: p[1].trim() }))
}

function parseCampos(csv: string): Map<string, Campo[]> {
  const map  = new Map<string, Campo[]>()
  const temp = new Map<string, { p1: string; p2: string; p3: string }>()
  for (const linha of csv.split('\n').slice(1)) {
    const p = linha.replace(/\r$/, '').split(';')
    if (p.length < 4 || !p[0].trim()) continue
    const chave = `${p[0].trim()}||${p[1].trim()}`
    if (!temp.has(chave)) temp.set(chave, { p1: '', p2: '', p3: '' })
    const e = temp.get(chave)!
    if (p[2] === '1') e.p1 = p[3].trim()
    if (p[2] === '2') e.p2 = p[3].trim()
    if (p[2] === '3') e.p3 = p[3].trim()
  }
  for (const [chave, props] of temp.entries()) {
    const [tabela, campo] = chave.split('||')
    if (!map.has(tabela)) map.set(tabela, [])
    map.get(tabela)!.push({
      tabela, campo,
      tituloCurto: props.p1 || props.p2 || campo,
      tituloMedio: props.p2 || props.p1 || campo,
      descricao:   props.p3 || props.p2 || props.p1 || campo,
    })
  }
  return map
}

// ── Geradores SQL ─────────────────────────────────────────────────────────────
function gerarSQLBasico(tabela: string, campos: string[], tipo: TipoComando): string {
  if (!campos.length) return '-- Selecione pelo menos um campo'
  switch (tipo) {
    case 'SELECT':
      return `SELECT\n  ${campos.join(',\n  ')}\nFROM ${tabela};`
    case 'INSERT':
      return `INSERT INTO ${tabela} (\n  ${campos.join(',\n  ')}\n) VALUES (\n${campos.map(c => `  :${c.toLowerCase()}`).join(',\n')}\n);`
    case 'UPDATE':
      return `UPDATE ${tabela} SET\n${campos.map(c => `  ${c} = :${c.toLowerCase()}`).join(',\n')}\nWHERE\n  -- adicione a condição aqui\n  1 = 1;`
    case 'DELETE':
      return `DELETE FROM ${tabela}\nWHERE\n  -- adicione a condição aqui\n  1 = 1;\n-- Campos de referência:\n-- ${campos.join(', ')}`
  }
}

function gerarSQLAvancado(
  tabela: string,
  alias: string,
  campos: Array<{ tabela: string; alias: string; campo: string }>,
  joins: JoinItem[],
  wheres: WhereItem[],
  groups: GroupItem[],
  having: string,
  orders: OrderItem[],
  limite: string,
): string {
  if (!tabela) return '-- Selecione a tabela principal'
  if (!campos.length) return '-- Selecione pelo menos um campo'

  const linhas: string[] = []

  // SELECT
  const selectCols = campos.map(c => {
    const pref = c.alias ? `${c.alias}.` : ''
    return `  ${pref}${c.campo}`
  })
  linhas.push(`SELECT\n${selectCols.join(',\n')}`)

  // FROM
  linhas.push(`FROM ${tabela}${alias ? ` ${alias}` : ''}`)

  // JOINs
  for (const j of joins) {
    if (!j.tabela || !j.campoEsq || !j.campoDir) continue
    linhas.push(`${j.tipo} ${j.tabela}\n  ON ${j.campoEsq} = ${j.campoDir}`)
  }

  // WHERE
  const wheresValidos = wheres.filter(w => w.campo && (w.operador === 'IS NULL' || w.operador === 'IS NOT NULL' || w.valor))
  if (wheresValidos.length) {
    const clausulas = wheresValidos.map((w, i) => {
      let cond = ''
      if (w.operador === 'IS NULL' || w.operador === 'IS NOT NULL') {
        cond = `${w.campo} ${w.operador}`
      } else if (w.operador === 'IN') {
        cond = `${w.campo} IN (${w.valor})`
      } else if (w.operador === 'BETWEEN') {
        cond = `${w.campo} BETWEEN ${w.valor}`
      } else if (w.operador === 'LIKE' || w.operador === 'NOT LIKE') {
        cond = `${w.campo} ${w.operador} '${w.valor}'`
      } else {
        const isNum = !isNaN(Number(w.valor)) && w.valor !== ''
        cond = `${w.campo} ${w.operador} ${isNum ? w.valor : `'${w.valor}'`}`
      }
      return i === 0 ? `  ${cond}` : `  ${w.conector} ${cond}`
    })
    linhas.push(`WHERE\n${clausulas.join('\n')}`)
  }

  // GROUP BY
  const gruposValidos = groups.filter(g => g.campo)
  if (gruposValidos.length) {
    linhas.push(`GROUP BY\n  ${gruposValidos.map(g => g.campo).join(',\n  ')}`)
  }

  // HAVING
  if (having.trim()) linhas.push(`HAVING\n  ${having.trim()}`)

  // ORDER BY
  const ordensValidas = orders.filter(o => o.campo)
  if (ordensValidas.length) {
    linhas.push(`ORDER BY\n  ${ordensValidas.map(o => `${o.campo} ${o.direcao}`).join(',\n  ')}`)
  }

  // LIMIT (FETCH FIRST no padrão Senior/Oracle)
  if (limite && !isNaN(Number(limite))) {
    linhas.push(`FETCH FIRST ${limite} ROWS ONLY`)
  }

  return linhas.join('\n') + ';'
}

// ── Sub-componentes auxiliares ────────────────────────────────────────────────
function BtnIcone({ onClick, title, danger }: { onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded-lg transition ${danger ? 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {danger
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />}
      </svg>
    </button>
  )
}

function uid() { return Math.random().toString(36).slice(2, 8) }

// ── Selector de tabela reutilizável ───────────────────────────────────────────
function TabelaSelector({
  tabelas, value, onChange, placeholder,
}: {
  tabelas: Tabela[]; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [busca,  setBusca]  = useState(value)
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setBusca(value) }, [value])

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtradas = useMemo(() => {
    if (!busca.trim()) return tabelas.slice(0, 40)
    const q = busca.toLowerCase()
    return tabelas.filter(t => t.codigo.toLowerCase().includes(q) || t.nome.toLowerCase().includes(q)).slice(0, 40)
  }, [tabelas, busca])

  return (
    <div className="relative" ref={ref}>
      <input type="text" value={busca}
        onChange={e => { setBusca(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
        placeholder={placeholder ?? 'Buscar tabela…'}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {aberto && (
        <div className="absolute top-full mt-1 left-0 right-0 z-40 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filtradas.length === 0
              ? <p className="px-3 py-2 text-xs text-gray-400">Nenhuma tabela encontrada</p>
              : filtradas.map(t => (
                <button key={t.codigo} onClick={() => { onChange(t.codigo); setBusca(t.codigo); setAberto(false) }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition ${value === t.codigo ? 'bg-brand-50 dark:bg-brand-950/40' : ''}`}>
                  <span className="block text-xs font-mono font-semibold text-brand-600 dark:text-brand-400">{t.codigo}</span>
                  <span className="block text-[11px] text-gray-400 truncate">{t.nome}</span>
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SeniorSqlBuilder({ user }: { user: User | null }) {
  const [tabelas,   setTabelas]   = useState<Tabela[]>([])
  const [camposMap, setCamposMap] = useState<Map<string, Campo[]>>(new Map())
  const [loading,   setLoading]   = useState(true)
  const [erro,      setErro]      = useState<string | null>(null)
  const [aba,       setAba]       = useState<Aba>('basico')

  // ── Estado básico ─────────────────────────────────────────────────────────
  const [buscaTabela,  setBuscaTabela]  = useState('')
  const [tabelaSel,    setTabelaSel]    = useState<Tabela | null>(null)
  const [camposSel,    setCamposSel]    = useState<Set<string>>(new Set())
  const [buscaCampo,   setBuscaCampo]   = useState('')
  const [tipoSQL,      setTipoSQL]      = useState<TipoComando>('SELECT')
  const [tabelaAberta, setTabelaAberta] = useState(false)
  const dropdownRef   = useRef<HTMLDivElement>(null)

  // ── Estado avançado ───────────────────────────────────────────────────────
  const [tabPrincipal, setTabPrincipal] = useState('')
  const [aliasPrinc,   setAliasPrinc]   = useState('')
  const [camposAdv,    setCamposAdv]    = useState<Array<{ id: string; tabela: string; alias: string; campo: string }>>([])
  const [joins,        setJoins]        = useState<JoinItem[]>([])
  const [wheres,       setWheres]       = useState<WhereItem[]>([])
  const [groups,       setGroups]       = useState<GroupItem[]>([])
  const [having,       setHaving]       = useState('')
  const [orders,       setOrders]       = useState<OrderItem[]>([])
  const [limite,       setLimite]       = useState('')
  const [buscaCampAdv, setBuscaCampAdv] = useState<Record<string, string>>({})

  const [copiado, setCopiado] = useState(false)

  // ── Carrega CSVs ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/senior_tabelas.csv').then(r => r.text()),
      fetch('/senior_campos.csv').then(r => r.text()),
    ]).then(([t, c]) => {
      setTabelas(parseTabelas(t))
      setCamposMap(parseCampos(c))
      setLoading(false)
    }).catch(() => { setErro('Não foi possível carregar os dados do Senior.'); setLoading(false) })
  }, [])

  // Fecha dropdown básico ao clicar fora
  useEffect(() => {
    function h(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setTabelaAberta(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Dados derivados (básico) ──────────────────────────────────────────────
  const tabelasFiltradas = useMemo(() => {
    if (!buscaTabela.trim()) return tabelas.slice(0, 50)
    const q = buscaTabela.toLowerCase()
    return tabelas.filter(t => t.codigo.toLowerCase().includes(q) || t.nome.toLowerCase().includes(q)).slice(0, 50)
  }, [tabelas, buscaTabela])

  const camposDaTabela = useMemo(() => tabelaSel ? (camposMap.get(tabelaSel.codigo) ?? []) : [], [tabelaSel, camposMap])

  const camposFiltrados = useMemo(() => {
    if (!buscaCampo.trim()) return camposDaTabela
    const q = buscaCampo.toLowerCase()
    return camposDaTabela.filter(c => c.campo.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q))
  }, [camposDaTabela, buscaCampo])

  const sqlBasico = useMemo(() => {
    if (!tabelaSel) return ''
    return gerarSQLBasico(tabelaSel.codigo, Array.from(camposSel), tipoSQL)
  }, [tabelaSel, camposSel, tipoSQL])

  // ── Dados derivados (avançado) ────────────────────────────────────────────
  const tabelasEnvolvidas = useMemo(() => {
    const set = new Set<string>()
    if (tabPrincipal) set.add(tabPrincipal)
    joins.forEach(j => { if (j.tabela) set.add(j.tabela) })
    return Array.from(set)
  }, [tabPrincipal, joins])

  const todosOsCampos = useMemo(() => {
    const lista: Array<{ tabela: string; alias: string; campo: string; label: string }> = []
    for (const tab of tabelasEnvolvidas) {
      const alias = tab === tabPrincipal ? aliasPrinc : (joins.find(j => j.tabela === tab)?.tabela ?? '')
      for (const c of camposMap.get(tab) ?? []) {
        lista.push({ tabela: tab, alias, campo: c.campo, label: `${alias || tab}.${c.campo} — ${c.descricao}` })
      }
    }
    return lista
  }, [tabelasEnvolvidas, camposMap, tabPrincipal, aliasPrinc, joins])

  const sqlAvancado = useMemo(() => {
    return gerarSQLAvancado(tabPrincipal, aliasPrinc, camposAdv, joins, wheres, groups, having, orders, limite)
  }, [tabPrincipal, aliasPrinc, camposAdv, joins, wheres, groups, having, orders, limite])

  // ── Ações básico ──────────────────────────────────────────────────────────
  function selecionarTabela(t: Tabela) {
    setTabelaSel(t); setCamposSel(new Set()); setBuscaCampo(''); setBuscaTabela(t.codigo); setTabelaAberta(false)
  }
  function toggleCampo(campo: string) {
    setCamposSel(prev => { const n = new Set(prev); n.has(campo) ? n.delete(campo) : n.add(campo); return n })
  }
  function toggleTodos() {
    setCamposSel(camposSel.size === camposFiltrados.length ? new Set() : new Set(camposFiltrados.map(c => c.campo)))
  }

  // ── Ações avançado ────────────────────────────────────────────────────────
  const addCampoAdv = useCallback((tabela: string, alias: string, campo: string) => {
    setCamposAdv(prev => [...prev, { id: uid(), tabela, alias, campo }])
  }, [])
  const removeCampoAdv = (id: string) => setCamposAdv(prev => prev.filter(c => c.id !== id))

  const addJoin = () => setJoins(prev => [...prev, { id: uid(), tabela: '', tipo: 'INNER JOIN', campoEsq: '', campoDir: '' }])
  const updateJoin = (id: string, key: keyof JoinItem, val: string) =>
    setJoins(prev => prev.map(j => j.id === id ? { ...j, [key]: val } : j))
  const removeJoin = (id: string) => setJoins(prev => prev.filter(j => j.id !== id))

  const addWhere = () => setWheres(prev => [...prev, { id: uid(), campo: '', operador: '=', valor: '', conector: 'AND' }])
  const updateWhere = (id: string, key: keyof WhereItem, val: string) =>
    setWheres(prev => prev.map(w => w.id === id ? { ...w, [key]: val } : w))
  const removeWhere = (id: string) => setWheres(prev => prev.filter(w => w.id !== id))

  const addGroup = () => setGroups(prev => [...prev, { id: uid(), campo: '' }])
  const updateGroup = (id: string, val: string) => setGroups(prev => prev.map(g => g.id === id ? { ...g, campo: val } : g))
  const removeGroup = (id: string) => setGroups(prev => prev.filter(g => g.id !== id))

  const addOrder = () => setOrders(prev => [...prev, { id: uid(), campo: '', direcao: 'ASC' }])
  const updateOrder = (id: string, key: keyof OrderItem, val: string) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, [key]: val } : o))
  const removeOrder = (id: string) => setOrders(prev => prev.filter(o => o.id !== id))

  function limparAvancado() {
    setTabPrincipal(''); setAliasPrinc(''); setCamposAdv([]); setJoins([])
    setWheres([]); setGroups([]); setHaving(''); setOrders([]); setLimite('')
  }

  function copiarSQL() {
    const sql = aba === 'basico' ? sqlBasico : sqlAvancado
    if (!sql) return
    navigator.clipboard.writeText(sql).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) })
  }

  // ── Estilos comuns ────────────────────────────────────────────────────────
  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const selectCls = 'px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500'
  const TIPOS: TipoComando[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
  const TIPOS_JOIN: TipoJoin[] = ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN']
  const OPERADORES: Operador[] = ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE', 'IN', 'IS NULL', 'IS NOT NULL', 'BETWEEN']
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

  const sqlAtual = aba === 'basico' ? sqlBasico : sqlAvancado
  const temSQL   = aba === 'basico' ? (!!tabelaSel && camposSel.size > 0) : (!!tabPrincipal && camposAdv.length > 0)

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">

        {/* Breadcrumb + título */}
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-5">
          <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition">Registros</Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-200">Senior SQL Builder</span>
        </div>

        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Senior SQL Builder</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gere comandos SQL para as tabelas do Senior</p>
          </div>
          <button onClick={aba === 'basico' ? () => { setTabelaSel(null); setCamposSel(new Set()); setBuscaTabela(''); setBuscaCampo('') } : limparAvancado}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpar
          </button>
        </div>

        {/* Abas */}
        <div className="flex gap-1 mb-5 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl w-fit">
          {(['basico', 'avancado'] as Aba[]).map(a => (
            <button key={a} onClick={() => setAba(a)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                aba === a
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {a === 'basico' ? '⚡ Básico' : '🔬 Avançado'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Carregando tabelas do Senior…</p>
            </div>
          </div>
        ) : erro ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 text-red-700 dark:text-red-300 text-sm">{erro}</div>
        ) : aba === 'basico' ? (

          /* ══════════════════════════════════════════════════════════════════
             ABA BÁSICO
          ══════════════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Coluna 1: Tabela */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">1. Tabela</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tabelas.length.toLocaleString('pt-BR')} tabelas disponíveis</p>
              </div>
              <div className="p-4 flex-1">
                <div className="relative" ref={dropdownRef}>
                  <input type="text" value={buscaTabela}
                    onChange={e => { setBuscaTabela(e.target.value); setTabelaAberta(true) }}
                    onFocus={() => setTabelaAberta(true)}
                    placeholder="Buscar por código ou nome…"
                    className={inputCls}
                  />
                  {tabelaAberta && (
                    <div className="absolute top-full mt-1 left-0 right-0 z-30 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        {tabelasFiltradas.length === 0
                          ? <p className="px-4 py-3 text-sm text-gray-400">Nenhuma tabela encontrada</p>
                          : tabelasFiltradas.map(t => (
                            <button key={t.codigo} onClick={() => selecionarTabela(t)}
                              className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition ${tabelaSel?.codigo === t.codigo ? 'bg-brand-50 dark:bg-brand-950/40' : ''}`}>
                              <span className="block text-xs font-mono font-semibold text-brand-600 dark:text-brand-400">{t.codigo}</span>
                              <span className="block text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{t.nome}</span>
                            </button>
                          ))}
                      </div>
                      {!buscaTabela && <p className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">Digite para filtrar todas as {tabelas.length.toLocaleString('pt-BR')} tabelas</p>}
                    </div>
                  )}
                </div>
                {tabelaSel && (
                  <div className="mt-4 p-3.5 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800">
                    <p className="text-xs font-mono font-bold text-brand-700 dark:text-brand-300">{tabelaSel.codigo}</p>
                    <p className="text-xs text-brand-600/80 dark:text-brand-400/80 mt-1 leading-relaxed">{tabelaSel.nome}</p>
                    <p className="text-xs text-brand-500 mt-2">{camposDaTabela.length} campos disponíveis</p>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2: Campos */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">2. Campos</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{camposSel.size > 0 ? `${camposSel.size} selecionado(s)` : 'Nenhum selecionado'}</p>
                </div>
                {tabelaSel && camposFiltrados.length > 0 && (
                  <button onClick={toggleTodos} className="text-xs text-brand-600 dark:text-brand-400 hover:underline shrink-0">
                    {camposSel.size === camposFiltrados.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col gap-3">
                {!tabelaSel ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-gray-400 text-center">Selecione uma tabela primeiro</p>
                  </div>
                ) : (
                  <>
                    <input type="text" value={buscaCampo} onChange={e => setBuscaCampo(e.target.value)}
                      placeholder="Filtrar campos…" className={inputCls} />
                    <div className="flex-1 overflow-y-auto max-h-80 space-y-1 pr-1">
                      {camposFiltrados.map(c => {
                        const sel = camposSel.has(c.campo)
                        return (
                          <button key={c.campo} onClick={() => toggleCampo(c.campo)}
                            className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all ${sel ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-300 dark:border-brand-700' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                            <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-all ${sel ? 'bg-brand-600 border-brand-600' : 'border-gray-300 dark:border-gray-600'}`}>
                              {sel && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs font-mono font-semibold ${sel ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200'}`}>{c.campo}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{c.descricao}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Coluna 3: SQL gerado */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">3. Comando SQL</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Escolha o tipo e copie</p>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-4 gap-1.5">
                  {TIPOS.map(tipo => (
                    <button key={tipo} onClick={() => setTipoSQL(tipo)}
                      className={`py-2 rounded-xl border text-xs font-bold tracking-wide transition-all ${tipoSQL === tipo ? corTipoAtivo[tipo] : corTipo[tipo]}`}>
                      {tipo}
                    </button>
                  ))}
                </div>
                <pre className={`flex-1 min-h-[220px] max-h-72 overflow-auto p-4 rounded-xl border text-xs font-mono leading-relaxed whitespace-pre-wrap break-all ${temSQL ? 'bg-gray-950 text-green-400 border-gray-700' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                  {temSQL ? sqlAtual : (tabelaSel ? '-- Selecione pelo menos um campo' : '-- Selecione uma tabela e campos\n-- para gerar o SQL')}
                </pre>
                <button onClick={copiarSQL} disabled={!temSQL}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  {copiado
                    ? <><svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span className="text-green-600">Copiado!</span></>
                    : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copiar SQL</>
                  }
                </button>
                {camposSel.size > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Campos selecionados ({camposSel.size})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(camposSel).map(campo => (
                        <span key={campo} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-mono text-gray-700 dark:text-gray-300">
                          {campo}
                          <button onClick={() => toggleCampo(campo)} className="text-gray-400 hover:text-red-500 transition ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        ) : (

          /* ══════════════════════════════════════════════════════════════════
             ABA AVANÇADO
          ══════════════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">

            {/* ── Painel esquerdo: construtor ─────────────────────────── */}
            <div className="space-y-4">

              {/* Tabela principal */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Tabela principal</h3>
                <div className="grid grid-cols-[1fr_120px] gap-3">
                  <TabelaSelector tabelas={tabelas} value={tabPrincipal} onChange={v => { setTabPrincipal(v); setCamposAdv([]); setJoins([]) }} placeholder="Selecionar tabela…" />
                  <input type="text" value={aliasPrinc} onChange={e => setAliasPrinc(e.target.value.toUpperCase())}
                    placeholder="Alias (ex: A)" className={inputCls} maxLength={10} />
                </div>
                {tabPrincipal && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {camposMap.get(tabPrincipal)?.length ?? 0} campos disponíveis
                  </p>
                )}
              </div>

              {/* JOINs */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">JOIN</h3>
                  <button onClick={addJoin} disabled={!tabPrincipal}
                    className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-40 disabled:cursor-not-allowed">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Adicionar JOIN
                  </button>
                </div>
                {joins.length === 0
                  ? <p className="text-xs text-gray-400 dark:text-gray-500">Nenhum JOIN adicionado</p>
                  : (
                    <div className="space-y-4">
                      {joins.map((j, idx) => (
                        <div key={j.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">JOIN {idx + 1}</span>
                            <button onClick={() => removeJoin(j.id)} className="text-gray-400 hover:text-red-500 transition text-xs">remover</button>
                          </div>
                          <div className="grid grid-cols-[140px_1fr_100px] gap-2">
                            <select value={j.tipo} onChange={e => updateJoin(j.id, 'tipo', e.target.value)} className={selectCls}>
                              {TIPOS_JOIN.map(t => <option key={t}>{t}</option>)}
                            </select>
                            <TabelaSelector tabelas={tabelas} value={j.tabela} onChange={v => updateJoin(j.id, 'tabela', v)} placeholder="Tabela…" />
                            <input type="text" value={j.tabela ? j.tabela : ''} readOnly placeholder="Alias"
                              onChange={e => {}} className={`${selectCls} w-full`} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[11px] text-gray-400 mb-1">Campo esquerdo ({aliasPrinc || tabPrincipal})</p>
                              <select value={j.campoEsq} onChange={e => updateJoin(j.id, 'campoEsq', e.target.value)} className={`${selectCls} w-full`}>
                                <option value="">Selecionar…</option>
                                {(camposMap.get(tabPrincipal) ?? []).map(c => (
                                  <option key={c.campo} value={`${aliasPrinc || tabPrincipal}.${c.campo}`}>{c.campo}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <p className="text-[11px] text-gray-400 mb-1">Campo direito ({j.tabela || '…'})</p>
                              <select value={j.campoDir} onChange={e => updateJoin(j.id, 'campoDir', e.target.value)} className={`${selectCls} w-full`}>
                                <option value="">Selecionar…</option>
                                {(camposMap.get(j.tabela) ?? []).map(c => (
                                  <option key={c.campo} value={`${j.tabela}.${c.campo}`}>{c.campo}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>

              {/* Campos SELECT */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Campos do SELECT
                    {camposAdv.length > 0 && <span className="ml-2 text-xs font-normal text-gray-400">({camposAdv.length})</span>}
                  </h3>
                </div>

                {tabelasEnvolvidas.length === 0
                  ? <p className="text-xs text-gray-400 dark:text-gray-500">Selecione a tabela principal primeiro</p>
                  : (
                    <div className="space-y-4">
                      {tabelasEnvolvidas.map(tab => {
                        const alias = tab === tabPrincipal ? aliasPrinc : ''
                        const campTab = camposMap.get(tab) ?? []
                        const buscaKey = tab
                        const bq = buscaCampAdv[buscaKey] ?? ''
                        const filtrados = bq ? campTab.filter(c => c.campo.toLowerCase().includes(bq.toLowerCase()) || c.descricao.toLowerCase().includes(bq.toLowerCase())) : campTab

                        return (
                          <div key={tab}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-mono font-semibold text-brand-600 dark:text-brand-400">{tab}</span>
                              {alias && <span className="text-xs text-gray-400">({alias})</span>}
                              <button onClick={() => {
                                const jaAdicionados = new Set(camposAdv.filter(c => c.tabela === tab).map(c => c.campo))
                                const paraAdicionar = campTab.filter(c => !jaAdicionados.has(c.campo))
                                setCamposAdv(prev => [...prev, ...paraAdicionar.map(c => ({ id: uid(), tabela: tab, alias, campo: c.campo }))])
                              }} className="ml-auto text-xs text-brand-600 dark:text-brand-400 hover:underline">+ todos</button>
                            </div>
                            <input type="text" value={bq}
                              onChange={e => setBuscaCampAdv(prev => ({ ...prev, [buscaKey]: e.target.value }))}
                              placeholder="Filtrar campos…" className={`${inputCls} mb-2`} />
                            <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                              {filtrados.map(c => {
                                const jaSel = camposAdv.some(ca => ca.tabela === tab && ca.campo === c.campo)
                                return (
                                  <button key={c.campo}
                                    onClick={() => jaSel
                                      ? setCamposAdv(prev => prev.filter(ca => !(ca.tabela === tab && ca.campo === c.campo)))
                                      : addCampoAdv(tab, alias, c.campo)
                                    }
                                    className={`w-full text-left flex items-start gap-3 px-3 py-2 rounded-xl border transition-all text-xs ${jaSel ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-300 dark:border-brand-700' : 'border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                    <div className={`mt-0.5 w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border-2 ${jaSel ? 'bg-brand-600 border-brand-600' : 'border-gray-300 dark:border-gray-600'}`}>
                                      {jaSel && <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <div className="min-w-0">
                                      <span className={`font-mono font-semibold ${jaSel ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200'}`}>{c.campo}</span>
                                      <span className="text-gray-400 ml-2 truncate">{c.descricao}</span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                }

                {camposAdv.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-medium text-gray-500 mb-2">Ordem dos campos no SELECT</p>
                    <div className="flex flex-wrap gap-1.5">
                      {camposAdv.map(c => (
                        <span key={c.id} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-mono text-gray-700 dark:text-gray-300">
                          {c.alias ? `${c.alias}.` : ''}{c.campo}
                          <button onClick={() => removeCampoAdv(c.id)} className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* WHERE */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">WHERE</h3>
                  <button onClick={addWhere} className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Adicionar condição
                  </button>
                </div>
                {wheres.length === 0
                  ? <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma condição adicionada</p>
                  : (
                    <div className="space-y-3">
                      {wheres.map((w, idx) => (
                        <div key={w.id} className="flex items-start gap-2 flex-wrap">
                          {idx > 0 && (
                            <select value={w.conector} onChange={e => updateWhere(w.id, 'conector', e.target.value)} className={`${selectCls} w-16`}>
                              <option>AND</option><option>OR</option>
                            </select>
                          )}
                          <select value={w.campo} onChange={e => updateWhere(w.id, 'campo', e.target.value)} className={`${selectCls} flex-1 min-w-[120px]`}>
                            <option value="">Campo…</option>
                            {todosOsCampos.map(c => <option key={`${c.tabela}.${c.campo}`} value={`${c.alias || c.tabela}.${c.campo}`}>{c.alias || c.tabela}.{c.campo}</option>)}
                          </select>
                          <select value={w.operador} onChange={e => updateWhere(w.id, 'operador', e.target.value)} className={`${selectCls} w-32`}>
                            {OPERADORES.map(op => <option key={op}>{op}</option>)}
                          </select>
                          {w.operador !== 'IS NULL' && w.operador !== 'IS NOT NULL' && (
                            <input type="text" value={w.valor} onChange={e => updateWhere(w.id, 'valor', e.target.value)}
                              placeholder={w.operador === 'BETWEEN' ? 'val1 AND val2' : w.operador === 'IN' ? "'a','b','c'" : 'Valor…'}
                              className={`${inputCls} flex-1 min-w-[100px]`} />
                          )}
                          <button onClick={() => removeWhere(w.id)} className="p-2 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>

              {/* GROUP BY + HAVING + ORDER BY + LIMIT */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-5">

                {/* GROUP BY */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">GROUP BY</h3>
                    <button onClick={addGroup} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">+ Adicionar</button>
                  </div>
                  {groups.length === 0
                    ? <p className="text-xs text-gray-400 dark:text-gray-500">Nenhum agrupamento</p>
                    : (
                      <div className="space-y-2">
                        {groups.map(g => (
                          <div key={g.id} className="flex items-center gap-2">
                            <select value={g.campo} onChange={e => updateGroup(g.id, e.target.value)} className={`${selectCls} flex-1`}>
                              <option value="">Campo…</option>
                              {todosOsCampos.map(c => <option key={`${c.tabela}.${c.campo}`} value={`${c.alias || c.tabela}.${c.campo}`}>{c.alias || c.tabela}.{c.campo}</option>)}
                            </select>
                            <button onClick={() => removeGroup(g.id)} className="p-2 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>

                {/* HAVING */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">HAVING</h3>
                  <input type="text" value={having} onChange={e => setHaving(e.target.value)}
                    placeholder="Ex: COUNT(*) > 1" className={inputCls} />
                </div>

                {/* ORDER BY */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">ORDER BY</h3>
                    <button onClick={addOrder} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">+ Adicionar</button>
                  </div>
                  {orders.length === 0
                    ? <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma ordenação</p>
                    : (
                      <div className="space-y-2">
                        {orders.map(o => (
                          <div key={o.id} className="flex items-center gap-2">
                            <select value={o.campo} onChange={e => updateOrder(o.id, 'campo', e.target.value)} className={`${selectCls} flex-1`}>
                              <option value="">Campo…</option>
                              {todosOsCampos.map(c => <option key={`${c.tabela}.${c.campo}`} value={`${c.alias || c.tabela}.${c.campo}`}>{c.alias || c.tabela}.{c.campo}</option>)}
                            </select>
                            <select value={o.direcao} onChange={e => updateOrder(o.id, 'direcao', e.target.value)} className={`${selectCls} w-20`}>
                              <option>ASC</option><option>DESC</option>
                            </select>
                            <button onClick={() => removeOrder(o.id)} className="p-2 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>

                {/* LIMIT */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Limite de linhas</h3>
                  <input type="number" value={limite} onChange={e => setLimite(e.target.value)}
                    placeholder="Ex: 100 (FETCH FIRST N ROWS ONLY)" className={inputCls} min={1} />
                </div>

              </div>
            </div>

            {/* ── Painel direito: SQL gerado ─────────────────────────── */}
            <div className="xl:sticky xl:top-6 self-start space-y-3">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">SQL Gerado</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Atualizado em tempo real</p>
                  </div>
                  <button onClick={copiarSQL} disabled={!temSQL}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${temSQL ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}>
                    {copiado
                      ? <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copiado!</>
                      : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copiar</>
                    }
                  </button>
                </div>
                <pre className={`p-5 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all min-h-[320px] max-h-[600px] overflow-auto ${temSQL ? 'bg-gray-950 text-green-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                  {sqlAtual || '-- Configure as opções\n-- ao lado para gerar o SQL'}
                </pre>
              </div>

              {/* Resumo */}
              {tabPrincipal && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resumo</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Tabela principal', val: tabPrincipal },
                      { label: 'JOINs',            val: `${joins.filter(j => j.tabela).length}` },
                      { label: 'Campos',            val: `${camposAdv.length}` },
                      { label: 'Condições WHERE',   val: `${wheres.filter(w => w.campo).length}` },
                      { label: 'GROUP BY',          val: `${groups.filter(g => g.campo).length}` },
                      { label: 'ORDER BY',          val: `${orders.filter(o => o.campo).length}` },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
