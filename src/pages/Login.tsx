import { useState } from "react";
import { supabase } from "../lib/supabase";
import ThemeToggle from "../components/ThemeToggle";

export default function Login() {
  const [email,        setEmail]        = useState("");
  const [senha,        setSenha]        = useState("");
  const [erro,         setErro]         = useState("");
  const [loading,      setLoading]      = useState(false);
  const [telaRecuperar, setTelaRecuperar] = useState(false);
  const [linkEnviado,  setLinkEnviado]  = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) setErro("E-mail ou senha incorretos.");
    setLoading(false);
  }

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    const { data: existe, error: erroRpc } = await supabase.rpc("email_cadastrado", { p_email: email });

    if (erroRpc || !existe) {
      setLoading(false);
      setErro("E-mail não encontrado. Verifique se está correto ou entre em contato com o administrador.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      if (error.status === 429) {
        setErro("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.");
      } else {
        setErro("Erro ao enviar o link. Tente novamente.");
      }
    } else {
      setLinkEnviado(true);
    }
  }

  function voltarLogin() {
    setTelaRecuperar(false);
    setLinkEnviado(false);
    setErro("");
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            Base de Conhecimento
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Área restrita — Tecnologia
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          {telaRecuperar ? (
            linkEnviado ? (
              <div className="text-center">
                <div className="text-4xl mb-3">📬</div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Verifique seu e-mail
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enviamos um link para <strong>{email}</strong>. Clique nele para redefinir sua senha.
                </p>
                <button
                  onClick={voltarLogin}
                  className="mt-4 text-sm text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecuperar} className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Recuperar senha
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Digite seu e-mail e enviaremos um link para redefinir sua senha.
                  </p>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="voce@empresa.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
                {erro && (
                  <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">
                    {erro}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-xl text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </button>
                <button
                  type="button"
                  onClick={voltarLogin}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                >
                  Voltar ao login
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="voce@empresa.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              {erro && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">
                  {erro}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-xl text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setTelaRecuperar(true); setErro(""); }}
                  className="text-sm text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 transition"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
