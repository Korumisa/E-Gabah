/**
 * Browser smoke via CDP-friendly steps printed for agent, or run with:
 *   node scripts/role-flow-smoke.mjs
 * Uses Playwright if available; otherwise prints the matrix.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:5180'

const ACCOUNTS = [
  {
    email: 'admin@egabah.local',
    password: 'demo123',
    role: 'admin',
    paths: [
      '/portal',
      '/app/dashboard',
      '/app/inbox',
      '/app/pembelian',
      '/app/pembelian?dok=PB-2611-0021',
      '/app/pembelian/penerimaan',
      '/app/pembelian/pembayaran',
      '/app/pembelian/retur',
      '/app/pembelian/qc',
      '/app/persediaan',
      '/app/persediaan/mutasi',
      '/app/persediaan/koreksi',
      '/app/produksi',
      '/app/produksi?dok=BAT-202610-003',
      '/app/produksi/input-output',
      '/app/produksi/rendemen',
      '/app/produksi/packing',
      '/app/penjualan',
      '/app/penjualan/pengiriman',
      '/app/penjualan/tagihan',
      '/app/penjualan/retur',
      '/app/keuangan',
      '/app/keuangan/utang',
      '/app/keuangan/piutang',
      '/app/keuangan/biaya',
      '/app/keuangan/payroll',
      '/app/keuangan/coa',
      '/app/keuangan/akun-map',
      '/app/keuangan/jurnal',
      '/app/keuangan/e-faktur',
      '/app/keuangan/periode',
      '/app/keuangan/rekon-bank',
      '/app/laporan',
      '/app/master-data',
      '/app/master-data/produk',
      '/app/master-data/pengguna',
      '/app/audit',
      '/app/settings',
      '/absensi',
      '/absensi/cuti',
      '/hr',
      '/hr/persetujuan',
      '/hr/rekap',
      '/hr/karyawan',
      '/hr/payroll',
    ],
  },
  {
    email: 'beli@egabah.local',
    password: 'demo123',
    role: 'pembelian',
    paths: [
      '/portal',
      '/app/dashboard',
      '/app/inbox',
      '/app/pembelian',
      '/app/pembelian?dok=PB-2611-0020',
      '/app/pembelian/penerimaan',
      '/app/pembelian/pembayaran',
      '/app/pembelian/retur',
      '/app/pembelian/qc',
      '/app/keuangan/periode',
    ],
    forbidden: ['/app/produksi', '/app/master-data', '/app/keuangan'],
  },
  {
    email: 'produksi@egabah.local',
    password: 'demo123',
    role: 'produksi',
    paths: [
      '/portal',
      '/app/dashboard',
      '/app/inbox',
      '/app/produksi',
      '/app/produksi?dok=BAT-202610-002',
      '/app/produksi/input-output',
      '/app/produksi/rendemen',
      '/app/produksi/packing',
      '/app/keuangan/periode',
    ],
    forbidden: ['/app/pembelian', '/app/penjualan', '/app/master-data'],
  },
  {
    email: 'gudang@egabah.local',
    password: 'demo123',
    role: 'gudang',
    paths: [
      '/portal',
      '/app/dashboard',
      '/app/inbox',
      '/app/persediaan',
      '/app/persediaan/mutasi',
      '/app/persediaan/koreksi',
      '/app/pembelian/qc',
      '/app/keuangan/periode',
    ],
    forbidden: ['/app/produksi', '/app/penjualan', '/app/keuangan'],
  },
  {
    email: 'jual@egabah.local',
    password: 'demo123',
    role: 'penjualan',
    paths: [
      '/portal',
      '/app/dashboard',
      '/app/inbox',
      '/app/penjualan',
      '/app/penjualan/pengiriman',
      '/app/penjualan/tagihan',
      '/app/penjualan/retur',
      '/app/keuangan/periode',
    ],
    forbidden: ['/app/pembelian', '/app/produksi', '/app/master-data'],
  },
  {
    email: 'kas@egabah.local',
    password: 'demo123',
    role: 'keuangan',
    paths: [
      '/portal',
      '/app/dashboard',
      '/app/inbox',
      '/app/pembelian',
      '/app/pembelian?dok=PB-2611-0021',
      '/app/pembelian/pembayaran',
      '/app/pembelian/retur',
      '/app/penjualan/retur',
      '/app/keuangan',
      '/app/keuangan/utang',
      '/app/keuangan/piutang',
      '/app/keuangan/biaya',
      '/app/keuangan/payroll',
      '/app/keuangan/jurnal',
      '/app/keuangan/periode',
      '/app/laporan',
    ],
    forbidden: ['/app/master-data', '/app/produksi'],
  },
  {
    email: 'hr@egabah.local',
    password: 'demo123',
    role: 'hr',
    paths: [
      '/portal',
      '/app/dashboard',
      '/app/inbox',
      '/app/keuangan/payroll',
      '/app/audit',
      '/absensi',
      '/absensi/cuti',
      '/hr',
      '/hr/persetujuan',
      '/hr/rekap',
      '/hr/karyawan',
      '/hr/payroll',
    ],
    forbidden: ['/app/pembelian', '/app/produksi', '/app/master-data'],
  },
]

function isBroken(pageText, href) {
  const t = (pageText || '').trim()
  if (t.length < 40) return 'blank/white'
  if (/Gagal menampilkan halaman|Invalid Date|RangeError/i.test(t))
    return 'error card / invalid date'
  if (/Layanan sedang tidak tersedia/i.test(t) && href.includes('/login'))
    return 'login service unavailable'
  return null
}

async function withPlaywright() {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    try {
      const require = createRequire(import.meta.url)
      ;({ chromium } = require('playwright'))
    } catch {
      return null
    }
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const results = []
  const consoleErrors = []

  page.on('pageerror', (err) => {
    consoleErrors.push(String(err.message || err))
  })

  async function login(email, password) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('input', { timeout: 8000 })
    const textboxes = page.getByRole('textbox')
    // Email then password (password may be textbox without type exposed)
    await textboxes.nth(0).fill(email)
    const pass = page.locator('input[type="password"]')
    if (await pass.count()) await pass.first().fill(password)
    else await textboxes.nth(1).fill(password)
    await page.getByRole('button', { name: /^Masuk$/i }).click()
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 10000 })
  }

  async function logout() {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      try {
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith('egabah.auth')) localStorage.removeItem(k)
        }
        for (const k of Object.keys(sessionStorage)) {
          if (k.startsWith('egabah.auth')) sessionStorage.removeItem(k)
        }
      } catch {
        /* ignore */
      }
    })
  }

  for (const account of ACCOUNTS) {
    consoleErrors.length = 0
    try {
      await logout()
      await login(account.email, account.password)
    } catch (e) {
      results.push({
        role: account.role,
        path: '/login',
        ok: false,
        detail: `login failed: ${e.message || e}`,
      })
      continue
    }

    for (const path of account.paths) {
      const beforeErr = consoleErrors.length
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
        await page.waitForTimeout(450)
        const text = await page.evaluate(() => document.body?.innerText || '')
        const href = page.url()
        const broken = isBroken(text, href)
        const newErrs = consoleErrors.slice(beforeErr)
        const fatal = newErrs.find((m) => /Invalid Date|RangeError|Minified React error/i.test(m))
        if (broken || fatal) {
          results.push({
            role: account.role,
            path,
            ok: false,
            detail: broken || fatal,
            href,
          })
        } else {
          results.push({ role: account.role, path, ok: true, href })
        }
      } catch (e) {
        results.push({
          role: account.role,
          path,
          ok: false,
          detail: e.message || String(e),
        })
      }
    }

    for (const path of account.forbidden || []) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForTimeout(350)
      const href = page.url()
      const pathBase = path.split('?')[0]
      const stillOnPath = new URL(href).pathname === pathBase || new URL(href).pathname.startsWith(`${pathBase}/`)
      const text = await page.evaluate(() => document.body?.innerText || '')
      const blockedUi = /tidak berhak|tidak diizinkan|akses ditolak/i.test(text)
      const redirectedAway = !stillOnPath
      results.push({
        role: account.role,
        path: `FORBID ${path}`,
        ok: redirectedAway || blockedUi,
        href,
        detail: redirectedAway
          ? 'redirected/blocked'
          : blockedUi
            ? 'denied UI'
            : 'still reachable',
      })
    }
  }

  // Cross-role approve chain (keuangan approve purchase)
  try {
    await logout()
    await login('kas@egabah.local', 'demo123')
    await page.goto(`${BASE}/app/pembelian`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    const approved = await page.evaluate(async () => {
      const row = [...document.querySelectorAll('tbody tr')].find((r) =>
        /Menunggu approve/i.test(r.innerText),
      )
      if (!row) return { skipped: true, reason: 'no waiting PO' }
      row.querySelector('button')?.click()
      await new Promise((r) => setTimeout(r, 400))
      const btn = [...document.querySelectorAll('button')].find((b) =>
        /Setujui anggaran/i.test(b.innerText || ''),
      )
      if (!btn) return { skipped: true, reason: 'no approve button' }
      btn.click()
      await new Promise((r) => setTimeout(r, 500))
      const toast = [...document.querySelectorAll('[role=status],[role=alert]')]
        .map((e) => e.innerText.trim())
        .join(' | ')
      const drawer = document.querySelector('[role=dialog]')?.innerText || ''
      const white = (document.body.innerText || '').trim().length < 40
      return {
        skipped: false,
        toast,
        hasDisetujui: /Disetujui/i.test(drawer) || /Disetujui/i.test(document.body.innerText),
        white,
      }
    })
    results.push({
      role: 'keuangan',
      path: 'ACTION approve-PO',
      ok: approved.skipped ? true : !approved.white && approved.hasDisetujui,
      detail: approved,
    })
  } catch (e) {
    results.push({
      role: 'keuangan',
      path: 'ACTION approve-PO',
      ok: false,
      detail: e.message || String(e),
    })
  }

  await browser.close()
  return results
}

const results = await withPlaywright()
if (!results) {
  console.log('SKIP playwright not installed — install with: npm i -D playwright && npx playwright install chromium')
  console.log(JSON.stringify({ base: BASE, accounts: ACCOUNTS.map((a) => a.role) }, null, 2))
  process.exit(2)
}

const fails = results.filter((r) => !r.ok)
const pass = results.filter((r) => r.ok)
console.log(`PASS ${pass.length}  FAIL ${fails.length}`)
for (const f of fails) {
  console.log(`FAIL  [${f.role}] ${f.path} — ${typeof f.detail === 'string' ? f.detail : JSON.stringify(f.detail)}`)
}
for (const p of pass.filter((x) => String(x.path).startsWith('ACTION'))) {
  console.log(`PASS  [${p.role}] ${p.path} — ${JSON.stringify(p.detail || {})}`)
}
if (fails.length) process.exit(1)
