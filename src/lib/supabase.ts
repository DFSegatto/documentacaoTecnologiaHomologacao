import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export interface Sessao {
  id: string
  nome: string
  descricao: string
  cor: string
  parent_id: string | null
  criado_em: string
}

export interface SessaoComFilhas extends Sessao {
  filhas: Sessao[]
}

export interface CategoriaDB {
  id: string
  nome: string
  cor: string
  criado_em: string
}

export interface Registro {
  id: string
  titulo: string
  conteudo: string
  sessao_id: string | null
  categoria_id: string | null
  privado: boolean
  criado_por: string
  editado_por: string | null
  criado_em: string
  atualizado_em: string
}

export interface Credencial {
  id: string
  registro_id: string
  tipo: TipoCredencial
  label: string          // nome identificador do acesso ex: "Servidor Principal"
  host: string
  porta: string
  usuario: string
  senha_cifrada: string
  dominio: string
  observacoes: string
  ordem: number
  criado_em: string
}

export type TipoCredencial =
  | 'rdp'
  | 'vpn'
  | 'ssh'
  | 'ftp'
  | 'http'
  | 'outro'

export const TIPOS_CREDENCIAL: { value: TipoCredencial; label: string; porta: string }[] = [
  { value: 'rdp',   label: 'RDP / Remote Desktop', porta: '3389' },
  { value: 'vpn',   label: 'VPN',                  porta: ''     },
  { value: 'ssh',   label: 'SSH',                  porta: '22'   },
  { value: 'ftp',   label: 'FTP / SFTP',           porta: '21'   },
  { value: 'http',  label: 'HTTP / Painel Web',     porta: '443'  },
  { value: 'outro', label: 'Outro',                 porta: ''     },
]

export interface Anexo {
  id: string
  registro_id: string
  nome: string
  url: string
  tipo: 'imagem' | 'pdf'
  tamanho: number
  criado_em: string
}

export interface ArquivoUpload {
  nome: string
  url: string
  tipo: 'imagem' | 'pdf'
  tamanho: number
}

export interface HistoricoRegistro {
  id: string
  registro_id: string
  titulo: string
  conteudo: string
  editado_por: string | null
  editado_em: string
  editor_email?: string
}

export function agruparSessoes(sessoes: Sessao[]): SessaoComFilhas[] {
  const raizes = sessoes.filter(s => !s.parent_id)
  const filhas = sessoes.filter(s =>  s.parent_id)
  return raizes.map(r => ({
    ...r,
    filhas: filhas
      .filter(f => f.parent_id === r.id)
      .sort((a, b) => a.nome.localeCompare(b.nome)),
  }))
}

export const CORES_SESSAO = [
  { value: '#4f46e5', label: 'Roxo'     },
  { value: '#0891b2', label: 'Ciano'    },
  { value: '#059669', label: 'Verde'    },
  { value: '#d97706', label: 'Âmbar'   },
  { value: '#dc2626', label: 'Vermelho' },
  { value: '#db2777', label: 'Rosa'     },
  { value: '#7c3aed', label: 'Violeta'  },
  { value: '#475569', label: 'Cinza'    },
]

export const CORES_CATEGORIA = [
  { value: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-200', label: 'Vermelho' },
  { value: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200', label: 'Azul' },
  { value: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-200', label: 'Verde' },
  { value: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-200', label: 'Amarelo' },
  { value: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-200', label: 'Roxo' },
  { value: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-200', label: 'Rosa' },
  { value: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-200', label: 'Laranja' },
  { value: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200', label: 'Cinza' },
]

export const MAX_FILE_SIZE = 50 * 1024 * 1024
