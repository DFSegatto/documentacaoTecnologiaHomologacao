import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import type { User } from '@supabase/supabase-js'
import { useAvisosNovos } from '../hooks/useAvisosNovos'

// ── Tipos ────────────────────────────────────────────────────────────────────

type TipoAviso = 'novidade' | 'melhoria' | 'correcao' | 'aviso'

interface Aviso {
  id: string
  tipo: TipoAviso
  titulo: string
  descricao: string
  versao: string | null
  publicado_em: string
  ativo: boolean
}

interface VersaoAgrupada {
  versao: string
  publicado_em: string
  avisos: Aviso[]
}

// ── Configuração visual por tipo ─────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoAviso, {
  icone: string
  label: string
  cor: string
  bg: string
  borda: string
  ponto: string
}> = {
  novidade: {
    icone: '✨',
    label: 'Novidade',
    cor: 'text-brand-700 dark:text-brand-300',
    bg: 'bg-brand-50 dark:bg-brand-950/40',
    borda: 'border-brand-200 dark:border-brand-700',
    ponto: 'bg-brand-500',
  },
  melhoria: {
    icone: '🔧',
    label: 'Melhoria',
    cor: 'text-teal-700 dark:text-teal-300',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    borda: 'border-teal-200 dark:border-teal-700',
    ponto: 'bg-teal-500',
  },
  correcao: {
    icone: '✅',
    label: 'Correção',
    cor: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-50 dark:bg-green-950/40',
    borda: 'border-green-200 dark:border-green-700',
    ponto: 'bg-green-500',
  },
  aviso: {
    icone: '📢',
    label: 'Aviso',
    cor: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    borda: 'border-amber-200 dark:border-amber-700',
    ponto: 'bg-amber-500',
  },
}

// ── Ordenação semântica de versões (ex: "2.0" > "1.9" > "1.7") ──────────────

