import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase, type ArquivoUpload, type Credencial } from '../lib/supabase'
import type { CredencialForm } from '../components/FormCredencial'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import FormRegistro from '../components/FormRegistro'
import { useNavigationGuard } from '../context/NavigationGuardContext'

interface RegistroRaw {
  id: string
  titulo: string
  conteudo: string
  sessao_id: string | null
  categoria_id: string | null
  privado: boolean
  criado_por: string
}

export default function EditarRegistro({ user }: { user: User | null }) {
  const { id }          = useParams<{ id: string }>()
  const navigate        = useNavigate()
  const { navegar }     = useNavigationGuard()
  const [registro,      setRegistro]      = useState<RegistroRaw | null>(null)
  const [anexos,        setAnexos]        = useState<ArquivoUpload[]>([])
  const [credenciais,   setCredenciais]   = useState<CredencialForm[]>([])
  const [temCredencial, setTemCredencial] = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [semPermissao,   setSemPermissao]   = useState(false)

  useEffect(() => {
    if (!id) return
    async function carregar() {
      // Busca o registro completo incluindo privado
      const { data: reg } = await supabase
        .from('registros')
        .select('id, titulo, conteudo, sessao_id, categoria_id, privado, criado_por')
        .eq('id', id)
        .single()

      const [{ data: anx }, { data: creds }] = await Promise.all([
        supabase.from('anexos').select('nome, url, tipo, tamanho').eq('registro_id', id),
        supabase.from('credenciais').select('*').eq('registro_id', id).order('ordem', { ascending: true }),
      ])

      // Bloqueia edição de registro privado por outro usuário
      const { data: { user } } = await supabase.auth.getUser()
      if ((reg as RegistroRaw).privado && (reg as RegistroRaw).criado_por !== user?.id) {
        setSemPermissao(true)
        setLoading(false)
        return
      }

      setRegistro(reg as RegistroRaw)
      setAnexos((anx ?? []) as ArquivoUpload[])

      if (creds && creds.length > 0) {
        // Converte Credencial do banco para CredencialForm (senha vazia — cifrada não pode ser descriptografada aqui)
        const formsCredenciais: CredencialForm[] = (creds as Credencial[]).map(c => ({
          tipo:        c.tipo,
          label:       c.label       ?? '',
          host:        c.host        ?? '',
          porta:       c.porta       ?? '',
          usuario:     c.usuario     ?? '',
          senha:       '',            // campo em branco — usuário preenche se quiser alterar
          dominio:     c.dominio     ?? '',
          observacoes: c.observacoes ?? '',
        }))
        setCredenciais(formsCredenciais)
        setTemCredencial(true)
      }

      setLoading(false)
    }
    carregar()
  }, [id])

  if (semPermissao) return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} />
      <div className="max-w-md mx-auto px-4 py-32 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Sem permissão</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Este registro é privado e só pode ser editado pelo seu criador.
        </p>
        <Link to="/" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700
          text-white font-medium px-5 py-2.5 rounded-xl text-sm transition">
          ← Voltar para registros
        </Link>
      </div>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} />
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  if (!registro) return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} />
      <div className="text-center py-32">
        <p className="font-medium text-gray-700 dark:text-gray-300">Registro não encontrado</p>
        <Link to="/" className="text-sm text-brand-600 dark:text-brand-400 hover:underline mt-2 inline-block">Voltar</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8f7f4] dark:bg-gray-950 flex flex-col">
      <Navbar userEmail={user?.email} />
      <main className="max-w-3xl mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-6">
          <Link to="/" onClick={e => { e.preventDefault(); navegar(() => navigate('/')) }} className="hover:text-gray-600 dark:hover:text-gray-300 transition">Registros</Link>
          <span>/</span>
          <Link to={`/registros/${id}`} className="hover:text-gray-600 dark:hover:text-gray-300 transition truncate max-w-xs">
            {registro.titulo}
          </Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-200">Editar</span>
        </div>
        <FormRegistro
          modo="editar"
          inicial={{
            id:               registro.id,
            titulo:           registro.titulo,
            sessao_id:        registro.sessao_id    ?? '',
            categoria_id:     registro.categoria_id ?? '',
            conteudo:         registro.conteudo,
            privado:          registro.privado,
            temCredencial,
            credenciaisExistentes: credenciais,
            anexosExistentes: anexos,
          }}
        />
      </main>
      <Footer />
    </div>
  )
}
