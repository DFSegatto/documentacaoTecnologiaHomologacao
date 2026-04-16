import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import FormRegistro from '../components/FormRegistro'

export default function NovoRegistro({ user }: { user: User | null }) {
  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col">
      <Navbar userEmail={user?.email} />
      <main className="max-w-3xl mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-gray-600 transition">Registros</Link>
          <span>/</span>
          <span className="text-gray-700">Novo registro</span>
        </div>
        <FormRegistro modo="criar" />
      </main>
      <Footer />
    </div>
  )
}
