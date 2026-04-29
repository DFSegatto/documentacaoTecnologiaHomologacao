import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, type PerfilDB, type PerfilUsuario } from '../lib/supabase'
import { usePerfil } from '../hooks/usePerfil'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Navigate } from 'react-router-dom'

interface PermissaoItem {
  label: string
  permitido: boolean
}

interface PerfilInfo {
  value: PerfilUsuario
  label: string
  descricao: string
  cor: string
  corBorda: string
  corFundo: string
  icone: string
  permissoes: PermissaoItem[]
}

const PERFIS_INFO: PerfilInfo[] = [
  {
    value: 'usuario',
    label: 'Usuário',
    descricao: 'Acesso padrão para colaboradores gerais.',
    icone: '👤',
    cor: 'text-gray-700 dark:text-gray-300',
    corBorda: 'border-gray-300 dark:border-gray-600',
    corFundo: 'bg-gray-100 dark:bg-gray-800',
    permissoes: [
      { label: 'Ver registros públicos',                permitido: true  },
      { label: 'Criar e editar registros',              permitido: true  },
      { label: 'Abrir chamados',                        permitido: true  },
      { label: 'Comentar em chamados',                  permitido: true  },
      { label: 'Excluir próprio chamado (aberto)',      permitido: true  },
      { label: 'Alterar status/prioridade de chamados', permitido: false },
      { label: 'Excluir comentários de terceiros',      permitido: false },
      { label: 'Gerenciar perfis de usuários',          permitido: false },
      { label: 'Acessar configurações avançadas',       permitido: false },
    ],
  },
  {
    value: 'suporte',
    label: 'Suporte',
    descricao: 'Para equipes de TI e atendimento.',
    icone: '🛠️',
    cor: 'text-blue-700 dark:text-blue-300',
    corBorda: 'border-blue-400 dark:border-blue-600',
    corFundo: 'bg-blue-100 dark:bg-blue-950/60',
    permissoes: [
      { label: 'Ver registros públicos',                permitido: true  },
      { label: 'Criar e editar registros',              permitido: true  },
      { label: 'Abrir chamados',                        permitido: true  },
      { label: 'Comentar em chamados',                  permitido: true  },
      { label: 'Excluir próprio chamado (aberto)',      permitido: true  },
      { label: 'Alterar status/prioridade de chamados', permitido: true  },
      { label: 'Excluir comentários de terceiros',      permitido: true  },
      { label: 'Gerenciar perfis de usuários',          permitido: false },
      { label: 'Acessar configurações avançadas',       permitido: false },
    ],
  },
  {
    value: 'admin',
    label: 'Admin',
    descricao: 'Acesso total ao sistema.',
    icone: '👑',
    cor: 'text-purple-700 dark:text-purple-300',
    corBorda: 'border-purple-400 dark:border-purple-600',
    corFundo: 'bg-purple-100 dark:bg-purple-950/60',
    permissoes: [
      { label: 'Ver registros públicos',                permitido: true  },
      { label: 'Criar e editar registros',              permitido: true  },
      { label: 'Abrir chamados',                        permitido: true  },
      { label: 'Comentar em chamados',                  permitido: true  },
      { label: 'Excluir próprio chamado (aberto)',      permitido: true  },
      { label: 'Alterar status/prioridade de chamados', permitido: true  },
      { label: 'Excluir comentários de terceiros',      permitido: true  },
      { label: 'Gerenciar perfis de usuários',          permitido: true  },
      { label: 'Acessar configurações avançadas',       permitido: true  },
    ],
  },
]

