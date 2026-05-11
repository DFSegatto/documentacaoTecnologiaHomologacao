import { Link } from 'react-router-dom'

export default function Footer() {
  const ano = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Links rápidos */}
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
            Registros
          </Link>
          <span className="text-gray-200 dark:text-gray-700">·</span>
          <Link to="/sessoes" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
            Sessões
          </Link>
          <span className="text-gray-200 dark:text-gray-700">·</span>
          <Link to="/categorias" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
            Categorias
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center sm:text-right">
          © {ano} Base de Conhecimento · Desenvolvido por{' '}
          <span className="text-gray-600 dark:text-gray-400 font-medium">Daniel França Segatto</span>
        </p>
      </div>
    </footer>
  )
}