function compararVersoes(a: string, b: string): number {
  const partes = (v: string) => v.split('.').map(n => parseInt(n) || 0)
  const [aMaj, aMin = 0] = partes(a)
  const [bMaj, bMin = 0] = partes(b)
  if (aMaj !== bMaj) return bMaj - aMaj
  return bMin - aMin
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatarDataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function contarPorTipo(avisos: Aviso[]) {
  return {
    novidade: avisos.filter(a => a.tipo === 'novidade').length,
    melhoria: avisos.filter(a => a.tipo === 'melhoria').length,
    correcao: avisos.filter(a => a.tipo === 'correcao').length,
    aviso:    avisos.filter(a => a.tipo === 'aviso').length,
  }
}

// ── Componente de card de aviso ───────────────────────────────────────────────

function CardAviso({ aviso }: { aviso: Aviso }) {
  const cfg = TIPO_CONFIG[aviso.tipo]
  return (
    <div className={`rounded-xl border ${cfg.borda} ${cfg.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} border ${cfg.borda}`}>
          <span className="text-xs">{cfg.icone}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.cor}`}>
              {cfg.label}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {aviso.titulo}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {aviso.descricao}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Componente de bloco de versão ────────────────────────────────────────────

function BlocoVersao({
  versao,
  isLatest,
  defaultAberto,
}: {
  versao: VersaoAgrupada
  isLatest: boolean
  defaultAberto: boolean
}) {
  const [aberto, setAberto] = useState(defaultAberto)
  const contagem = contarPorTipo(versao.avisos)

  // Ordena: novidades primeiro, depois melhorias, correções, avisos
  const ORDEM: TipoAviso[] = ['novidade', 'melhoria', 'correcao', 'aviso']
  const avisosOrdenados = [...versao.avisos].sort(
    (a, b) => ORDEM.indexOf(a.tipo) - ORDEM.indexOf(b.tipo)
  )

  return (
    <div className="relative pl-8">
      {/* Linha vertical da timeline */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />

      {/* Ponto da timeline */}
      <div className={`absolute left-1.5 top-5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-950
        ${isLatest ? 'bg-brand-600 shadow-md shadow-brand-200 dark:shadow-brand-900' : 'bg-gray-300 dark:bg-gray-600'}`}
      />

      <div className="mb-10">
        {/* Header da versão — clicável */}
        <button
          onClick={() => setAberto(v => !v)}
          className="w-full text-left group"
        >
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold tracking-tight
                ${isLatest ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>
                v{versao.versao}
              </span>
              {isLatest && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                  Atual
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatarDataCurta(versao.publicado_em)}
            </span>

            {/* Contadores por tipo */}
            <div className="flex items-center gap-1.5 ml-auto">
              {(['novidade', 'melhoria', 'correcao', 'aviso'] as TipoAviso[]).map(tipo => {
                const n = contagem[tipo]
                if (!n) return null
                const cfg = TIPO_CONFIG[tipo]
                return (
                  <span key={tipo} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.borda} ${cfg.cor}`}>
                    {cfg.icone} {n}
                  </span>
                )
              })}
              <svg
                className={`w-4 h-4 text-gray-400 ml-1 transition-transform ${aberto ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Cards das alterações */}
        {aberto && (
          <div className="space-y-3">
            {avisosOrdenados.map(aviso => (
              <CardAviso key={aviso.id} aviso={aviso} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ReleaseNotes({ user }: { user: User | null }) {
  const { marcarTodosLidos } = useAvisosNovos()
  const [versoes,  setVersoes]  = useState<VersaoAgrupada[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filtro,   setFiltro]   = useState<TipoAviso | ''>('')
  const [busca,    setBusca]    = useState('')

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('avisos')
        .select('*')
        .eq('ativo', true)
        .order('publicado_em', { ascending: false })

      const lista = (data ?? []) as Aviso[]

      // Agrupa por versão
      const mapa = new Map<string, Aviso[]>()
      const semVersao: Aviso[] = []

      for (const aviso of lista) {
        const v = aviso.versao?.trim()
        if (!v) { semVersao.push(aviso); continue }
        if (!mapa.has(v)) mapa.set(v, [])
        mapa.get(v)!.push(aviso)
      }

      // Monta array ordenado por versão decrescente
      const agrupadas: VersaoAgrupada[] = Array.from(mapa.entries())
        .sort(([a], [b]) => compararVersoes(a, b))
        .map(([versao, avisos]) => ({
          versao,
          publicado_em: avisos.reduce((max, a) =>
            a.publicado_em > max ? a.publicado_em : max, avisos[0].publicado_em),
          avisos,
        }))

      // Avisos sem versão vão no final como "Outros"
      if (semVersao.length > 0) {
        agrupadas.push({
          versao: '—',
          publicado_em: semVersao[0].publicado_em,
          avisos: semVersao,
        })
      }

      setVersoes(agrupadas)
      // Marca todos como lidos ao entrar na página
      marcarTodosLidos(lista.map(a => a.id))
      setLoading(false)
    }
    carregar()
  }, [])

  // Totais globais
  const todosAvisos = versoes.flatMap(v => v.avisos)
  const totalGlobal = contarPorTipo(todosAvisos)

  // Filtragem por tipo e busca
  const versoesFiltradas = versoes
    .map(v => ({
      ...v,
      avisos: v.avisos.filter(a => {
        const matchTipo  = !filtro || a.tipo === filtro
        const matchBusca = !busca  || a.titulo.toLowerCase().includes(busca.toLowerCase())
                                   || a.descricao.toLowerCase().includes(busca.toLowerCase())
        return matchTipo && matchBusca
      }),
    }))
    .filter(v => v.avisos.length > 0)

  const filtrando = !!filtro || !!busca

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />

      <main className="max-w-3xl mx-auto px-4 py-10 flex-1 w-full">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-3">
            <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition">Início</Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-200">Notas de versão</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
            Notas de versão
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Histórico completo de novidades, melhorias e correções do sistema.
          </p>

          {/* Totais globais */}
          {!loading && todosAvisos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {(['novidade', 'melhoria', 'correcao', 'aviso'] as TipoAviso[]).map(tipo => {
                const n = totalGlobal[tipo]
                if (!n) return null
                const cfg = TIPO_CONFIG[tipo]
                return (
                  <button
                    key={tipo}
                    onClick={() => setFiltro(filtro === tipo ? '' : tipo)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition
                      ${filtro === tipo
                        ? `${cfg.bg} ${cfg.borda} ${cfg.cor}`
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                  >
                    {cfg.icone} {n} {cfg.label}{n > 1 ? 's' : ''}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Busca */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar em todas as versões..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
                rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {filtrando && (
            <button
              onClick={() => { setBusca(''); setFiltro('') }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition border border-gray-200 dark:border-gray-700 whitespace-nowrap"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : versoesFiltradas.length === 0 ? (
          <div className="text-center py-24 text-gray-400 dark:text-gray-500">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">Nenhuma nota de versão encontrada.</p>
            {filtrando && (
              <button onClick={() => { setBusca(''); setFiltro('') }} className="text-sm text-brand-600 dark:text-brand-400 hover:underline mt-2">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div>
            {versoesFiltradas.map((v, idx) => (
              <BlocoVersao
                key={v.versao}
                versao={v}
                isLatest={idx === 0 && !filtrando}
                defaultAberto={idx === 0}
              />
            ))}

            {/* Fim da timeline */}
            <div className="relative pl-8">
              <div className="absolute left-3 top-0 h-5 w-px bg-gray-200 dark:bg-gray-800" />
              <div className="absolute left-2 top-4 w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
              <p className="text-xs text-gray-300 dark:text-gray-700 ml-2 pt-5">Início do histórico</p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
