import api from './api';

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatMode = "public" | "consultation";

/**
 * Deteksi apakah user sudah login
 */
function isLoggedIn(): boolean {
  try {
    return !!localStorage.getItem("user");
  } catch {
    return false;
  }
}

/**
 * Ambil email user yang sedang login
 */
function getLoggedInEmail(): string | undefined {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const user = JSON.parse(raw);
      return user.email || undefined;
    }
  } catch {
    // ignore
  }
  return undefined;
}

/**
 * Kirim percakapan ke backend API dan dapatkan respons dari Gemini AI
 */
export async function getGeminiResponse(
  messages: ChatMessage[],
  mode?: ChatMode
): Promise<string> {
  const chatMode = mode || (isLoggedIn() ? "consultation" : "public");
  const email = getLoggedInEmail();
  try {
    const data = await api.chat(
      messages.map(m => ({ role: m.role, content: m.content })),
      chatMode,
      email
    );
    return data.response || "Maaf, tidak ada respons dari AI.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return "Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi nanti.";
  }
}

/**
 * Cek apakah Gemini API sudah dikonfigurasi (sync, untuk backward compat)
 */
export function isGeminiConfigured(): boolean {
  return true;
}

/**
 * Cek konfigurasi Gemini API secara async via backend
 */
export async function isGeminiConfiguredAsync(): Promise<boolean> {
  try {
    const data = await api.chatStatus();
    return data.configured === true;
  } catch {
    return false;
  }
}

/**
 * Quick response helper
 */
export async function getQuickResponse(prompt: string): Promise<string> {
  return getGeminiResponse([{ role: "user", content: prompt }], "public");
}
