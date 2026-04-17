import { DOCS_SENIOR_NOTAS_VERSAO } from '../lib/documentacaoSenior'

function IconeLinkExterno({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

/** Bloco na página inicial com atalhos para as notas de versão Senior. */
export default function LinksDocumentacaoSenior() {
  return (
    <section
      className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      aria-labelledby="docs-senior-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="docs-senior-heading" className="text-sm font-semibold text-gray-900">
            Documentação Senior
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Notas de versão oficiais — os links abrem em uma nova aba do navegador.
          </p>
        </div>
        <ul className="flex flex-col gap-2 sm:items-end shrink-0">
          {DOCS_SENIOR_NOTAS_VERSAO.map(doc => (
            <li key={doc.id}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 transition"
              >
                <span className="truncate sm:max-w-[280px] text-left">{doc.titulo}</span>
                <IconeLinkExterno className="w-4 h-4 flex-shrink-0 text-gray-400" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
