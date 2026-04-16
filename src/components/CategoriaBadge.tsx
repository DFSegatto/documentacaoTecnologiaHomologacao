import type { CategoriaDB } from '../lib/supabase'

interface Props {
  categoria?: CategoriaDB | null
  nome?: string
  cor?: string
}

export default function CategoriaBadge({ categoria, nome, cor }: Props) {
  const n = categoria?.nome ?? nome ?? 'Sem categoria'
  const c = categoria?.cor  ?? cor  ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c}`}>
      {n}
    </span>
  )
}
