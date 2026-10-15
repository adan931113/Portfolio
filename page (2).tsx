"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function RegistroPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [aceptaRgpd, setAceptaRgpd] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revisaCorreo, setRevisaCorreo] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!aceptaRgpd) {
      setError("Debes aceptar la política de privacidad para poder crear la cuenta.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setEnviando(true);
    const supabase = createBrowserSupabaseClient();

    // El consentimiento RGPD y el nombre viajan como metadatos del propio
    // signUp; el trigger `handle_new_user` (ver 0002_profile_metadata.sql)
    // los copia a la tabla `profiles` en el mismo momento en que se crea
    // la fila, para no depender de un segundo paso de escritura.
    const { data, error: errorSignUp } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre_completo: nombre,
          rgpd_consentimiento_aceptado: true,
          rgpd_fecha_consentimiento: new Date().toISOString(),
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (errorSignUp) {
      setError(
        errorSignUp.message === "User already registered"
          ? "Ya existe una cuenta con este correo electrónico."
          : errorSignUp.message,
      );
      setEnviando(false);
      return;
    }

    // Si el proyecto de Supabase tiene desactivada la confirmación de email,
    // `data.session` viene ya relleno y podemos entrar directamente.
    if (data.session) {
      router.refresh();
      router.push("/");
      return;
    }

    // Caso habitual: Supabase exige confirmar el correo antes de dar sesión.
    setRevisaCorreo(true);
    setEnviando(false);
  }

  if (revisaCorreo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Revisa tu correo</h1>
          <p className="mt-2 text-sm text-gray-600">
            Te hemos enviado un enlace de confirmación a <strong>{email}</strong>. Confírmalo para poder
            iniciar sesión.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-medium text-emerald-600 hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Crear cuenta</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona tu nómina, tus contratos y tus finanzas en un solo sitio.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
              Nombre completo
            </label>
            <input
              id="nombre"
              type="text"
              required
              autoComplete="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-gray-400">Mínimo 8 caracteres.</p>
          </div>

          {/* Consentimiento RGPD explícito — obligatorio, no premarcado. */}
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              required
              checked={aceptaRgpd}
              onChange={(e) => setAceptaRgpd(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span>
              He leído y acepto la{" "}
              <Link href="/privacidad" target="_blank" className="font-medium text-emerald-600 hover:underline">
                Política de Privacidad
              </Link>{" "}
              y autorizo el tratamiento de mis datos laborales y financieros conforme al RGPD para
              prestar este servicio.
            </span>
          </label>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {enviando ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-emerald-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
