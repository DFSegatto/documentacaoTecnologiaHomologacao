import { useState } from 'react'
import { supabase } from '../lib/supabase'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const [email,      setEmail]      = useState('')
  const [senha,      setSenha]      = useState('')
  const [erro,       setErro]       = useState('')
  const [loading,    setLoading]    = useState(false)
  const [magicSent,  setMagicSent]  = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha incorretos.')
    setLoading(false)
  }

  async function handleMagicLink() {
    if (!email) { setErro('Digite seu e-mail primeiro.'); return }
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setErro('Erro ao enviar link. Tente novamente.')
    else setMagicSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Base de Conhecimento</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Área restrita — time de suporte</p>
        </div>

        {magicSent ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
            <div className="text-4xl mb-3">📬</div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Verifique seu e-mail</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Enviamos um link para <strong>{email}</strong>.</p>
            <button onClick={() => setMagicSent(false)} className="mt-4 text-sm text-brand-600 dark:text-brand-400 hover:underline">
              Voltar
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="voce@empresa.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Senha</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-gray-500" />
              </div>
              {erro && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">{erro}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-xl text-sm transition disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100 dark:border-gray-800" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400 dark:text-gray-500">ou</span>
              </div>
            </div>

            <button onClick={handleMagicLink} disabled={loading}
              className="w-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium py-2.5 rounded-xl text-sm transition disabled:opacity-60">
              Entrar com link por e-mail
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
