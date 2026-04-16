/**
 * Criptografia AES-256-GCM no lado do cliente
 *
 * A chave deriva do UID do usuário + SALT fixo via PBKDF2.
 * O banco recebe apenas dados cifrados — nunca senhas em texto claro.
 *
 * Formato armazenado: "<iv_base64>.<ciphertext_base64>"
 * Separador "." é usado pois nunca aparece em base64 padrão (que usa A-Z a-z 0-9 + /)
 */

const SALT      = 'suporte-docs-credentials-v1'
const SEPARATOR = '.'   // nunca ocorre em base64 padrão

async function derivarChave(userId: string): Promise<CryptoKey> {
  const enc    = new TextEncoder()
  const keyMat = await crypto.subtle.importKey(
    'raw',
    enc.encode(userId + SALT).buffer as ArrayBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name:       'PBKDF2',
      salt:       enc.encode(SALT).buffer as ArrayBuffer,
      iterations: 100_000,
      hash:       'SHA-256',
    },
    keyMat,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function bufParaBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function base64ParaBuf(b64: string): ArrayBuffer {
  const bytes = new Uint8Array([...atob(b64)].map(c => c.charCodeAt(0)))
  return bytes.buffer as ArrayBuffer
}

/**
 * Criptografa um texto usando AES-256-GCM.
 * Retorna "<iv_base64>.<ciphertext_base64>"
 */
export async function criptografar(texto: string, userId: string): Promise<string> {
  if (!texto) return ''
  const chave = await derivarChave(userId)
  const iv    = crypto.getRandomValues(new Uint8Array(12))
  const enc   = new TextEncoder()

  const cifrado = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    chave,
    enc.encode(texto).buffer as ArrayBuffer
  )

  return `${bufParaBase64(iv.buffer as ArrayBuffer)}${SEPARATOR}${bufParaBase64(cifrado)}`
}

/**
 * Descriptografa uma string no formato "<iv_base64>.<ciphertext_base64>".
 * Suporta também o formato legado com ":" como separador.
 * Retorna null se falhar.
 */
export async function descriptografar(cifrado: string, userId: string): Promise<string | null> {
  if (!cifrado) return ''
  try {
    // Suporte ao separador legado ":" e ao novo "."
    const sepIdx = cifrado.indexOf(SEPARATOR)
    let ivB64: string
    let dadosB64: string

    if (sepIdx !== -1) {
      // Novo formato: tudo antes do primeiro "." é o IV
      ivB64   = cifrado.slice(0, sepIdx)
      dadosB64 = cifrado.slice(sepIdx + 1)
    } else {
      // Formato legado com ":" — pega os primeiros 16 chars como IV
      // IV de 12 bytes = 16 chars base64 exatos
      const partes = cifrado.split(':')
      if (partes.length < 2) return null
      ivB64   = partes[0]
      dadosB64 = partes.slice(1).join(':')
    }

    if (!ivB64 || !dadosB64) return null

    const chave = await derivarChave(userId)
    const iv    = base64ParaBuf(ivB64)
    const dados = base64ParaBuf(dadosB64)

    const dec   = new TextDecoder()
    const texto = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      chave,
      dados
    )
    return dec.decode(texto)
  } catch {
    return null
  }
}

export function estaCifrado(valor: string): boolean {
  if (!valor) return false
  // Aceita tanto "." (novo) quanto ":" (legado)
  return valor.includes(SEPARATOR) || valor.includes(':')
}
