import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { usePerfil } from '../hooks/usePerfil'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Configuracoes({ user }: { user: User | null }) {
  const { isAdmin } = usePerfil(user)

  const [diasSemAtividade, setDiasSemAtividade] = useState<number | null>(null)
  const [ultimaAtividade,  setUltimaAtividade]  = useState<string | null>(null)
  const [loading,          setLoading]          = useState(true)

  useEffect(() => {
    async function carregar() {
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
      setLoading(false)
    }
    carregar()
  }, [])

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  // Determina nível de atenção
  const nivel: 'ok' | 'atencao' | 'critico' =
    diasSemAtividade === null ? 'ok'
    : diasSemAtividade >= 7   ? 'critico'
    : diasSemAtividade >= 5   ? 'atencao'
    : 'ok'

  const nivelConfig = {
    ok: {
      icone: '🟢',
      titulo: 'Banco ativo',
      cor: 'text-green-700 dark:text-green-300',
      bg: 'bg-green-50 dark:bg-green-950/30',
      borda: 'border-green-200 dark:border-green-800',
      barraFundo: 'bg-green-100 dark:bg-green-950/50',
      barraPreenchimento: 'bg-green-500',
    },
    atencao: {
      icone: '🟡',
      titulo: 'Atenção necessária',
      cor: 'text-amber-700 dark:text-amber-300',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      borda: 'border-amber-200 dark:border-amber-800',
      barraFundo: 'bg-amber-100 dark:bg-amber-950/50',
      barraPreenchimento: 'bg-amber-500',
    },
    critico: {
      icone: '🔴',
      titulo: 'Risco de pausa',
      cor: 'text-red-700 dark:text-red-300',
      bg: 'bg-red-50 dark:bg-red-950/30',
      borda: 'border-red-200 dark:border-red-800',
      barraFundo: 'bg-red-100 dark:bg-red-950/50',
      barraPreenchimento: 'bg-red-500',
    },
  }[nivel]

  // Barra de progresso: 0–10 dias mapeados em 0–100%
  const pct = Math.min(100, ((diasSemAtividade ?? 0) / 7) * 100)

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} user={user} />

      <main className="max-w-xl mx-auto px-4 py-10 flex-1 w-full">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-7 min-w-0 overflow-hidden">
          <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition shrink-0">Registros</Link>
          <span className="shrink-0">/</span>
          <span className="text-gray-700 dark:text-gray-200">Configurações</span>
        </div>

        <div className="mb-7">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Configurações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Status do banco de dados</p>
        </div>

        {/* Card de status */}
        <div className={`rounded-2xl border ${nivelConfig.borda} ${nivelConfig.bg} p-6`}>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Header do card */}
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

                {/* Ícone do banco */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${nivelConfig.borda} bg-white/60 dark:bg-gray-900/40`}>
                  <svg className={`w-6 h-6 ${nivelConfig.cor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                  <span>0 dias</span>
                  <span className={`font-medium ${nivel === 'atencao' ? 'text-amber-600 dark:text-amber-400' : nivel === 'critico' ? 'text-red-600 dark:text-red-400' : ''}`}>
                    Limite: 5 dias
                  </span>
                  <span>7 dias</span>
                </div>
                <div className={`h-2.5 rounded-full ${nivelConfig.barraFundo} overflow-hidden`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${nivelConfig.barraPreenchimento}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {/* Marcador do limite de 5 dias */}
                <div className="relative h-0">
                  <div className="absolute top-0 h-3 w-px bg-gray-400 dark:bg-gray-500 opacity-50 -translate-y-3" style={{ left: '71.4%' }} />
                </div>
              </div>

              {/* Mensagem contextual */}
              <div className={`rounded-xl p-3.5 border ${nivelConfig.borda} bg-white/50 dark:bg-gray-900/30`}>
                {nivel === 'ok' && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Banco saudável. Para mantê-lo ativo, basta criar ou editar qualquer registro antes de completar <strong>10 dias</strong> sem atividade.
                  </p>
                )}
                {nivel === 'atencao' && (
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    ⚠️ O banco está próximo do limite. <strong>Crie ou edite qualquer registro</strong> para reiniciar o contador e evitar a pausa automática.
                  </p>
                )}
                {nivel === 'critico' && (
                  <p className="text-sm text-red-800 dark:text-red-200">
                    🚨 Risco alto! O banco pode ser pausado em breve. <strong>Acesse o sistema e edite qualquer registro</strong> imediatamente. Se já pausado, restaure em <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-medium">supabase.com/dashboard</a>.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Nota informativa */}
        <p className="text-xs text-center text-gray-400 dark:text-gray-600 mt-5 leading-relaxed">
          O Supabase pausa projetos gratuitos após 7 dias sem atividade.
          O sistema notifica administradores a partir de 5 dias sem edições. O banco é pausado aos 7 dias.
        </p>

      </main>

      <Footer />
    </div>
  )
}
