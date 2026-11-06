import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing auth" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user?.email) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const body = (await req.json().catch(() => ({}))) as {
      userAgent?: string
      alertId?: string
    }

    const when = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
    const ua = body.userAgent?.slice(0, 240) || "Tidak diketahui"
    const subject = "Peringatan login E-Gabah"
    const text =
      `Ada login baru ke akun E-Gabah Anda.\n\n` +
      `Waktu: ${when} (WIB)\n` +
      `Email: ${user.email}\n` +
      `Perangkat: ${ua}\n\n` +
      `Jika ini bukan Anda, segera ganti kata sandi dan nonaktifkan sesi lain di Pengaturan → Sesi.`

    const resendKey = Deno.env.get("RESEND_API_KEY")
    const from =
      Deno.env.get("LOGIN_ALERT_FROM") || "E-Gabah <onboarding@resend.dev>"

    if (!resendKey) {
      return new Response(
        JSON.stringify({
          ok: true,
          emailed: false,
          reason: "RESEND_API_KEY not set — alert logged only",
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      )
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject,
        text,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      return new Response(
        JSON.stringify({ ok: false, emailed: false, detail }),
        {
          status: 502,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      )
    }

    return new Response(JSON.stringify({ ok: true, emailed: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "failed",
      }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    )
  }
})
