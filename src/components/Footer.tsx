import { Link } from 'react-router-dom'

export default function Footer() {
  const ano = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Links rápidos */}
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 transition">
            Registros
          </Link>
          <span className="text-gray-200">·</span>
          <Link to="/sessoes" className="text-xs text-gray-400 hover:text-gray-600 transition">
            Sessões
          </Link>
          <span className="text-gray-200">·</span>
          <Link to="/categorias" className="text-xs text-gray-400 hover:text-gray-600 transition">
            Categorias
          </Link>
          <span className="text-gray-200">·</span>
          <Link to="/configuracoes" className="text-xs text-gray-400 hover:text-gray-600 transition">
            Configurações
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-xs text-gray-400 text-center sm:text-right">
          © {ano} Base de Conhecimento · Desenvolvido por{' '}
          <span className="text-gray-600 font-medium">Daniel França Segatto</span>
        </p>
      </div>
    </footer>
  )
}
