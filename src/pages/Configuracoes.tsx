import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, type PerfilDB } from '../lib/supabase'
import { usePerfil } from '../hooks/usePerfil'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Configuracoes({ user }: { user: User | null }) {
  const { isAdmin } = usePerfil(user)

  // ── Status do banco ───────────────────────────────────────────────────
  const [diasSemAtividade, setDiasSemAtividade] = useState<number | null>(null)
  const [ultimaAtividade,  setUltimaAtividade]  = useState<string | null>(null)
  const [loadingStatus,    setLoadingStatus]    = useState(true)

  // ── Config keepalive ──────────────────────────────────────────────────
  const [autoEditar,    setAutoEditar]    = useState(true)
  const [salvandoAuto,  setSalvandoAuto]  = useState(false)
  const [msgAuto,       setMsgAuto]       = useState<{ ok: boolean; texto: string } | null>(null)
  const [testando,      setTestando]      = useState(false)
  const [msgTeste,      setMsgTeste]      = useState<{ ok: boolean; texto: string } | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // ── Usuário padrão ────────────────────────────────────────────────────
  const [usuarios,        setUsuarios]        = useState<PerfilDB[]>([])
  const [usuarioPadraoId, setUsuarioPadraoId] = useState('')
  const [salvandoUsuario, setSalvandoUsuario] = useState(false)
  const [msgUsuario,      setMsgUsuario]      = useState<{ ok: boolean; texto: string } | null>(null)
  const [loadingUsuarios, setLoadingUsuarios] = useState(true)

  // ── Log keepalive ─────────────────────────────────────────────────────
  const [logs,        setLogs]        = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)

  useEffect(() => {
    carregarStatus()
    carregarConfigs()
    carregarUsuarios()
    carregarLogs()
  }, [])

  async function carregarStatus() {
    const { data } = await supabase
      .from('registros')
      .select('atualizado_em')
      .order('atualizado_em', { ascending: false })
      .limit(1)
      .single()

    if (data?.atualizado_em) {
      const dias = Math.floor(
        (Date.now() - new Date(data.atualizado_em).getTime()) / (1000 * 60 * 60 * 24)
      )
      setDiasSemAtividade(dias)
      setUltimaAtividade(data.atualizado_em)
    } else {
      setDiasSemAtividade(0)
    }
    setLoadingStatus(false)
  }

  async function carregarConfigs() {
    const { data } = await supabase
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', ['keepalive_auto_editar'])

    const cfg: Record<string, string> = {}
    for (const row of data ?? []) cfg[row.chave] = row.valor

    if (cfg['keepalive_auto_editar'] !== undefined) setAutoEditar(cfg['keepalive_auto_editar'] !== 'false')
    setLoadingConfig(false)
  }

  async function carregarUsuarios() {
    const { data: perfis } = await supabase
      .from('perfis_usuario')
      .select('id, user_id, email, nome, perfil, criado_em')
      .order('email')

    setUsuarios((perfis ?? []) as PerfilDB[])

    const { data: cfg } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'keepalive_usuario_padrao')
      .single()

    if (cfg?.valor) setUsuarioPadraoId(cfg.valor)
    setLoadingUsuarios(false)
  }

  async function carregarLogs() {
    const { data } = await supabase
      .from('keepalive_log')
      .select('*')
      .order('verificado_em', { ascending: false })
      .limit(5)
    setLogs(data ?? [])
    setLoadingLogs(false)
  }

  async function salvarAutoEditar(novoValor: boolean) {
    setSalvandoAuto(true)
    setMsgAuto(null)
    setAutoEditar(novoValor)
    const { error } = await supabase
      .from('configuracoes')
      .upsert({ chave: 'keepalive_auto_editar', valor: novoValor ? 'true' : 'false' })
    setMsgAuto(error
      ? { ok: false, texto: 'Erro ao salvar configuração.' }
      : { ok: true, texto: 'Configuração salva!' }
    )
    setSalvandoAuto(false)
    setTimeout(() => setMsgAuto(null), 2500)
  }

  async function salvarUsuarioPadrao() {
    if (!usuarioPadraoId) return
    setSalvandoUsuario(true)
    setMsgUsuario(null)
    const { error } = await supabase
      .from('configuracoes')
      .upsert({ chave: 'keepalive_usuario_padrao', valor: usuarioPadraoId })
    setMsgUsuario(error
      ? { ok: false, texto: 'Erro ao salvar usuário.' }
      : { ok: true, texto: 'Usuário padrão salvo!' }
    )
    setSalvandoUsuario(false)
    setTimeout(() => setMsgUsuario(null), 2500)
  }

  async function testarAgora() {
    setTestando(true)
    setMsgTeste(null)
    try {
      const { data: cfg } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['keepalive_usuario_padrao', 'keepalive_auto_editar'])

      const cfgMap: Record<string, string> = {}
      for (const row of cfg ?? []) cfgMap[row.chave] = row.valor
      const autoEditar      = cfgMap['keepalive_auto_editar'] !== 'false'
      const usuarioPadraoId = cfgMap['keepalive_usuario_padrao'] || null

      const { data: ultimoRegistro } = await supabase
        .from('registros')
        .select('id, titulo, conteudo, criado_em, atualizado_em')
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .single()

      const agora = new Date()
      let diasSemMovimento = 0
      let ultimaAtividade  = agora

      if (ultimoRegistro) {
        const criado     = new Date(ultimoRegistro.criado_em)
        const atualizado = new Date(ultimoRegistro.atualizado_em)
        ultimaAtividade  = criado > atualizado ? criado : atualizado
        diasSemMovimento = Math.floor((agora.getTime() - ultimaAtividade.getTime()) / (1000 * 60 * 60 * 24))
      }

      let editouRegistro = false
      if (diasSemMovimento >= 5 && autoEditar && ultimoRegistro) {
        await supabase.from('registro_historico').insert({
          registro_id: ultimoRegistro.id,
          titulo:      ultimoRegistro.titulo,
          conteudo:    ultimoRegistro.conteudo,
          editado_por: usuarioPadraoId,
          editado_em:  agora.toISOString(),
        })
        const { error: errUpdate } = await supabase
          .from('registros')
          .update({ conteudo: ultimoRegistro.conteudo, editado_por: usuarioPadraoId })
          .eq('id', ultimoRegistro.id)
        if (!errUpdate) editouRegistro = true
      }

      await supabase.from('keepalive_log').insert({
        verificado_em:      agora.toISOString(),
        ultima_atividade:   ultimaAtividade.toISOString(),
        dias_sem_movimento: diasSemMovimento,
        alerta_enviado:     false,
        editou_registro:    editouRegistro,
      })

      const extra = editouRegistro ? ' Edição automática realizada.' : ''
      setMsgTeste({ ok: true, texto: `Verificação concluída. ${diasSemMovimento} dia(s) sem atividade.${extra}` })
      carregarStatus()
    } catch (err: any) {
      setMsgTeste({ ok: false, texto: `Erro: ${err?.message ?? 'desconhecido'}` })
    }
    setTestando(false)
    carregarLogs()
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function formatarDataCurta(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  // ── Nível de atenção ──────────────────────────────────────────────────
  const nivel: 'ok' | 'atencao' | 'critico' =
    diasSemAtividade === null ? 'ok'
    : diasSemAtividade >= 7   ? 'critico'
    : diasSemAtividade >= 5   ? 'atencao'
    : 'ok'

  const nivelConfig = {
    ok: {
      icone: '🟢', titulo: 'Banco ativo',
      cor: 'text-green-700 dark:text-green-300',
      bg: 'bg-green-50 dark:bg-green-950/30',
      borda: 'border-green-200 dark:border-green-800',
      barraFundo: 'bg-green-100 dark:bg-green-950/50',
      barraPreenchimento: 'bg-green-500',
    },
    atencao: {
      icone: '🟡', titulo: 'Atenção necessária',
      cor: 'text-amber-700 dark:text-amber-300',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      borda: 'border-amber-200 dark:border-amber-800',
      barraFundo: 'bg-amber-100 dark:bg-amber-950/50',
      barraPreenchimento: 'bg-amber-500',
    },
    critico: {
      icone: '🔴', titulo: 'Risco de pausa',
      cor: 'text-red-700 dark:text-red-300',
      bg: 'bg-red-50 dark:bg-red-950/30',
      borda: 'border-red-200 dark:border-red-800',
      barraFundo: 'bg-red-100 dark:bg-red-950/50',
      barraPreenchimento: 'bg-red-500',
    },
  }[nivel]

  const pct = Math.min(100, ((diasSemAtividade ?? 0) / 7) * 100)

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />

      <main className="max-w-xl mx-auto px-4 py-10 flex-1 w-full space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 min-w-0 overflow-hidden">
          <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition shrink-0">Registros</Link>
          <span className="shrink-0">/</span>
          <span className="text-gray-700 dark:text-gray-200">Configurações</span>
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Configurações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitoramento e keep-alive do banco de dados</p>
        </div>

        {/* ── Card de status ──────────────────────────────────────────── */}
        <div className={`rounded-2xl border ${nivelConfig.borda} ${nivelConfig.bg} p-6`}>
          {loadingStatus ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{nivelConfig.icone}</span>
                    <span className={`text-sm font-semibold ${nivelConfig.cor}`}>{nivelConfig.titulo}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {diasSemAtividade} {diasSemAtividade === 1 ? 'dia' : 'dias'}
                    <span className="text-base font-normal text-gray-400 dark:text-gray-500 ml-1">sem atividade</span>
                  </p>
                  {ultimaAtividade && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Última edição: {formatarData(ultimaAtividade)}
                    </p>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${nivelConfig.borda} bg-white/60 dark:bg-gray-900/40`}>
                  <svg className={`w-6 h-6 ${nivelConfig.cor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                  <span>0 dias</span>
                  <span className={`font-medium ${nivel === 'atencao' ? 'text-amber-600 dark:text-amber-400' : nivel === 'critico' ? 'text-red-600 dark:text-red-400' : ''}`}>
                    Auto-edição: 5 dias
                  </span>
                  <span>7 dias</span>
                </div>
                <div className={`h-2.5 rounded-full ${nivelConfig.barraFundo} overflow-hidden`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${nivelConfig.barraPreenchimento}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="relative h-0">
                  <div className="absolute top-0 h-3 w-px bg-gray-400 dark:bg-gray-500 opacity-50 -translate-y-3" style={{ left: '71.4%' }} />
                </div>
              </div>

              <div className={`rounded-xl p-3.5 border ${nivelConfig.borda} bg-white/50 dark:bg-gray-900/30`}>
                {nivel === 'ok' && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Banco saudável. O sistema editará automaticamente o último registro ao atingir <strong>5 dias</strong> sem atividade.
                  </p>
                )}
                {nivel === 'atencao' && (
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    ⚠️ Limite próximo. {autoEditar
                      ? <><strong>O sistema editará automaticamente</strong> o último registro na próxima execução do cron.</>
                      : <><strong>A edição automática está desativada.</strong> Edite qualquer registro manualmente para reiniciar o contador.</>
                    }
                  </p>
                )}
                {nivel === 'critico' && (
                  <p className="text-sm text-red-800 dark:text-red-200">
                    🚨 Risco alto! {autoEditar
                      ? 'O cron tentará realizar a edição automática. Se o banco já estiver pausado, restaure em '
                      : 'A edição automática está desativada. Edite um registro ou restaure o banco em '
                    }
                    <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-medium">supabase.com/dashboard</a>.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Processo automático ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Processo automático</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Ao atingir 5 dias de inatividade, o último registro é re-salvo para manter o banco ativo.
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Edição automática ao atingir 5 dias</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {autoEditar
                  ? 'Ativo — o último registro será re-salvo automaticamente pelo cron'
                  : 'Inativo — nenhuma ação automática será executada'}
              </p>
            </div>
            <button
              onClick={() => salvarAutoEditar(!autoEditar)}
              disabled={salvandoAuto}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                autoEditar ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-700'
              }`}
              aria-checked={autoEditar}
              role="switch"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                autoEditar ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {msgAuto && (
            <p className={`text-xs ${msgAuto.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {msgAuto.ok ? '✓' : '✗'} {msgAuto.texto}
            </p>
          )}

          {/* Detalhes do processo */}
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-4 space-y-2">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <span>⚙️</span> Como funciona
            </p>
            <ul className="text-xs text-indigo-700 dark:text-indigo-300 space-y-1 pl-1">
              <li>• O cron diário verifica a inatividade do banco</li>
              <li>• Ao atingir <strong>5 dias</strong>, o último registro é re-salvo automaticamente</li>
              <li>• O registro é salvo como o usuário padrão configurado abaixo</li>
              <li>• Uma entrada no histórico é criada antes de cada edição automática</li>
            </ul>
          </div>

          {/* Botão de teste */}
          <button
            onClick={testarAgora}
            disabled={testando}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition disabled:opacity-60"
          >
            {testando
              ? <><div className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> Executando…</>
              : '▷ Executar verificação agora'
            }
          </button>

          {msgTeste && (
            <p className={`text-xs ${msgTeste.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {msgTeste.ok ? '✓' : '✗'} {msgTeste.texto}
            </p>
          )}
        </div>

        {/* ── Usuário padrão ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Usuário padrão</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Autor registrado nas edições automáticas do keep-alive.
            </p>
          </div>

          {loadingUsuarios ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              Carregando usuários…
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {usuarios.map(u => {
                  const selecionado = u.user_id === usuarioPadraoId
                  return (
                    <button
                      key={u.user_id}
                      onClick={() => setUsuarioPadraoId(u.user_id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        selecionado
                          ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/40 dark:border-brand-600'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        selecionado
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {(u.nome || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${selecionado ? 'text-brand-700 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200'}`}>
                          {u.nome || u.email}
                        </p>
                        {u.nome && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.email}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        u.perfil === 'admin'    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        : u.perfil === 'suporte' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {u.perfil}
                      </span>
                      {selecionado && (
                        <svg className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )
                })}
                {usuarios.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                    Nenhum usuário cadastrado ainda.
                  </p>
                )}
              </div>

              {usuarioPadraoId && (
                <button
                  onClick={salvarUsuarioPadrao}
                  disabled={salvandoUsuario}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
                >
                  {salvandoUsuario
                    ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando…</>
                    : '✓ Salvar usuário padrão'
                  }
                </button>
              )}

              {msgUsuario && (
                <p className={`text-xs text-center ${msgUsuario.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {msgUsuario.ok ? '✓' : '✗'} {msgUsuario.texto}
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Log de verificações ────────────────────────────────────── */}
        {!loadingLogs && logs.length > 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Últimas verificações</h2>
            <div className="space-y-1.5">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 text-sm"
                >
                  <span className="text-gray-500 dark:text-gray-400 shrink-0 text-xs">
                    {formatarDataCurta(log.verificado_em)}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium shrink-0">
                    {log.dias_sem_movimento}d
                  </span>
                  <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    log.editou_registro
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300'
                  }`}>
                    {log.editou_registro ? '✏️ auto-editado' : '✅ ok'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-center text-gray-400 dark:text-gray-600 leading-relaxed">
          O Supabase pausa projetos gratuitos após 7 dias sem atividade.
          O sistema edita automaticamente ao atingir 5 dias.
        </p>

      </main>

      <Footer />
    </div>
  )
}
