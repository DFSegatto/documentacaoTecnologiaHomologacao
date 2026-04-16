import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, type Anexo, type CategoriaDB, type Sessao, type Credencial } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import CategoriaBadge from '../components/CategoriaBadge'
import VisualizarCredencial from '../components/VisualizarCredencial'

interface RegistroCompleto {
  id: string
  titulo: string
  conteudo: string
  privado: boolean
  criado_por: string
  criado_em: string
  atualizado_em: string
  sessao_id: string | null
  sessao: Sessao | null
  categoria_id: string | null
  categoria: CategoriaDB | null
}

export default function VerRegistro({ user }: { user: User | null }) {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()

  const [registro,    setRegistro]    = useState<RegistroCompleto | null>(null)
  const [anexos,      setAnexos]      = useState<Anexo[]>([])
  const [credenciais, setCredenciais] = useState<Credencial[]>([])
  const [loading,     setLoading]     = useState(true)
  const [semAcesso,   setSemAcesso]   = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [excluindo,   setExcluindo]   = useState(false)

  useEffect(() => {
    if (!id) return
    async function carregar() {
      const { data: reg, error } = await supabase
        .from('registros')
        .select('*, sessao:sessoes(id,nome,cor,descricao,criado_em), categoria:categorias(id,nome,cor,criado_em)')
        .eq('id', id)
        .single()

      // RLS retorna erro se o usuário não tem acesso ao registro privado
      if (error || !reg) {
        setSemAcesso(true)
        setLoading(false)
        return
      }

      const { data: anx } = await supabase
        .from('anexos').select('*').eq('registro_id', id).order('criado_em')

      const { data: creds } = await supabase
        .from('credenciais')
        .select('*')
        .eq('registro_id', id)
        .order('ordem', { ascending: true })

      setRegistro(reg as unknown as RegistroCompleto)
      setAnexos((anx ?? []) as Anexo[])
      setCredenciais((creds ?? []) as Credencial[])
      setLoading(false)
    }
    carregar()
  }, [id])

  async function handleExcluir() {
    setExcluindo(true)
    await supabase.from('credenciais').delete().eq('registro_id', id)
    await supabase.from('anexos').delete().eq('registro_id', id)
    await supabase.from('registros').delete().eq('id', id)
    navigate('/')
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  function formatarTamanho(bytes: number) {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col">
      <Navbar userEmail={user?.email} />
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  if (semAcesso) return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col">
      <Navbar userEmail={user?.email} />
      <div className="max-w-md mx-auto px-4 py-32 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Acesso restrito</h1>
        <p className="text-sm text-gray-500 mb-6">
          Este registro é privado e pertence a outro usuário.
        </p>
        <Link to="/" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700
          text-white font-medium px-5 py-2.5 rounded-xl text-sm transition">
          ← Voltar para registros
        </Link>
      </div>
    </div>
  )

  if (!registro) return null

  const imagens = anexos.filter(a => a.tipo === 'imagem')
  const pdfs    = anexos.filter(a => a.tipo === 'pdf')
  const ehDono  = user?.id === registro.criado_por

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col">
      <Navbar userEmail={user?.email} />

      <main className="max-w-3xl mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-gray-600 transition">Registros</Link>
          <span>/</span>
          <span className="text-gray-700 truncate max-w-xs">{registro.titulo}</span>
        </div>

        <article className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Badge privado */}
                {registro.privado && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
                    text-xs font-medium bg-amber-100 text-amber-800">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Privado
                  </span>
                )}
                {registro.sessao && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: registro.sessao.cor + '22', color: registro.sessao.cor }}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    {registro.sessao.nome}
                  </span>
                )}
                {registro.categoria && <CategoriaBadge categoria={registro.categoria} />}
              </div>

              {/* Ações — só o dono vê editar/excluir */}
              {ehDono && (
                <div className="flex items-center gap-2">
                  <Link to={`/registros/${id}/historico`}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800
                               px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Histórico
                  </Link>
                  <Link to={`/registros/${id}/editar`}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800
                               px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </Link>
                  {confirmando ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Confirmar?</span>
                      <button onClick={handleExcluir} disabled={excluindo}
                        className="text-xs text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg transition">
                        {excluindo ? 'Excluindo...' : 'Sim'}
                      </button>
                      <button onClick={() => setConfirmando(false)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 transition">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmando(true)}
                      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500
                                 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir
                    </button>
                  )}
                </div>
              )}
            </div>

            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">{registro.titulo}</h1>
            <p className="text-sm text-gray-400">
              Criado em {formatarData(registro.criado_em)}
              {registro.atualizado_em !== registro.criado_em && (
                <> · Atualizado em {formatarData(registro.atualizado_em)}</>
              )}
            </p>
          </div>

          <div className="h-px bg-gray-100 mb-6" />

          {/* Credenciais — sempre exibidas primeiro quando presentes */}
          {credenciais.length > 0 && user && (
            <div className="mb-6">
              <VisualizarCredencial credenciais={credenciais} userId={user.id} />
            </div>
          )}

          {/* Conteúdo — exibido abaixo das credenciais, só se tiver texto */}
          {registro.conteudo && registro.conteudo !== '<p></p>' && (
            <>
              {credenciais.length > 0 && (
                <div className="h-px bg-gray-100 mb-5" />
              )}
              <div className="tiptap-editor" dangerouslySetInnerHTML={{ __html: registro.conteudo }} />
            </>
          )}

          {/* Imagens */}
          {imagens.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Imagens</h3>
              <div className="grid grid-cols-2 gap-3">
                {imagens.map(img => (
                  <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer"
                    className="block rounded-xl overflow-hidden border border-gray-100 hover:opacity-90 transition">
                    <img src={img.url} alt={img.nome} className="w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* PDFs */}
          {pdfs.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Documentos</h3>
              <div className="space-y-2">
                {pdfs.map(pdf => (
                  <a key={pdf.id} href={pdf.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl
                               px-4 py-3 hover:border-brand-200 hover:bg-brand-50 transition group">
                    <span className="text-xl">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 group-hover:text-brand-700 font-medium truncate">{pdf.nome}</p>
                      {pdf.tamanho > 0 && <p className="text-xs text-gray-400">{formatarTamanho(pdf.tamanho)}</p>}
                    </div>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-500 flex-shrink-0"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}
        </article>

        <div className="mt-6 flex justify-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-800 transition">
            ← Voltar para todos os registros
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
