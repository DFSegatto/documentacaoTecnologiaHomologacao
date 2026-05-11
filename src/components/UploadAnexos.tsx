import { useState, useEffect, useRef } from 'react'
import { supabase, type ArquivoUpload, MAX_FILE_SIZE } from '../lib/supabase'

interface Props {
  onUpload: (arquivos: ArquivoUpload[]) => void
  arquivosExistentes?: ArquivoUpload[]
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadAnexos({ onUpload, arquivosExistentes = [] }: Props) {
  const [uploading,  setUploading]  = useState(false)
  const [arquivos,   setArquivos]   = useState<ArquivoUpload[]>(arquivosExistentes)

  // Sincroniza quando arquivosExistentes muda externamente (ex: restaurar rascunho)
  const prevAnexosRef = useRef(arquivosExistentes)
  useEffect(() => {
    if (arquivosExistentes === prevAnexosRef.current) return
    prevAnexosRef.current = arquivosExistentes
    setArquivos(arquivosExistentes)
  }, [arquivosExistentes])
  const [drag,       setDrag]       = useState(false)
  const [erros,      setErros]      = useState<string[]>([])
  const [progresso,  setProgresso]  = useState<Record<string, 'enviando' | 'ok' | 'erro'>>({})

  async function processarArquivos(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setErros([])
    const novos: ArquivoUpload[] = []
    const novosErros: string[] = []

    for (const file of Array.from(files)) {
      const isImagem = file.type.startsWith('image/')
      const isPdf    = file.type === 'application/pdf'

      if (!isImagem && !isPdf) {
        novosErros.push(`"${file.name}" não é uma imagem ou PDF.`)
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        novosErros.push(`"${file.name}" excede o limite de 50 MB.`)
        continue
      }

      // Sanitizar nome do arquivo — remove caracteres especiais que causam falha no upload
      const ext        = file.name.split('.').pop()?.toLowerCase() ?? ''
      const nomeLimpo  = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const bucket     = isImagem ? 'imagens' : 'documentos'

      setProgresso(p => ({ ...p, [nomeLimpo]: 'enviando' }))

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(nomeLimpo, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (error) {
        console.error('Upload error:', error)
        novosErros.push(`Erro ao enviar "${file.name}": ${error.message}`)
        setProgresso(p => ({ ...p, [nomeLimpo]: 'erro' }))
        continue
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
      setProgresso(p => ({ ...p, [nomeLimpo]: 'ok' }))
      novos.push({
        nome: file.name,
        url:  urlData.publicUrl,
        tipo: isImagem ? 'imagem' : 'pdf',
        tamanho: file.size,
      })
    }

    if (novosErros.length > 0) setErros(novosErros)
    const todos = [...arquivos, ...novos]
    setArquivos(todos)
    onUpload(todos)
    setUploading(false)
  }

  function remover(url: string) {
    const atualizados = arquivos.filter(a => a.url !== url)
    setArquivos(atualizados)
    onUpload(atualizados)
  }

  return (
    <div className="space-y-3">
      <label
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition
          ${drag ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/40'}`}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); processarArquivos(e.dataTransfer.files) }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.pdf,application/pdf"
          multiple
          className="hidden"
          onChange={e => { processarArquivos(e.target.files); e.target.value = '' }}
        />
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
          {uploading
            ? <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            : <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
          }
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {uploading ? 'Enviando arquivos...' : 'Clique ou arraste arquivos aqui'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Imagens (JPG, PNG, GIF, WebP) e PDFs · Máximo 50 MB por arquivo
          </p>
        </div>
      </label>

      {erros.length > 0 && (
        <div className="space-y-1">
          {erros.map((e, i) => (
            <p key={i} className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg flex items-start gap-2">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {e}
            </p>
          ))}
        </div>
      )}

      {arquivos.length > 0 && (
        <div className="space-y-2">
          {arquivos.map(a => (
            <div key={a.url} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-sm">
                {a.tipo === 'imagem' ? '🖼' : '📄'}
              </div>
              <div className="flex-1 min-w-0">
                <a href={a.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-gray-700 dark:text-gray-200 hover:text-brand-600 dark:hover:text-brand-400 truncate block">{a.nome}</a>
                {a.tamanho > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatarTamanho(a.tamanho)}</p>
                )}
              </div>
              <button type="button" onClick={() => remover(a.url)}
                className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition flex-shrink-0 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
