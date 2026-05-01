import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ThemeToggle from "../components/ThemeToggle";

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [novaSenha,   setNovaSenha]   = useState("");
  const [confirmar,   setConfirmar]   = useState("");
  const [erro,        setErro]        = useState("");
  const [sucesso,     setSucesso]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [contador,    setContador]    = useState(3);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (novaSenha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setLoading(false);

    if (error) {
      setErro("Erro ao redefinir senha. Tente novamente.");
    } else {
      setSucesso(true);
      let restante = 3;
      const intervalo = setInterval(() => {
        restante -= 1;
        setContador(restante);
        if (restante <= 0) {
          clearInterval(intervalo);
          navigate("/");
        }
      }, 1000);
    }
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
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            Redefinir senha
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Digite sua nova senha abaixo
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          {sucesso ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Senha redefinida!</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Redirecionando para a página inicial em{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">{contador}s</span>
              </p>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1 overflow-hidden">
                <div
                  className="h-1 bg-brand-600 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(contador / 3) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirmar senha
                </label>
                <input
                  type="password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  required
                  placeholder="Repita a nova senha"
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
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              >
                Cancelar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
