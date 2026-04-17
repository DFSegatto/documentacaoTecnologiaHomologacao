import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { DOCS_SENIOR_NOTAS_VERSAO } from "../lib/documentacaoSenior";
import ThemeToggle from "./ThemeToggle";

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
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40">
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
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 transition">
            Base de Conhecimento
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            to="/sessoes"
            className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm px-3 py-1.5 rounded-lg transition"
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
            className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm px-3 py-1.5 rounded-lg transition"
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
                ${menuDocsAberto ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
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
                className="absolute right-0 mt-1 w-[min(100vw-2rem,20rem)] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg z-50"
              >
                <p className="px-3 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
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
                    className="flex items-start gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500"
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
          <div className="flex items-center gap-1 pl-2 border-l border-gray-100 dark:border-gray-800 ml-1">
            <ThemeToggle />
            {userEmail && (
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block max-w-[180px] truncate">
                {userEmail}
              </span>
            )}
            <button
              onClick={handleLogout}
              title="Sair"
              className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 transition"
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