function PerfilBadge({ perfil }: { perfil: PerfilUsuario }) {
  const info = PERFIS_INFO.find(p => p.value === perfil)!
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${info.corFundo} ${info.cor}`}>
      {info.icone} {info.label}
    </span>
  )
}

function ModalConfirmacao({
  perfilAtual, perfilNovo, email, onConfirmar, onCancelar, salvando,
}: {
  perfilAtual: PerfilUsuario; perfilNovo: PerfilUsuario; email: string
  onConfirmar: () => void; onCancelar: () => void; salvando: boolean
}) {
  const infoAtual = PERFIS_INFO.find(p => p.value === perfilAtual)!
  const infoNovo  = PERFIS_INFO.find(p => p.value === perfilNovo)!

  const diferencas = infoNovo.permissoes
    .map((perm, i) => ({ ...perm, antes: infoAtual.permissoes[i].permitido }))
    .filter(p => p.antes !== p.permitido)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Alterar perfil do usuário</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Você está prestes a alterar o perfil de{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>.
          </p>

          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 mb-4">
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Perfil atual</p>
              <PerfilBadge perfil={perfilAtual} />
            </div>
            <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Novo perfil</p>
              <PerfilBadge perfil={perfilNovo} />
            </div>
          </div>

          {diferencas.length > 0 && (
            <div className="space-y-1 mb-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Mudanças de permissão:</p>
              {diferencas.map(d => (
                <div key={d.label} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg
                  ${d.permitido
                    ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'}`}>
                  <span className="font-semibold shrink-0">{d.permitido ? '+ Ganha:' : '− Perde:'}</span>
                  <span>{d.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onCancelar}
              disabled={salvando}
              className="flex-1 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700
                px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={salvando}
              className="flex-1 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 px-4 py-2.5 rounded-xl transition"
            >
              {salvando ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GerenciarPerfis({ user }: { user: User | null }) {
  const { isAdmin, loading: loadingPerfil } = usePerfil(user)

  const [perfis,       setPerfis]       = useState<PerfilDB[]>([])
  const [loading,      setLoading]      = useState(true)
  const [busca,        setBusca]        = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState<PerfilUsuario | ''>('')
  const [pendente,     setPendente]     = useState<{
    userId: string; email: string; perfilAtual: PerfilUsuario; perfilNovo: PerfilUsuario
  } | null>(null)
  const [salvando,  setSalvando]  = useState(false)
  const [feedbacks, setFeedbacks] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!loadingPerfil && isAdmin) carregar()
  }, [loadingPerfil, isAdmin])

  async function carregar() {
    const { data } = await supabase.from('perfis_usuario').select('*').order('email')
    setPerfis((data ?? []) as PerfilDB[])
    setLoading(false)
  }

  function solicitarAlteracao(userId: string, email: string, perfilAtual: PerfilUsuario, perfilNovo: PerfilUsuario) {
    if (perfilNovo === perfilAtual) return
    setPendente({ userId, email, perfilAtual, perfilNovo })
  }

  async function confirmarAlteracao() {
    if (!pendente) return
    setSalvando(true)
    const { error } = await supabase
      .from('perfis_usuario')
      .update({ perfil: pendente.perfilNovo })
      .eq('user_id', pendente.userId)

    if (!error) {
      setPerfis(prev => prev.map(p =>
        p.user_id === pendente.userId ? { ...p, perfil: pendente.perfilNovo } : p
      ))
      const uid = pendente.userId
      setFeedbacks(prev => new Set(prev).add(uid))
      setTimeout(() => setFeedbacks(prev => { const s = new Set(prev); s.delete(uid); return s }), 3000)
    }
    setSalvando(false)
    setPendente(null)
  }

  if (loadingPerfil) return null
  if (!isAdmin) return <Navigate to="/" replace />

  const contagem = {
    admin:   perfis.filter(p => p.perfil === 'admin').length,
    suporte: perfis.filter(p => p.perfil === 'suporte').length,
    usuario: perfis.filter(p => p.perfil === 'usuario').length,
  }

  const perfisFiltrados = perfis.filter(p => {
    const matchBusca  = !busca || p.email.toLowerCase().includes(busca.toLowerCase())
    const matchPerfil = !filtroPerfil || p.perfil === filtroPerfil
    return matchBusca && matchPerfil
  })

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />

      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">

        <div className="mb-7">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            Gerenciar Permissões
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Defina o nível de acesso de cada usuário. Clique nos ícones de perfil para alterar.
          </p>
        </div>

        {/* Cards de resumo clicáveis para filtrar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {PERFIS_INFO.map(info => (
            <button
              key={info.value}
              onClick={() => setFiltroPerfil(filtroPerfil === info.value ? '' : info.value)}
              className={`text-left rounded-xl border p-4 transition
                ${filtroPerfil === info.value
                  ? `${info.corBorda} ${info.corFundo}`
                  : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{info.icone}</span>
                <span className={`text-2xl font-bold ${info.cor}`}>{contagem[info.value]}</span>
              </div>
              <p className={`text-xs font-semibold ${info.cor}`}>{info.label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{info.descricao}</p>
              {filtroPerfil === info.value && (
                <p className="text-xs text-brand-600 dark:text-brand-400 mt-1.5 font-medium">✓ Filtrando</p>
              )}
            </button>
          ))}
        </div>

        {/* Tabela de permissões por perfil */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tabela de permissões</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-5 py-2.5 text-gray-500 dark:text-gray-400 font-medium w-full">Permissão</th>
                  {PERFIS_INFO.map(pf => (
                    <th key={pf.value} className="px-4 py-2.5 text-center whitespace-nowrap">
                      <span className={`font-semibold ${pf.cor}`}>{pf.icone} {pf.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {PERFIS_INFO[0].permissoes.map((_, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-2.5 text-gray-600 dark:text-gray-400">
                      {PERFIS_INFO[0].permissoes[idx].label}
                    </td>
                    {PERFIS_INFO.map(pf => (
                      <td key={pf.value} className="px-4 py-2.5 text-center">
                        {pf.permissoes[idx].permitido
                          ? <svg className="w-4 h-4 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          : <svg className="w-4 h-4 text-gray-200 dark:text-gray-700 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 mb-4 flex gap-3 items-center">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por e-mail..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {(busca || filtroPerfil) && (
            <button
              onClick={() => { setBusca(''); setFiltroPerfil('') }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Lista de usuários */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Usuário</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Perfil atual</span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Alterar para</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-14">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : perfisFiltrados.length === 0 ? (
            <div className="text-center py-14 text-gray-400 dark:text-gray-500">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {perfisFiltrados.map(p => {
                const ehVoce     = user?.id === p.user_id
                const perfilInfo = PERFIS_INFO.find(pf => pf.value === p.perfil)!
                const temFeedback = feedbacks.has(p.user_id)

                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-4 px-5 py-3.5 flex-wrap transition-colors duration-700
                      ${temFeedback ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                  >
                    {/* Avatar + email */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${perfilInfo.corFundo} ${perfilInfo.cor}`}>
                        {p.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {p.email}
                          {ehVoce && (
                            <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">(você)</span>
                          )}
                        </p>
                        {temFeedback && (
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Perfil atualizado com sucesso</p>
                        )}
                      </div>
                    </div>

                    {/* Badge perfil atual */}
                    <div className="shrink-0">
                      <PerfilBadge perfil={p.perfil} />
                    </div>

                    {/* Botões de seleção de perfil */}
                    <div className="shrink-0">
                      {ehVoce ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">Seu perfil</span>
                      ) : (
                        <div className="flex gap-1.5">
                          {PERFIS_INFO.map(pf => (
                            <button
                              key={pf.value}
                              onClick={() => solicitarAlteracao(p.user_id, p.email, p.perfil, pf.value)}
                              disabled={p.perfil === pf.value}
                              title={`Definir como ${pf.label}`}
                              className={`w-8 h-8 rounded-lg border flex items-center justify-center text-base transition
                                ${p.perfil === pf.value
                                  ? `${pf.corFundo} ${pf.corBorda} cursor-default`
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                                }`}
                            >
                              {pf.icone}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!loading && perfisFiltrados.length > 0 && (
            <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {perfisFiltrados.length} {perfisFiltrados.length === 1 ? 'usuário' : 'usuários'}
                {(busca || filtroPerfil) && ` de ${perfis.length} no total`}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                {PERFIS_INFO.map(pf => (
                  <span key={pf.value}>{pf.icone} = {pf.label}</span>
                ))}
              </div>
            </div>
          )}
        </div>

      </main>

      <Footer />

      {pendente && (
        <ModalConfirmacao
          perfilAtual={pendente.perfilAtual}
          perfilNovo={pendente.perfilNovo}
          email={pendente.email}
          onConfirmar={confirmarAlteracao}
          onCancelar={() => setPendente(null)}
          salvando={salvando}
        />
      )}
    </div>
  )
}
