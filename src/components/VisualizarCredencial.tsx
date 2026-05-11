import { useState } from 'react'
import { descriptografar } from '../lib/cripto'
import { TIPOS_CREDENCIAL, type Credencial } from '../lib/supabase'

interface Props {
  credenciais: Credencial[]
  userId: string
}

function CampoSenha({ cifrado, userId }: { cifrado: string; userId: string }) {
  const [valor,     setValor]     = useState<string | null>(null)
  const [visivel,   setVisivel]   = useState(false)
  const [copiado,   setCopiado]   = useState(false)
  const [revelando, setRevelando] = useState(false)
  const [erro,      setErro]      = useState(false)

  async function revelar() {
    if (valor !== null) { setVisivel(v => !v); return }
    setRevelando(true)
    const result = await descriptografar(cifrado, userId)
    if (result === null) { setErro(true); setRevelando(false); return }
    setValor(result)
    setVisivel(true)
    setRevelando(false)
  }

  async function copiar() {
    const texto = valor ?? await descriptografar(cifrado, userId)
    if (!texto) return
    setValor(texto)
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (erro) return <span className="text-xs text-red-400">Erro ao descriptografar</span>

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm text-green-300">
        {visivel && valor !== null ? valor : '••••••••••••'}
      </span>
      <button type="button" onClick={revelar} disabled={revelando}
        className="text-gray-500 hover:text-gray-300 transition" title={visivel ? 'Ocultar' : 'Revelar'}>
        {revelando
          ? <div className="w-3.5 h-3.5 border border-gray-500 border-t-transparent rounded-full animate-spin" />
          : visivel
            ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
        }
      </button>
      <button type="button" onClick={copiar} className="text-gray-500 hover:text-green-400 transition" title="Copiar senha">
        {copiado
          ? <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        }
      </button>
    </div>
  )
}

function CampoCopia({ valor }: { valor: string }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    await navigator.clipboard.writeText(valor)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm text-gray-200">{valor || '—'}</span>
      {valor && (
        <button type="button" onClick={copiar} className="text-gray-500 hover:text-gray-300 transition">
          {copiado
            ? <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
          }
        </button>
      )}
    </div>
  )
}

function CartaoCredencial({ cred, userId, indice }: { cred: Credencial; userId: string; indice: number }) {
  const tipo = TIPOS_CREDENCIAL.find(t => t.value === cred.tipo)

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-gray-300">{indice + 1}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {cred.label || tipo?.label || cred.tipo}
            </p>
            {cred.label && (
              <p className="text-xs text-gray-400">{tipo?.label}</p>
            )}
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          AES-256
        </span>
      </div>

      {/* Campos */}
      <div className="divide-y divide-gray-800">
        {cred.host && (
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-xs text-gray-500 w-20 flex-shrink-0">
              {cred.tipo === 'vpn' ? 'Servidor' : cred.tipo === 'http' ? 'URL' : 'Host / IP'}
            </span>
            <CampoCopia valor={cred.porta ? `${cred.host}:${cred.porta}` : cred.host} />
          </div>
        )}
        {cred.dominio && (
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-xs text-gray-500 w-20 flex-shrink-0">Domínio</span>
            <CampoCopia valor={cred.dominio} />
          </div>
        )}
        {cred.usuario && (
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-xs text-gray-500 w-20 flex-shrink-0">Usuário</span>
            <CampoCopia valor={cred.usuario} />
          </div>
        )}
        {cred.senha_cifrada && (
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-xs text-gray-500 w-20 flex-shrink-0">Senha</span>
            <CampoSenha cifrado={cred.senha_cifrada} userId={userId} />
          </div>
        )}
        {cred.observacoes && (
          <div className="flex items-start gap-3 px-4 py-2.5">
            <span className="text-xs text-gray-500 w-20 flex-shrink-0 mt-0.5">Obs.</span>
            <p className="text-sm text-gray-400 leading-relaxed">{cred.observacoes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VisualizarCredencial({ credenciais, userId }: Props) {
  if (!credenciais || credenciais.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Título da seção */}
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {credenciais.length === 1 ? 'Credencial de acesso' : `${credenciais.length} credenciais de acesso`}
        </span>
      </div>

      {/* Cartões */}
      {credenciais.map((cred, i) => (
        <CartaoCredencial key={cred.id} cred={cred} userId={userId} indice={i} />
      ))}
    </div>
  )
}
