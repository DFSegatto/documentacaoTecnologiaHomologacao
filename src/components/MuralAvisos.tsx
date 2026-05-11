import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

/** Avisos vêm da tabela `avisos` no Supabase (SQL Editor ou Table Editor). */
type TipoAviso = "novidade" | "melhoria" | "correcao" | "aviso";

interface Aviso {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  descricao: string;
  versao: string | null;
  publicado_em: string;
  ativo: boolean;
}

const CONFIGS: Record<
  TipoAviso,
  { cor: string; bg: string; borda: string; icone: string; label: string }
> = {
  novidade: {
    cor: "text-brand-700 dark:text-brand-300",
    bg: "bg-brand-50 dark:bg-brand-950/40",
    borda: "border-brand-200 dark:border-brand-800",
    icone: "✨",
    label: "Novidade",
  },
  melhoria: {
    cor: "text-teal-700 dark:text-teal-300",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    borda: "border-teal-200 dark:border-teal-800",
    icone: "⚡",
    label: "Melhoria",
  },
  correcao: {
    cor: "text-green-700 dark:text-green-300",
    bg: "bg-green-50 dark:bg-green-950/40",
    borda: "border-green-200 dark:border-green-800",
    icone: "🔧",
    label: "Correção",
  },
  aviso: {
    cor: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    borda: "border-amber-200 dark:border-amber-800",
    icone: "⚠️",
    label: "Aviso",
  },
};

const LIMITE_MURAL = 5;
/** Quantos registros buscar antes de ordenar por versão e cortar em LIMITE_MURAL */
const BUSCA_ANTES_ORDENAR = 40;

function partesVersao(v: string | null): number[] {
  if (!v?.trim()) return [];
  return v.trim().split(".").map((p) => {
    const n = parseInt(p, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

/** Compara versões tipo 1.9 / 1.10 (numérico por segmento). */
function cmpVersaoAsc(va: string | null, vb: string | null): number {
  const a = partesVersao(va);
  const b = partesVersao(vb);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const da = a[i] ?? 0;
    const db = b[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

/** Maior versão primeiro; sem versão por último; empate: mais recente em publicado_em. */
function ordenarAvisosPorVersao(lista: Aviso[]): Aviso[] {
  return [...lista].sort((a, b) => {
    const semA = !a.versao?.trim();
    const semB = !b.versao?.trim();
    if (semA && semB) {
      return (
        new Date(b.publicado_em).getTime() - new Date(a.publicado_em).getTime()
      );
    }
    if (semA) return 1;
    if (semB) return -1;
    const c = cmpVersaoAsc(b.versao, a.versao);
    if (c !== 0) return c;
    return (
      new Date(b.publicado_em).getTime() - new Date(a.publicado_em).getTime()
    );
  });
}

export default function MuralAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState(true);
  const [dispensados, setDispensados] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("avisos-dispensados");
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    supabase
      .from("avisos")
      .select("*")
      .eq("ativo", true)
      .order("publicado_em", { ascending: false })
      .limit(BUSCA_ANTES_ORDENAR)
      .then(({ data }) => {
        const rows = (data ?? []) as Aviso[];
        setAvisos(ordenarAvisosPorVersao(rows).slice(0, LIMITE_MURAL));
        setLoading(false);
      });
  }, []);

  function dispensar(id: string) {
    const novo = new Set(dispensados).add(id);
    setDispensados(novo);
    try {
      localStorage.setItem("avisos-dispensados", JSON.stringify([...novo]));
    } catch {}
  }

  function dispensarTodos() {
    const ids = avisos.map((a) => a.id);
    const novo = new Set([...dispensados, ...ids]);
    setDispensados(novo);
    try {
      localStorage.setItem("avisos-dispensados", JSON.stringify([...novo]));
    } catch {}
    setAberto(false);
  }

  const visiveis = avisos.filter((a) => !dispensados.has(a.id));

  if (loading || visiveis.length === 0) return null;

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="mb-6">
      {/* Header do mural */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-100">
            Novidades do sistema
          </h2>
          <span
            className="text-xs font-medium tabular-nums min-w-[1.25rem] text-center px-1.5 py-0.5 rounded-full
            bg-brand-100 text-brand-800
            dark:bg-brand-600 dark:text-white dark:ring-1 dark:ring-brand-500/80"
          >
            {visiveis.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAberto((v) => !v)}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition flex items-center gap-1"
          >
            {aberto ? "Recolher" : "Expandir"}
            <svg
              className={`w-3.5 h-3.5 transition-transform ${aberto ? "" : "-rotate-90"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <button
            onClick={dispensarTodos}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
            title="Marcar todos como lidos"
          >
            Dispensar todos
          </button>
        </div>
      </div>

      {/* Lista de avisos */}
      {aberto && (
        <div className="space-y-2.5">
          {visiveis.map((aviso) => {
            const cfg = CONFIGS[aviso.tipo];
            return (
              <div
                key={aviso.id}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${cfg.bg} ${cfg.borda}`}
              >
                {/* Ícone */}
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {cfg.icone}
                </span>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${cfg.cor}`}
                    >
                      {cfg.label}
                    </span>
                    {aviso.versao && (
                      <Link
                        to="/notas-de-versao"
                        className="text-xs font-mono text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-950/60 px-1.5 py-0.5 rounded border border-brand-200 dark:border-brand-700 transition"
                        title="Ver notas de versão"
                      >
                        v{aviso.versao}
                      </Link>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatarData(aviso.publicado_em)}
                    </span>
                  </div>
                  <p className={`text-sm font-semibold ${cfg.cor}`}>
                    {aviso.titulo}
                  </p>
                  {aviso.descricao && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                      {aviso.descricao}
                    </p>
                  )}
                </div>

                {/* Fechar */}
                <button
                  onClick={() => dispensar(aviso.id)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition flex-shrink-0 mt-0.5"
                  title="Marcar como lido"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
