import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useNavigationGuard } from "../context/NavigationGuardContext";
import { supabase } from "../lib/supabase";
import { DOCS_SENIOR_NOTAS_VERSAO } from "../lib/documentacaoSenior";
import ThemeToggle from "./ThemeToggle";
import { usePerfil } from "../hooks/usePerfil";
import { useAvisosNovos } from "../hooks/useAvisosNovos";
import { useAlertaBanco } from "../hooks/useAlertaBanco";
import type { User } from "@supabase/supabase-js";

// ── Link de navegação padrão ─────────────────────────────────────────────────

function NavLink({
  to,
  icon,
  label,
  onClick,
  active,
}: {
  to: string
  icon: React.ReactNode
  label: string
  onClick: (e: React.MouseEvent) => void
  active?: boolean
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition whitespace-nowrap
        ${active
          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </Link>
  )
}

// ── Separador vertical ───────────────────────────────────────────────────────

function Sep() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0" />
}

// ── Navbar principal ─────────────────────────────────────────────────────────

export default function Navbar({ userEmail, user }: { userEmail?: string | null; user?: User | null }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { navegar } = useNavigationGuard();
  const [menuSeniorAberto, setMenuSeniorAberto] = useState(false);
  const [menuUserAberto,   setMenuUserAberto]   = useState(false);
  const refSenior = useRef<HTMLDivElement>(null);
  const refUser   = useRef<HTMLDivElement>(null);

  const { isAdmin, nome: nomeUsuario } = usePerfil(user ?? null);
  const { naoLidos } = useAvisosNovos();
  const { alerta: alertaBanco } = useAlertaBanco(isAdmin);

  const nav = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navegar(() => navigate(path));
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (refSenior.current && !refSenior.current.contains(e.target as Node)) setMenuSeniorAberto(false);
      if (refUser.current   && !refUser.current.contains(e.target as Node))   setMenuUserAberto(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const inicialNome = (nomeUsuario || userEmail || "?")[0].toUpperCase();

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">

        {/* ── Logo ── */}
        <Link
          to="/"
          onClick={nav("/")}
          className="flex items-center gap-2.5 group shrink-0 mr-2"
        >
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 transition whitespace-nowrap hidden sm:block">
            Base de Conhecimento
          </span>
        </Link>

        <Sep />

        {/* ── Navegação principal ── */}
        <nav className="flex items-center gap-0.5">
          <NavLink to="/chamados" active={isActive("/chamados")} onClick={nav("/chamados")}
            label="Chamados"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a2 2 0 10-4 0v.083A6 6 0 004 11v3.159c0 .538-.214 1.055-.595 1.436L2 17h5m8 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
          />
          <NavLink to="/sessoes" active={isActive("/sessoes")} onClick={nav("/sessoes")}
            label="Sessões"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            }
          />
          <NavLink to="/categorias" active={isActive("/categorias")} onClick={nav("/categorias")}
            label="Categorias"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
              </svg>
            }
          />
        </nav>

        <Sep />

        {/* ── Ferramentas / docs ── */}
        <div className="flex items-center gap-0.5">

          {/* Notas de versão do sistema */}
          <Link
            to="/notas-de-versao"
            onClick={nav("/notas-de-versao")}
            className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition whitespace-nowrap
              ${isActive("/notas-de-versao")
                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
          >
            <span className="relative shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {naoLidos > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-600" />
                </span>
              )}
            </span>
            <span className="hidden md:inline">Notas de versão</span>
            {naoLidos > 0 && (
              <span className="hidden md:inline text-xs font-semibold bg-brand-600 text-white rounded-full px-1.5 py-0.5 leading-none">
                {naoLidos}
              </span>
            )}
          </Link>

          {/* Dropdown Notas Senior */}
          <div className="relative" ref={refSenior}>
            <button
              type="button"
              onClick={() => setMenuSeniorAberto(v => !v)}
              aria-expanded={menuSeniorAberto}
              title="Notas de versão Senior"
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition whitespace-nowrap
                ${menuSeniorAberto
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="hidden md:inline">Senior</span>
              <svg className={`w-3 h-3 hidden md:block transition-transform ${menuSeniorAberto ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {menuSeniorAberto && (
              <div className="absolute right-0 mt-1 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg z-50">
                <p className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                  Notas de versão Senior
                </p>
                {DOCS_SENIOR_NOTAS_VERSAO.map(doc => (
                  <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => setMenuSeniorAberto(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {doc.titulo}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Espaço flexível ── */}
        <div className="flex-1" />

        {/* ── Ação primária ── */}
        <Link
          to="/registros/novo"
          onClick={nav("/registros/novo")}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition whitespace-nowrap shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Novo registro</span>
        </Link>

        <Sep />

        {/* ── Área do usuário ── */}
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />

          {/* Avatar / menu do usuário */}
          <div className="relative" ref={refUser}>
            <button
              onClick={() => setMenuUserAberto(v => !v)}
              title={nomeUsuario || userEmail || "Minha conta"}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition group"
            >
              {/* Avatar circular com inicial + bolinha de alerta do banco */}
              <span className="relative shrink-0">
                <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-950/60 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-300">
                  {inicialNome}
                </div>
                {alertaBanco && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border-2 border-white dark:border-gray-900" />
                  </span>
                )}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden md:block max-w-[140px] truncate">
                {nomeUsuario || userEmail}
              </span>
              <svg className={`w-3.5 h-3.5 text-gray-400 hidden md:block transition-transform ${menuUserAberto ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuUserAberto && (
              <div className="absolute right-0 mt-1 w-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg z-50">
                {/* Info do usuário */}
                <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {nomeUsuario || userEmail}
                  </p>
                  {nomeUsuario && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{userEmail}</p>
                  )}
                </div>

                {/* Links de conta */}
                {isAdmin && (
                  <Link
                    to="/perfis"
                    onClick={e => { setMenuUserAberto(false); nav("/perfis")(e) }}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Gerenciar perfis
                  </Link>
                )}
                <Link
                  to="/configuracoes"
                  onClick={e => { setMenuUserAberto(false); nav("/configuracoes")(e) }}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <span className="relative shrink-0">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {alertaBanco && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                      </span>
                    )}
                  </span>
                  <span className="flex-1">Configurações</span>
                  {alertaBanco && (
                    <span className="text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full px-1.5 py-0.5 leading-none">
                      atenção
                    </span>
                  )}
                </Link>

                <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                    </svg>
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
