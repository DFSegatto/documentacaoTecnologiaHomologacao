import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { DOCS_SENIOR_NOTAS_VERSAO } from "../lib/documentacaoSenior";

export default function Navbar({ userEmail }: { userEmail?: string | null }) {
  const navigate = useNavigate();
  const [menuDocsAberto, setMenuDocsAberto] = useState(false);
  const refMenuDocs = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fecharAoClicarFora(e: MouseEvent) {
      if (
        refMenuDocs.current &&
        !refMenuDocs.current.contains(e.target as Node)
      ) {
        setMenuDocsAberto(false);
      }
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);
  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900 group-hover:text-brand-600 transition">
            Base de Conhecimento
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            to="/sessoes"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-sm px-3 py-1.5 rounded-lg transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <span className="hidden sm:inline">Sessões</span>
          </Link>
          <Link
            to="/categorias"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-sm px-3 py-1.5 rounded-lg transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z"
              />
            </svg>
            <span className="hidden sm:inline">Categorias</span>
          </Link>

          <div className="relative" ref={refMenuDocs}>
            <button
              type="button"
              onClick={() => setMenuDocsAberto((v) => !v)}
              aria-expanded={menuDocsAberto}
              aria-haspopup="true"
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition
                ${menuDocsAberto ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span className="hidden sm:inline">Notas de versão Senior</span>
            </button>
            {menuDocsAberto && (
              <div
                role="menu"
                className="absolute right-0 mt-1 w-[min(100vw-2rem,20rem)] rounded-xl border border-gray-200 bg-white py-1 shadow-lg z-50"
              >
                <p className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  Notas de versão Senior
                </p>
                {DOCS_SENIOR_NOTAS_VERSAO.map((doc) => (
                  <a
                    key={doc.id}
                    role="menuitem"
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuDocsAberto(false)}
                    className="flex items-start gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    <span>{doc.titulo}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/registros/novo"
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-3.5 py-1.5 rounded-lg transition ml-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Novo registro
          </Link>
          <Link
            to="/configuracoes"
            title="Configurações"
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Link>
          <div className="flex items-center gap-2 pl-2 border-l border-gray-100 ml-1">
            {userEmail && (
              <span className="text-xs text-gray-500 hidden sm:block">
                {userEmail}
              </span>
            )}
            <button
              onClick={handleLogout}
              title="Sair"
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
