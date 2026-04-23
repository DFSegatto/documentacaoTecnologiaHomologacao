import { useEffect, useRef } from 'react'
import { useEditor, EditorContent, type Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '../lib/supabase'

interface EditorProps {
  conteudo: string
  onChange: (html: string) => void
}

function Toolbar({ editor }: { editor: TiptapEditor }) {
  const btn = (active: boolean) =>
    `p-1.5 rounded-md text-sm transition ${active ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`

  async function handleImageUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const path = `${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage.from('imagens').upload(path, file)
      if (error) { alert('Erro ao enviar imagem'); return }
      const { data: url } = supabase.storage.from('imagens').getPublicUrl(data.path)
      editor.chain().focus().setImage({ src: url.publicUrl }).run()
    }
    input.click()
  }

  function setLink() {
    const url = window.prompt('URL do link:')
    if (!url) return
    editor.chain().focus().setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Negrito">
        <strong className="text-xs">B</strong>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Itálico">
        <em className="text-xs">I</em>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive('code'))} title="Código">
        <span className="text-xs font-mono">&lt;/&gt;</span>
      </button>
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))} title="Título">
        <span className="text-xs font-semibold">H2</span>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))} title="Subtítulo">
        <span className="text-xs font-semibold">H3</span>
      </button>
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} title="Lista">
        <span className="text-xs">• —</span>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))} title="Lista numerada">
        <span className="text-xs">1.</span>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))} title="Citação">
        <span className="text-xs">"</span>
      </button>
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
      <button type="button" onClick={setLink} className={btn(editor.isActive('link'))} title="Link">
        <span className="text-xs">🔗</span>
      </button>
      <button type="button" onClick={handleImageUpload} className={btn(false)} title="Imagem">
        <span className="text-xs">🖼</span>
      </button>
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
      <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btn(false)} title="Desfazer">
        <span className="text-xs">↩</span>
      </button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btn(false)} title="Refazer">
        <span className="text-xs">↪</span>
      </button>
    </div>
  )
}

export default function Editor({ conteudo, onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Descreva o problema, solução, passo a passo...' }),
    ],
    content: conteudo,
    editorProps: { attributes: { class: 'tiptap-editor' } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Sincroniza conteúdo externo (ex: restaurar rascunho) sem perder cursor se já for igual
  const prevConteudo = useRef(conteudo)
  useEffect(() => {
    if (!editor) return
    if (conteudo === prevConteudo.current) return
    prevConteudo.current = conteudo
    if (editor.getHTML() !== conteudo) {
      editor.commands.setContent(conteudo ?? '', false)
    }
  }, [conteudo, editor])

  if (!editor) return null

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
      <Toolbar editor={editor} />
      <div className="px-5 py-4 dark:bg-gray-900">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
