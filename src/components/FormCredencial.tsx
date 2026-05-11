import { useState } from 'react'
import { TIPOS_CREDENCIAL, type TipoCredencial } from '../lib/supabase'
import { criptografar } from '../lib/cripto'

export interface CredencialForm {
  tipo: TipoCredencial
  label: string
  host: string
  porta: string
  usuario: string
  senha: string
  dominio: string
  observacoes: string
}

export const CREDENCIAL_VAZIA: CredencialForm = {
  tipo: 'rdp', label: '', host: '', porta: '3389',
  usuario: '', senha: '', dominio: '', observacoes: '',
}

interface Props {
  credencial: CredencialForm
  indice: number
  total: number
  modoEdicao?: boolean
  onChange: (dados: CredencialForm) => void
  onRemover: () => void
}

export default function FormCredencial({ credencial, indice, total, modoEdicao, onChange, onRemover }: Props) {
  const [mostrarSenha, setMostrarSenha] = useState(false)

  function atualizar(campo: Partial<CredencialForm>) {
    onChange({ ...credencial, ...campo })
  }

  function selecionarTipo(t: TipoCredencial) {
    const def = TIPOS_CREDENCIAL.find(x => x.value === t)
    atualizar({ tipo: t, porta: def?.porta ?? credencial.porta })
  }

  const tipoAtual = TIPOS_CREDENCIAL.find(t => t.value === credencial.tipo)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
      {/* Header do acesso */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">{indice + 1}</span>
          </div>
          <input
            type="text"
            value={credencial.label}
            onChange={e => atualizar({ label: e.target.value })}
            placeholder={`Acesso ${indice + 1} — ex: Servidor Principal`}
            className="text-sm font-medium bg-transparent border-none outline-none text-gray-700 dark:text-gray-200
                       placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:font-normal w-64"
          />
        </div>
        {total > 1 && (
          <button type="button" onClick={onRemover}
            className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
            title="Remover este acesso">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Tipo */}
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_CREDENCIAL.map(t => (
            <button key={t.value} type="button" onClick={() => selecionarTipo(t.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border
                ${credencial.tipo === t.value
                  ? 'bg-gray-800 dark:bg-gray-700 text-white border-gray-800 dark:border-gray-700'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Host + Porta */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {credencial.tipo === 'vpn' ? 'Servidor / Endpoint' : credencial.tipo === 'http' ? 'URL / Endereço' : 'Host / IP'}
            </label>
            <input type="text" value={credencial.host}
              onChange={e => atualizar({ host: e.target.value })}
              placeholder={credencial.tipo === 'http' ? 'https://painel.exemplo.com' : '192.168.0.1'}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none
                         focus:ring-2 focus:ring-brand-600 focus:border-transparent transition
                         placeholder:text-gray-300 dark:placeholder:text-gray-600 font-mono" />
          </div>
          {credencial.tipo !== 'vpn' && credencial.tipo !== 'http' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Porta</label>
              <input type="text" value={credencial.porta}
                onChange={e => atualizar({ porta: e.target.value })}
                placeholder={tipoAtual?.porta || '—'}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none
                           focus:ring-2 focus:ring-brand-600 focus:border-transparent transition
                           placeholder:text-gray-300 dark:placeholder:text-gray-600 font-mono" />
            </div>
          )}
        </div>

        {/* Domínio (só RDP) */}
        {credencial.tipo === 'rdp' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Domínio <span className="text-gray-300 dark:text-gray-600">(opcional)</span>
            </label>
            <input type="text" value={credencial.dominio}
              onChange={e => atualizar({ dominio: e.target.value })}
              placeholder="EMPRESA ou empresa.local"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none
                         focus:ring-2 focus:ring-brand-600 focus:border-transparent transition
                         placeholder:text-gray-300 dark:placeholder:text-gray-600 font-mono" />
          </div>
        )}

        {/* Usuário + Senha */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Usuário</label>
            <input type="text" value={credencial.usuario}
              onChange={e => atualizar({ usuario: e.target.value })}
              placeholder="administrator" autoComplete="off"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none
                         focus:ring-2 focus:ring-brand-600 focus:border-transparent transition
                         placeholder:text-gray-300 dark:placeholder:text-gray-600 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              Senha
              <span className="text-green-600 dark:text-green-400 font-normal flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                AES-256
              </span>
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={credencial.senha}
                onChange={e => atualizar({ senha: e.target.value })}
                placeholder={modoEdicao && !credencial.senha ? "Manter senha atual (deixe vazio)" : "••••••••"} autoComplete="new-password"
                className="w-full px-3 py-2 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none
                           focus:ring-2 focus:ring-brand-600 focus:border-transparent transition
                           placeholder:text-gray-300 dark:placeholder:text-gray-600 font-mono" />
              <button type="button" onClick={() => setMostrarSenha(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
                {mostrarSenha
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Observações <span className="text-gray-300 dark:text-gray-600">(opcional)</span>
          </label>
          <textarea value={credencial.observacoes}
            onChange={e => atualizar({ observacoes: e.target.value })}
            placeholder="Ex: Usar fora do horário comercial. VPN necessária antes de conectar."
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none
                       focus:ring-2 focus:ring-brand-600 focus:border-transparent transition
                       placeholder:text-gray-300 dark:placeholder:text-gray-600 resize-none" />
        </div>
      </div>
    </div>
  )
}

/** Criptografa os campos sensíveis de uma credencial */
export async function criptografarCredencial(
  form: CredencialForm,
  userId: string
): Promise<Omit<CredencialForm, 'senha'> & { senha_cifrada: string }> {
  const senha_cifrada = form.senha ? await criptografar(form.senha, userId) : ''
  const { senha: _, ...resto } = form
  return { ...resto, senha_cifrada }
}
