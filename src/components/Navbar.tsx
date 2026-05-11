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

// ── Link de navegação ────────────────────────────────────────────────────────

function NavLink({
  to, icon, label, onClick, active, badge,
}: {
  to: string
  icon: React.ReactNode
  label: string
  onClick: (e: React.MouseEvent) => void
  active?: boolean
  badge?: React.ReactNode
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all duration-150 whitespace-nowrap select-none
        ${active
          ? "text-gray-900 dark:text-gray-100 font-medium bg-gray-100 dark:bg-gray-800"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/60"
        }`}
    >
      <span className="relative shrink-0 flex items-center">
        {icon}
        {badge}
      </span>
      <span className="hidden lg:inline">{label}</span>
    </Link>
  )
}

// ── Navbar ───────────────────────────────────────────────────────────────────

export default function Navbar({ userEmail, user }: { userEmail?: string | null; user?: User | null }) {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { navegar } = useNavigationGuard();

  const [menuSeniorAberto, setMenuSeniorAberto] = useState(false);
  const [menuUserAberto,   setMenuUserAberto]   = useState(false);
  const refSenior = useRef<HTMLDivElement>(null);
  const refUser   = useRef<HTMLDivElement>(null);

  const { isAdmin, nome: nomeUsuario } = usePerfil(user ?? null);
  const { naoLidos }                   = useAvisosNovos();
  const { alerta: alertaBanco }        = useAlertaBanco(isAdmin);

  const go = (path: string) => (e: React.MouseEvent) => { e.preventDefault(); navegar(() => navigate(path)); };
  const at  = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

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

  const inicial = (nomeUsuario || userEmail || "?")[0].toUpperCase();

  // Bolinha de notificação genérica
  const Dot = ({ color = "brand" }: { color?: "brand" | "amber" }) => (
    <span className="absolute -top-1 -right-1 flex h-2 w-2 pointer-events-none">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-70
        ${color === "amber" ? "bg-amber-400" : "bg-brand-500"}`} />
      <span className={`relative inline-flex rounded-full h-2 w-2
        ${color === "amber" ? "bg-amber-500" : "bg-brand-600"}`} />
    </span>
  );

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
      <div className="max-w-[1280px] mx-auto px-5 h-14 flex items-center gap-0">

        {/* ── Logo ─────────────────────────────────────────── */}
        <Link
          to="/"
          onClick={go("/")}
          className="flex items-center gap-2.5 group shrink-0 pr-5"
        >
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors whitespace-nowrap hidden sm:block">
            Base de Conhecimento
          </span>
        </Link>

        {/* Divisor fino após logo */}
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

        {/* ── Navegação central ─────────────────────────────── */}
        <nav className="flex items-center gap-0.5 px-4 flex-1 min-w-0">
          <NavLink to="/chamados" active={at("/chamados")} onClick={go("/chamados")} label="Chamados"
            icon={
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a2 2 0 10-4 0v.083A6 6 0 004 11v3.159c0 .538-.214 1.055-.595 1.436L2 17h5m8 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
          />
          <NavLink to="/sessoes" active={at("/sessoes")} onClick={go("/sessoes")} label="Sessões"
            icon={
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            }
          />
          <NavLink to="/categorias" active={at("/categorias")} onClick={go("/categorias")} label="Categorias"
            icon={
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
              </svg>
            }
          />

          {/* Spacer — empurra docs/ações para a direita */}
          <div className="flex-1" />

          {/* Notas de versão */}
          <NavLink to="/notas-de-versao" active={at("/notas-de-versao")} onClick={go("/notas-de-versao")} label="Notas de versão"
            badge={naoLidos > 0 ? <Dot /> : undefined}
            icon={
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />

          {/* Senior dropdown */}
          <div className="relative" ref={refSenior}>
            <button
              type="button"
              onClick={() => setMenuSeniorAberto(v => !v)}
              aria-expanded={menuSeniorAberto}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all duration-150 whitespace-nowrap select-none
                ${menuSeniorAberto
                  ? "text-gray-900 dark:text-gray-100 font-medium bg-gray-100 dark:bg-gray-800"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                }`}
            >
              <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="hidden lg:inline">Senior</span>
              <svg className={`w-3 h-3 text-gray-400 hidden lg:block transition-transform duration-200 ${menuSeniorAberto ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuSeniorAberto && (
              <div className="absolute right-0 top-full mt-1.5 w-72 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg shadow-gray-200/60 dark:shadow-black/30 overflow-hidden z-50">
                <p className="px-4 py-2.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                  Notas de versão Senior
                </p>
                {DOCS_SENIOR_NOTAS_VERSAO.map(doc => (
                  <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => setMenuSeniorAberto(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
        </nav>

        {/* Divisor fino antes das ações */}
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

        {/* ── Ações direita ─────────────────────────────────── */}
        <div className="flex items-center gap-2 pl-4 shrink-0">

          {/* Botão primário */}
          <Link
            to="/registros/novo"
            onClick={go("/registros/novo")}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.97] text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap shadow-sm shadow-brand-200 dark:shadow-brand-900/40"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Novo registro</span>
          </Link>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Avatar / menu do usuário */}
          <div className="relative" ref={refUser}>
            <button
              onClick={() => setMenuUserAberto(v => !v)}
              title={nomeUsuario || userEmail || "Minha conta"}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150
                ${menuUserAberto
                  ? "bg-gray-100 dark:bg-gray-800"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
            >
              {/* Avatar */}
              <span className="relative shrink-0">
                <span className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-950/60 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-300 ring-2 ring-white dark:ring-gray-900">
                  {inicial}
                </span>
                {alertaBanco && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 pointer-events-none">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 ring-2 ring-white dark:ring-gray-900" />
                  </span>
                )}
              </span>
              {/* Nome */}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block max-w-[120px] truncate">
                {nomeUsuario || userEmail}
              </span>
              <svg className={`w-3.5 h-3.5 text-gray-400 hidden md:block transition-transform duration-200 ${menuUserAberto ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown do usuário */}
            {menuUserAberto && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg shadow-gray-200/60 dark:shadow-black/30 overflow-hidden z-50">
                {/* Cabeçalho */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {nomeUsuario || userEmail}
                  </p>
                  {nomeUsuario && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{userEmail}</p>
                  )}
                </div>

                {/* Itens */}
                <div className="py-1">
                  {isAdmin && (
                    <Link
                      to="/perfis"
                      onClick={e => { setMenuUserAberto(false); go("/perfis")(e) }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Gerenciar perfis
                    </Link>
                  )}
                  <Link
                    to="/redefinir-senha"
                    onClick={e => { setMenuUserAberto(false); go("/redefinir-senha")(e) }}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Alterar senha
                  </Link>
                  <Link
                    to="/configuracoes"
                    onClick={e => { setMenuUserAberto(false); go("/configuracoes")(e) }}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="relative shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {alertaBanco && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2 pointer-events-none">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                      )}
                    </span>
                    <span className="flex-1">Configurações</span>
                    {alertaBanco && (
                      <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 rounded-full px-1.5 py-0.5 leading-none shrink-0">
                        atenção
                      </span>
                    )}
                  </Link>
                </div>

                {/* Sair */}
                <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                    </svg>
                    Sair da conta
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
