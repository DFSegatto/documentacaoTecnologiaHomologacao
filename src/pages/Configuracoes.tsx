import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

interface LogEntry {
  id: string
  verificado_em: string
  ultima_atividade: string
  dias_sem_movimento: number
  alerta_enviado: boolean
  email_destino: string
}

export default function Configuracoes({ user }: { user: User | null }) {
  const [email,       setEmail]       = useState('')
  const [emailAtual,  setEmailAtual]  = useState('')
  const [salvando,    setSalvando]    = useState(false)
  const [testando,    setTestando]    = useState(false)
  const [logs,        setLogs]        = useState<LogEntry[]>([])
  const [loading,     setLoading]     = useState(true)
  const [msg,         setMsg]         = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [diasAtivos,  setDiasAtivos]  = useState<number | null>(null)

  async function carregar() {
    setLoading(true)

    // Busca e-mail configurado
    const { data: cfg } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'email_alerta_keepalive')
      .single()

    if (cfg?.valor) {
      setEmail(cfg.valor)
      setEmailAtual(cfg.valor)
    }

    // Busca última atividade
    const { data: ultimo } = await supabase
      .from('registros')
      .select('atualizado_em')
      .order('atualizado_em', { ascending: false })
      .limit(1)
      .single()

    if (ultimo?.atualizado_em) {
      const dias = Math.floor(
        (Date.now() - new Date(ultimo.atualizado_em).getTime()) / (1000 * 60 * 60 * 24)
      )
      setDiasAtivos(dias)
    } else {
      setDiasAtivos(0)
    }

    // Busca últimos logs
    const { data: logsData } = await supabase
      .from('keepalive_log')
      .select('*')
      .order('verificado_em', { ascending: false })
      .limit(10)

    setLogs((logsData ?? []) as LogEntry[])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvarEmail() {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setMsg({ tipo: 'erro', texto: 'Digite um e-mail válido.' })
      return
    }
    setSalvando(true)
    setMsg(null)

    const { error } = await supabase
      .from('configuracoes')
      .upsert({ chave: 'email_alerta_keepalive', valor: email.trim() }, { onConflict: 'chave' })

    if (error) {
      setMsg({ tipo: 'erro', texto: 'Erro ao salvar. Tente novamente.' })
    } else {
      setEmailAtual(email.trim())
      setMsg({ tipo: 'ok', texto: 'E-mail salvo com sucesso! O alerta será enviado automaticamente.' })
    }
    setSalvando(false)
  }

  async function testarAlerta() {
    if (!emailAtual) {
      setMsg({ tipo: 'erro', texto: 'Salve um e-mail antes de testar.' })
      return
    }
    setTestando(true)
    setMsg(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/keepalive-check`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      const json = await resp.json()

      if (json.alerta) {
        setMsg({ tipo: 'ok', texto: `Alerta enviado para ${emailAtual}. Verifique sua caixa de entrada.` })
      } else {
        setMsg({ tipo: 'ok', texto: `Verificação executada. Banco ativo há ${json.diasSemMovimento} dia(s) — sem alerta necessário.` })
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro ao chamar a função. Verifique o deploy da Edge Function.' })
    }

    await carregar()
    setTestando(false)
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const statusCor = diasAtivos === null ? 'gray'
    : diasAtivos >= 6 ? 'red'
    : diasAtivos >= 5 ? 'amber'
    : 'green'

  const statusCores = {
    green: 'bg-green-50 border-green-200 text-green-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red:   'bg-red-50 border-red-200 text-red-800',
    gray:  'bg-gray-50 border-gray-200 text-gray-600',
  }

  const statusIcone = { green: '✅', amber: '⚠️', red: '🔴', gray: '⏳' }
  const statusTexto = {
    green: `Banco ativo — ${diasAtivos} ${diasAtivos === 1 ? 'dia' : 'dias'} desde a última atividade`,
    amber: `Atenção — ${diasAtivos} dias sem atividade. Alerta enviado.`,
    red:   `Crítico — ${diasAtivos} dias sem atividade. Banco pode ser pausado!`,
    gray:  'Carregando status...',
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col">
      <Navbar userEmail={user?.email} />
      <main className="max-w-2xl mx-auto px-4 py-8 flex-1">

        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-gray-600 transition">Registros</Link>
          <span>/</span>
          <span className="text-gray-700">Configurações</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Configurações</h1>
          <p className="text-sm text-gray-500 mt-1">Monitoramento e alertas do banco de dados</p>
        </div>

        {/* Status atual do banco */}
        <div className={`rounded-xl border px-5 py-4 mb-6 flex items-start gap-3 ${statusCores[statusCor]}`}>
          <span className="text-xl flex-shrink-0">{statusIcone[statusCor]}</span>
          <div>
            <p className="font-medium text-sm">{statusTexto[statusCor]}</p>
            <p className="text-xs mt-0.5 opacity-75">
              O Supabase pausa projetos gratuitos após 7 dias sem atividade
            </p>
          </div>
        </div>

        {/* Configuração do e-mail */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800">E-mail de alerta keep-alive</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Receba uma notificação quando o banco ficar 5 dias sem atividade
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Endereço de e-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && salvarEmail()}
                placeholder="seu@email.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent
                           transition placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                O alerta é verificado diariamente. Se o banco ficar 5+ dias sem novos registros
                ou edições, um e-mail de aviso será enviado para este endereço.
              </p>
            </div>

            {msg && (
              <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm
                ${msg.tipo === 'ok'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-600 border border-red-200'}`}>
                <span>{msg.tipo === 'ok' ? '✓' : '✗'}</span>
                <span>{msg.texto}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={salvarEmail}
                disabled={salvando || email === emailAtual}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white
                           font-medium px-4 py-2 rounded-lg text-sm transition
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvando
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</>
                  : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>Salvar e-mail</>
                }
              </button>

              {emailAtual && (
                <button
                  onClick={testarAlerta}
                  disabled={testando}
                  className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50
                             text-gray-600 font-medium px-4 py-2 rounded-lg text-sm transition
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testando
                    ? <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Verificando...</>
                    : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>Testar agora</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Como funciona */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Como funciona</h2>
          <div className="space-y-3">
            {[
              { n: '1', t: 'Verificação diária automática', d: 'Uma função roda todo dia às 9h e verifica a data do último registro criado ou editado.' },
              { n: '2', t: 'Alerta no 5º dia', d: 'Se o banco ficar 5 dias sem atividade, um e-mail de aviso é enviado para o endereço cadastrado.' },
              { n: '3', t: 'Evitar a pausa', d: 'Para manter o banco ativo, basta criar ou editar qualquer registro. O contador reinicia automaticamente.' },
              { n: '4', t: 'Se o banco for pausado', d: 'Acesse supabase.com/dashboard e clique em "Restore project". A restauração leva cerca de 2 minutos.' },
            ].map(({ n, t, d }) => (
              <div key={n} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-brand-700">{n}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{t}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Log de verificações */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Histórico de verificações</h2>
            <span className="text-xs text-gray-400">Últimas 10</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">Nenhuma verificação executada ainda.</p>
              <p className="text-xs mt-1">Use o botão "Testar agora" para executar manualmente.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base flex-shrink-0">
                      {log.alerta_enviado ? '📧' : '✅'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700">{formatarData(log.verificado_em)}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {log.dias_sem_movimento} {log.dias_sem_movimento === 1 ? 'dia' : 'dias'} sem atividade
                        {log.alerta_enviado && ` · alerta enviado para ${log.email_destino}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-3
                    ${log.alerta_enviado
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'}`}>
                    {log.alerta_enviado ? 'Alerta enviado' : 'Normal'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Setup da Edge Function */}
        <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configuração necessária (uma vez)
          </h3>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Para os alertas funcionarem, siga os passos no arquivo <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-xs">KEEPALIVE_SETUP.md</code> incluído no projeto.
          </p>
          <div className="space-y-1.5">
            {[
              'Criar conta gratuita no Resend (resend.com)',
              'Adicionar RESEND_API_KEY e SITE_URL nas variáveis da Edge Function',
              'Fazer deploy da função: supabase functions deploy keepalive-check',
              'Ativar o cron diário via SQL no Supabase',
            ].map((passo, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs font-bold text-gray-400 flex-shrink-0 mt-0.5">{i + 1}.</span>
                <p className="text-xs text-gray-600">{passo}</p>
              </div>
            ))}
          </div>
        </div>

      </main>
      <Footer />
    </div>
  )
}
