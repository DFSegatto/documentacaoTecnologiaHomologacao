import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import {
  supabase,
  type Chamado,
  TIPOS_CHAMADO, PRIORIDADES_CHAMADO, STATUS_CHAMADO,
  type TipoChamado, type PrioridadeChamado, type StatusChamado,
} from '../lib/supabase'
import { usePerfil } from '../hooks/usePerfil'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

interface FiltrosChamado {
  tipo: TipoChamado | ''
  status: StatusChamado | ''
  prioridade: PrioridadeChamado | ''
  busca: string
}

export default function Chamados({ user }: { user: User | null }) {
  const navigate = useNavigate()
  const { isSuporte, loading: loadingPerfil } = usePerfil(user)

  const [chamados, setChamados] = useState<Chamado[]>([])
  const [loading, setLoading]   = useState(true)
  const [filtros, setFiltros]   = useState<FiltrosChamado>({
    tipo: '', status: '', prioridade: '', busca: '',
  })
  const [modalAberto, setModalAberto] = useState(false)

  // Form novo chamado
  const [titulo, setTitulo]         = useState('')
  const [descricao, setDescricao]   = useState('')
  const [tipo, setTipo]             = useState<TipoChamado>('bug')
  const [prioridade, setPrioridade] = useState<PrioridadeChamado>('media')
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState('')

  useEffect(() => {
    if (!loadingPerfil) carregar()
  }, [loadingPerfil])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('chamados')
      .select('*')
      .order('criado_em', { ascending: false })
    setChamados((data ?? []) as Chamado[])
    setLoading(false)
  }

  async function handleCriar() {
    if (!titulo.trim()) { setErro('O título é obrigatório.'); return }
    setSalvando(true)
    setErro('')
    const { error } = await supabase.from('chamados').insert({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      tipo,
      prioridade,
      status: 'aberto',
      criado_por: user?.id,
    })
    if (error) { setErro('Erro ao salvar. Tente novamente.'); setSalvando(false); return }
    setTitulo(''); setDescricao(''); setTipo('bug'); setPrioridade('media')
    setModalAberto(false)
    setSalvando(false)
    carregar()
  }

  const chamadosFiltrados = chamados.filter(c => {
    if (filtros.tipo      && c.tipo      !== filtros.tipo)      return false
    if (filtros.status    && c.status    !== filtros.status)    return false
    if (filtros.prioridade && c.prioridade !== filtros.prioridade) return false
    if (filtros.busca && !c.titulo.toLowerCase().includes(filtros.busca.toLowerCase())) return false
    return true
  })

  function getPrioridadeInfo(v: PrioridadeChamado) {
    return PRIORIDADES_CHAMADO.find(p => p.value === v)!
  }
  function getStatusInfo(v: StatusChamado) {
    return STATUS_CHAMADO.find(s => s.value === v)!
  }
  function getTipoInfo(v: TipoChamado) {
    return TIPOS_CHAMADO.find(t => t.value === v)!
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  const contadores = {
    abertos: chamados.filter(c => c.status === 'aberto').length,
    andamento: chamados.filter(c => c.status === 'em_andamento').length,
    resolvidos: chamados.filter(c => c.status === 'resolvido').length,
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />

      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
              Chamados
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Reporte bugs, problemas e sugestões
            </p>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Abrir chamado
          </button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Em aberto',    count: contadores.abertos,   cor: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
            { label: 'Em andamento', count: contadores.andamento,  cor: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/30' },
            { label: 'Resolvidos',   count: contadores.resolvidos, cor: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
          ].map(card => (
            <div key={card.label} className={`rounded-xl border border-gray-100 dark:border-gray-800 ${card.bg} p-4`}>
              <p className={`text-2xl font-bold ${card.cor}`}>{card.count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Buscar por título..."
            value={filtros.busca}
            onChange={e => setFiltros(f => ({ ...f, busca: e.target.value }))}
            className="flex-1 min-w-[160px] text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              rounded-lg px-3 py-1.5 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <select
            value={filtros.tipo}
            onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value as TipoChamado | '' }))}
            className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5
              text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Todos os tipos</option>
            {TIPOS_CHAMADO.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </select>
          <select
            value={filtros.status}
            onChange={e => setFiltros(f => ({ ...f, status: e.target.value as StatusChamado | '' }))}
            className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5
              text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Todos os status</option>
            {STATUS_CHAMADO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={filtros.prioridade}
            onChange={e => setFiltros(f => ({ ...f, prioridade: e.target.value as PrioridadeChamado | '' }))}
            className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5
              text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Todas as prioridades</option>
            {PRIORIDADES_CHAMADO.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chamadosFiltrados.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-sm">Nenhum chamado encontrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chamadosFiltrados.map(chamado => {
              const prioInfo   = getPrioridadeInfo(chamado.prioridade)
              const statusInfo = getStatusInfo(chamado.status)
              const tipoInfo   = getTipoInfo(chamado.tipo)
              return (
                <Link
                  key={chamado.id}
                  to={`/chamados/${chamado.id}`}
                  className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800
                    hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-sm transition p-4"
                >
                  <div className="flex items-start gap-3 flex-wrap">
                    <span className="text-xl mt-0.5 shrink-0">{tipoInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{chamado.titulo}</p>
                      {chamado.descricao && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{chamado.descricao}</p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatarData(chamado.criado_em)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${prioInfo.cor}`}>
                        {prioInfo.label}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.cor}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <Footer />

      {/* Modal novo chamado */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Abrir novo chamado</h2>
              <button
                onClick={() => { setModalAberto(false); setErro('') }}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Tipo</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIPOS_CHAMADO.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTipo(t.value)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition
                        ${tipo === t.value
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      <span className="text-lg">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Prioridade</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRIORIDADES_CHAMADO.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPrioridade(p.value)}
                      className={`py-1.5 rounded-lg border text-xs font-medium transition
                        ${prioridade === p.value
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Título *</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Descreva o problema ou sugestão em poucas palavras"
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                    rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500
                    focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Descrição detalhada
                </label>
                <textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  rows={4}
                  placeholder="Passos para reproduzir, contexto, prints relevantes..."
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                    rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500
                    focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>

              {erro && (
                <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 pb-6">
              <button
                onClick={() => { setModalAberto(false); setErro('') }}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriar}
                disabled={salvando}
                className="text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium px-5 py-2 rounded-lg transition"
              >
                {salvando ? 'Salvando...' : 'Abrir chamado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
