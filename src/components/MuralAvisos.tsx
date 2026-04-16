import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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

const CONFIGS: Record<TipoAviso, { cor: string; bg: string; borda: string; icone: string; label: string }> = {
  novidade:  { cor: 'text-brand-700',  bg: 'bg-brand-50',  borda: 'border-brand-200', icone: '✨', label: 'Novidade'  },
  melhoria:  { cor: 'text-teal-700',   bg: 'bg-teal-50',   borda: 'border-teal-200',  icone: '⚡', label: 'Melhoria'  },
  correcao:  { cor: 'text-green-700',  bg: 'bg-green-50',  borda: 'border-green-200', icone: '🔧', label: 'Correção'  },
  aviso:     { cor: 'text-amber-700',  bg: 'bg-amber-50',  borda: 'border-amber-200', icone: '⚠️', label: 'Aviso'     },
}

export default function MuralAvisos() {
  const [avisos,      setAvisos]      = useState<Aviso[]>([])
  const [aberto,      setAberto]      = useState(true)
  const [loading,     setLoading]     = useState(true)
  const [dispensados, setDispensados] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('avisos-dispensados')
      return new Set(saved ? JSON.parse(saved) : [])
    } catch { return new Set() }
  })

  useEffect(() => {
    supabase
      .from('avisos')
      .select('*')
      .eq('ativo', true)
      .order('publicado_em', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setAvisos((data ?? []) as Aviso[])
        setLoading(false)
      })
  }, [])

  function dispensar(id: string) {
    const novo = new Set(dispensados).add(id)
    setDispensados(novo)
    try { localStorage.setItem('avisos-dispensados', JSON.stringify([...novo])) } catch {}
  }

  function dispensarTodos() {
    const ids = avisos.map(a => a.id)
    const novo = new Set([...dispensados, ...ids])
    setDispensados(novo)
    try { localStorage.setItem('avisos-dispensados', JSON.stringify([...novo])) } catch {}
    setAberto(false)
  }

  const visiveis = avisos.filter(a => !dispensados.has(a.id))

  if (loading || visiveis.length === 0) return null

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="mb-6">
      {/* Header do mural */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-gray-700">
            Novidades do sistema
          </h2>
          <span className="text-xs font-medium px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded-full">
            {visiveis.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAberto(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1"
          >
            {aberto ? 'Recolher' : 'Expandir'}
            <svg className={`w-3.5 h-3.5 transition-transform ${aberto ? '' : '-rotate-90'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={dispensarTodos}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
            title="Marcar todos como lidos"
          >
            Dispensar todos
          </button>
        </div>
      </div>

      {/* Lista de avisos */}
      {aberto && (
        <div className="space-y-2.5">
          {visiveis.map(aviso => {
            const cfg = CONFIGS[aviso.tipo]
            return (
              <div key={aviso.id}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${cfg.bg} ${cfg.borda}`}>
                {/* Ícone */}
                <span className="text-lg flex-shrink-0 mt-0.5">{cfg.icone}</span>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.cor}`}>
                      {cfg.label}
                    </span>
                    {aviso.versao && (
                      <span className="text-xs font-mono text-gray-400 bg-white/70 px-1.5 py-0.5 rounded border border-gray-200">
                        v{aviso.versao}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{formatarData(aviso.publicado_em)}</span>
                  </div>
                  <p className={`text-sm font-semibold ${cfg.cor}`}>{aviso.titulo}</p>
                  {aviso.descricao && (
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{aviso.descricao}</p>
                  )}
                </div>

                {/* Fechar */}
                <button
                  onClick={() => dispensar(aviso.id)}
                  className="text-gray-400 hover:text-gray-600 transition flex-shrink-0 mt-0.5"
                  title="Marcar como lido"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
