import { createContext, useContext, useRef, useState, type ReactNode } from 'react'

interface NavigationGuardContextType {
  // FormRegistro chama isso para registrar o guard quando há alterações não salvas
  registrarGuard: (guard: (acao: () => void) => void) => void
  // FormRegistro chama isso ao desmontar para remover o guard
  removerGuard: () => void
  // Navbar/Links chamam isso em vez de navegar diretamente
  navegar: (acao: () => void) => void
}

const NavigationGuardContext = createContext<NavigationGuardContextType>({
  registrarGuard: () => {},
  removerGuard:   () => {},
  navegar:        (acao) => acao(),
})

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<((acao: () => void) => void) | null>(null)

  function registrarGuard(guard: (acao: () => void) => void) {
    guardRef.current = guard
  }

  function removerGuard() {
    guardRef.current = null
  }

  function navegar(acao: () => void) {
    if (guardRef.current) {
      guardRef.current(acao)
    } else {
      acao()
    }
  }

  return (
    <NavigationGuardContext.Provider value={{ registrarGuard, removerGuard, navegar }}>
      {children}
    </NavigationGuardContext.Provider>
  )
}

export function useNavigationGuard() {
  return useContext(NavigationGuardContext)
}
