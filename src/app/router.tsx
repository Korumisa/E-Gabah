import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthenticatedProviders } from '@/app/AuthenticatedProviders'
import { RequireAnyRole } from '@/app/RequireAnyRole'
import { RequireAuth } from '@/app/RequireAuth'
import { RequireRole } from '@/app/RequireRole'
import { AppShell } from '@/components/layout/AppShell'
import { ModuleShell } from '@/components/layout/ModuleShell'
import { PortalNavbar } from '@/components/layout/PortalNavbar'
import { LoginPage } from '@/pages/LoginPage'

function lazyPage<T extends ComponentType>(
  loader: () => Promise<{ [K in string]: T }>,
  exportName: keyof Awaited<ReturnType<typeof loader>> & string,
) {
  return lazy(async () => {
    const mod = await loader()
    return { default: mod[exportName] as T }
  })
}

const PortalPage = lazyPage(() => import('@/pages/PortalPage'), 'PortalPage')
const SettingsPage = lazyPage(() => import('@/pages/SettingsPage'), 'SettingsPage')
const DashboardPage = lazyPage(
  () => import('@/pages/modules/DashboardPage'),
  'DashboardPage',
)
const InboxPage = lazyPage(() => import('@/pages/modules/InboxPage'), 'InboxPage')
const AuditPage = lazyPage(() => import('@/pages/modules/AuditPage'), 'AuditPage')
const AccountMapPage = lazyPage(
  () => import('@/pages/modules/keuangan/AccountMapPage'),
  'AccountMapPage',
)
const BiayaPage = lazyPage(
  () => import('@/pages/modules/keuangan/BiayaPage'),
  'BiayaPage',
)
const CoaPage = lazyPage(() => import('@/pages/modules/keuangan/CoaPage'), 'CoaPage')
const EFakturPage = lazyPage(
  () => import('@/pages/modules/keuangan/EFakturPage'),
  'EFakturPage',
)
const PeriodePage = lazyPage(
  () => import('@/pages/modules/keuangan/PeriodePage'),
  'PeriodePage',
)
const RekonBankPage = lazyPage(
  () => import('@/pages/modules/keuangan/RekonBankPage'),
  'RekonBankPage',
)
const JurnalPage = lazyPage(
  () => import('@/pages/modules/keuangan/JurnalPage'),
  'JurnalPage',
)
const KasPage = lazyPage(() => import('@/pages/modules/keuangan/KasPage'), 'KasPage')
const PayrollPage = lazyPage(
  () => import('@/pages/modules/keuangan/PayrollPage'),
  'PayrollPage',
)
const PiutangPage = lazyPage(
  () => import('@/pages/modules/keuangan/PiutangPage'),
  'PiutangPage',
)
const UtangPage = lazyPage(
  () => import('@/pages/modules/keuangan/UtangPage'),
  'UtangPage',
)
const LaporanPage = lazyPage(
  () => import('@/pages/modules/LaporanPage'),
  'LaporanPage',
)
const AbsensiPage = lazyPage(
  () => import('@/pages/modules/sdm/AbsensiPage'),
  'AbsensiPage',
)
const AbsensiCutiPage = lazyPage(
  () => import('@/pages/modules/sdm/AbsensiCutiPage'),
  'AbsensiCutiPage',
)
const AbsensiRekapPage = lazyPage(
  () => import('@/pages/modules/sdm/AbsensiRekapPage'),
  'AbsensiRekapPage',
)
const HrHomePage = lazyPage(
  () => import('@/pages/modules/hr/HrHomePage'),
  'HrHomePage',
)
const HrKaryawanPage = lazyPage(
  () => import('@/pages/modules/hr/HrKaryawanPage'),
  'HrKaryawanPage',
)
const HrPayrollPage = lazyPage(
  () => import('@/pages/modules/hr/HrPayrollPage'),
  'HrPayrollPage',
)
const HrPersetujuanPage = lazyPage(
  () => import('@/pages/modules/hr/HrPersetujuanPage'),
  'HrPersetujuanPage',
)
const KoreksiPage = lazyPage(
  () => import('@/pages/modules/persediaan/KoreksiPage'),
  'KoreksiPage',
)
const MutasiPage = lazyPage(
  () => import('@/pages/modules/persediaan/MutasiPage'),
  'MutasiPage',
)
const SaldoPage = lazyPage(
  () => import('@/pages/modules/persediaan/SaldoPage'),
  'SaldoPage',
)
const MitraPage = lazyPage(
  () => import('@/pages/modules/master/MitraPage'),
  'MitraPage',
)
const PenggunaPage = lazyPage(
  () => import('@/pages/modules/master/PenggunaPage'),
  'PenggunaPage',
)
const OrgStrukturPage = lazyPage(
  () => import('@/pages/modules/master/OrgStrukturPage'),
  'OrgStrukturPage',
)
const ProdukPage = lazyPage(
  () => import('@/pages/modules/master/ProdukPage'),
  'ProdukPage',
)
const PembelianPage = lazyPage(
  () => import('@/pages/modules/PembelianPage'),
  'PembelianPage',
)
const PembayaranPage = lazyPage(
  () => import('@/pages/modules/pembelian/PembayaranPage'),
  'PembayaranPage',
)
const PencatatanPage = lazyPage(
  () => import('@/pages/modules/pembelian/PencatatanPage'),
  'PencatatanPage',
)
const PenerimaanPage = lazyPage(
  () => import('@/pages/modules/pembelian/PenerimaanPage'),
  'PenerimaanPage',
)
const QcPage = lazyPage(() => import('@/pages/modules/pembelian/QcPage'), 'QcPage')
const ReturPage = lazyPage(
  () => import('@/pages/modules/pembelian/ReturPage'),
  'ReturPage',
)
const PenjualanPage = lazyPage(
  () => import('@/pages/modules/PenjualanPage'),
  'PenjualanPage',
)
const OrderPage = lazyPage(
  () => import('@/pages/modules/penjualan/OrderPage'),
  'OrderPage',
)
const PengirimanPage = lazyPage(
  () => import('@/pages/modules/penjualan/PengirimanPage'),
  'PengirimanPage',
)
const TagihanPage = lazyPage(
  () => import('@/pages/modules/penjualan/TagihanPage'),
  'TagihanPage',
)
const PenjualanReturPage = lazyPage(
  () => import('@/pages/modules/penjualan/ReturPage'),
  'ReturPage',
)
const ProduksiPage = lazyPage(
  () => import('@/pages/modules/ProduksiPage'),
  'ProduksiPage',
)
const BatchPage = lazyPage(
  () => import('@/pages/modules/produksi/BatchPage'),
  'BatchPage',
)
const InputOutputPage = lazyPage(
  () => import('@/pages/modules/produksi/InputOutputPage'),
  'InputOutputPage',
)
const PackingPage = lazyPage(
  () => import('@/pages/modules/produksi/PackingPage'),
  'PackingPage',
)
const RendemenPage = lazyPage(
  () => import('@/pages/modules/produksi/RendemenPage'),
  'RendemenPage',
)

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center bg-surface">
      <span
        className="size-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-800"
        role="status"
        aria-label="Memuat halaman"
      />
    </div>
  )
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AuthenticatedProviders />}>
          <Route
            path="/portal"
            element={
              <Lazy>
                <PortalPage />
              </Lazy>
            }
          />
          <Route
            path="/portal/settings"
            element={
              <div className="min-h-screen bg-surface">
                <PortalNavbar />
                <main className="motion-page mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
                  <Lazy>
                    <SettingsPage />
                  </Lazy>
                </main>
              </div>
            }
          />

          <Route
            path="/absensi"
            element={
              <ModuleShell
                appName="E-Absensi"
                appTagline="Kehadiran karyawan"
                title="E-Absensi"
                subtitle="Check-in / check-out dan cuti / izin"
                navItems={[
                  { to: '/absensi', label: 'Absensi hari ini', end: true },
                  { to: '/absensi/cuti', label: 'Cuti & izin' },
                  {
                    to: '/absensi/rekap',
                    label: 'Rekap pegawai',
                    roles: ['admin', 'hr'],
                  },
                ]}
              />
            }
          >
            <Route
              index
              element={
                <Lazy>
                  <AbsensiPage />
                </Lazy>
              }
            />
            <Route
              path="cuti"
              element={
                <Lazy>
                  <AbsensiCutiPage />
                </Lazy>
              }
            />
            <Route path="pengajuan" element={<Navigate to="/absensi/cuti" replace />} />
            <Route path="riwayat" element={<Navigate to="/absensi/cuti" replace />} />
            <Route
              element={
                <RequireAnyRole roles={['admin', 'hr']} fallback="/absensi" />
              }
            >
              <Route
                path="rekap"
                element={
                  <Lazy>
                    <AbsensiRekapPage />
                  </Lazy>
                }
              />
            </Route>
          </Route>

          <Route element={<RequireAnyRole roles={['admin', 'hr']} />}>
            <Route
              path="/hr"
              element={
                <ModuleShell
                  appName="E-HR"
                  appTagline="SDM & payroll"
                  title="E-HR"
                  subtitle="Persetujuan cuti, rekap, roster, dan persiapan gaji"
                  navItems={[
                    { to: '/hr', label: 'Beranda', end: true },
                    { to: '/hr/persetujuan', label: 'Persetujuan cuti' },
                    { to: '/hr/rekap', label: 'Rekap kehadiran' },
                    { to: '/hr/karyawan', label: 'Karyawan' },
                    { to: '/hr/payroll', label: 'Persiapan gaji' },
                  ]}
                />
              }
            >
              <Route
                index
                element={
                  <Lazy>
                    <HrHomePage />
                  </Lazy>
                }
              />
              <Route
                path="persetujuan"
                element={
                  <Lazy>
                    <HrPersetujuanPage />
                  </Lazy>
                }
              />
              <Route
                path="rekap"
                element={
                  <Lazy>
                    <AbsensiRekapPage />
                  </Lazy>
                }
              />
              <Route
                path="karyawan"
                element={
                  <Lazy>
                    <HrKaryawanPage />
                  </Lazy>
                }
              />
              <Route
                path="payroll"
                element={
                  <Lazy>
                    <HrPayrollPage />
                  </Lazy>
                }
              />
              <Route
                path="payroll/persetujuan"
                element={<Navigate to="/hr/payroll" replace />}
              />
            </Route>
          </Route>

          <Route element={<RequireRole />}>
            <Route
              path="/app/dashboard"
              element={
                <AppShell title="Dashboard" subtitle="Ringkasan sesuai peran Anda" />
              }
            >
              <Route
                index
                element={
                  <Lazy>
                    <DashboardPage />
                  </Lazy>
                }
              />
            </Route>

            <Route
              path="/app/inbox"
              element={
                <AppShell
                  title="Kotak masuk"
                  subtitle="Pengajuan menunggu persetujuan, retur, batch, payroll, unlock periode"
                />
              }
            >
              <Route
                index
                element={
                  <Lazy>
                    <InboxPage />
                  </Lazy>
                }
              />
            </Route>

            <Route
              path="/app/settings"
              element={
                <AppShell
                  title="Pengaturan"
                  subtitle="Profil, perusahaan, preferensi, notifikasi, dan keamanan"
                />
              }
            >
              <Route
                index
                element={
                  <Lazy>
                    <SettingsPage />
                  </Lazy>
                }
              />
            </Route>

            <Route
              path="/app/master-data"
              element={
                <AppShell
                  title="Master Data"
                  subtitle="Data acuan pemasok, pelanggan, produk, pengguna, dan organisasi"
                />
              }
            >
              <Route
                index
                element={
                  <Lazy>
                    <MitraPage />
                  </Lazy>
                }
              />
              <Route
                path="produk"
                element={
                  <Lazy>
                    <ProdukPage />
                  </Lazy>
                }
              />
              <Route
                path="pengguna"
                element={
                  <Lazy>
                    <PenggunaPage />
                  </Lazy>
                }
              />
              <Route
                path="organisasi"
                element={
                  <Lazy>
                    <OrgStrukturPage />
                  </Lazy>
                }
              />
            </Route>

            <Route
              path="/app/pembelian"
              element={
                <AppShell
                  title="Pembelian Gabah"
                  subtitle="Pencatatan, penerimaan & timbang, dan pembayaran pemasok"
                />
              }
            >
              <Route
                element={
                  <Lazy>
                    <PembelianPage />
                  </Lazy>
                }
              >
                <Route
                  index
                  element={
                    <Lazy>
                      <PencatatanPage />
                    </Lazy>
                  }
                />
                <Route
                  path="pencatatan"
                  element={<Navigate to="/app/pembelian" replace />}
                />
                <Route
                  path="penerimaan"
                  element={
                    <Lazy>
                      <PenerimaanPage />
                    </Lazy>
                  }
                />
                <Route
                  path="pembayaran"
                  element={
                    <Lazy>
                      <PembayaranPage />
                    </Lazy>
                  }
                />
                <Route
                  path="retur"
                  element={
                    <Lazy>
                      <ReturPage />
                    </Lazy>
                  }
                />
                <Route
                  path="qc"
                  element={
                    <Lazy>
                      <QcPage />
                    </Lazy>
                  }
                />
                <Route
                  path="utang"
                  element={<Navigate to="/app/pembelian/pembayaran" replace />}
                />
              </Route>
            </Route>

            <Route
              path="/app/persediaan"
              element={
                <AppShell
                  title="Persediaan"
                  subtitle="Saldo, mutasi, transfer lokasi, dan koreksi stok"
                />
              }
            >
              <Route
                index
                element={
                  <Lazy>
                    <SaldoPage />
                  </Lazy>
                }
              />
              <Route
                path="mutasi"
                element={
                  <Lazy>
                    <MutasiPage />
                  </Lazy>
                }
              />
              <Route
                path="koreksi"
                element={
                  <Lazy>
                    <KoreksiPage />
                  </Lazy>
                }
              />
            </Route>

            <Route
              path="/app/produksi"
              element={
                <AppShell
                  title="Produksi"
                  subtitle="Batch giling multi-output, approve, dan rendemen"
                />
              }
            >
              <Route
                element={
                  <Lazy>
                    <ProduksiPage />
                  </Lazy>
                }
              >
                <Route
                  index
                  element={
                    <Lazy>
                      <BatchPage />
                    </Lazy>
                  }
                />
                <Route
                  path="input-output"
                  element={
                    <Lazy>
                      <InputOutputPage />
                    </Lazy>
                  }
                />
                <Route
                  path="rendemen"
                  element={
                    <Lazy>
                      <RendemenPage />
                    </Lazy>
                  }
                />
                <Route
                  path="packing"
                  element={
                    <Lazy>
                      <PackingPage />
                    </Lazy>
                  }
                />
              </Route>
            </Route>

            <Route
              path="/app/penjualan"
              element={
                <AppShell
                  title="Penjualan"
                  subtitle="Order, pengiriman, dan tagihan pelanggan"
                />
              }
            >
              <Route
                element={
                  <Lazy>
                    <PenjualanPage />
                  </Lazy>
                }
              >
                <Route
                  index
                  element={
                    <Lazy>
                      <OrderPage />
                    </Lazy>
                  }
                />
                <Route
                  path="pengiriman"
                  element={
                    <Lazy>
                      <PengirimanPage />
                    </Lazy>
                  }
                />
                <Route
                  path="tagihan"
                  element={
                    <Lazy>
                      <TagihanPage />
                    </Lazy>
                  }
                />
                <Route
                  path="retur"
                  element={
                    <Lazy>
                      <PenjualanReturPage />
                    </Lazy>
                  }
                />
              </Route>
            </Route>

            <Route
              path="/app/keuangan"
              element={
                <AppShell
                  title="Keuangan"
                  subtitle="Kas, utang, piutang, dan biaya operasional dasar"
                />
              }
            >
              <Route
                index
                element={
                  <Lazy>
                    <KasPage />
                  </Lazy>
                }
              />
              <Route
                path="kas"
                element={<Navigate to="/app/keuangan" replace />}
              />
              <Route
                path="utang"
                element={
                  <Lazy>
                    <UtangPage />
                  </Lazy>
                }
              />
              <Route
                path="piutang"
                element={
                  <Lazy>
                    <PiutangPage />
                  </Lazy>
                }
              />
              <Route
                path="biaya"
                element={
                  <Lazy>
                    <BiayaPage />
                  </Lazy>
                }
              />
              <Route
                path="payroll"
                element={
                  <Lazy>
                    <PayrollPage />
                  </Lazy>
                }
              />
              <Route
                path="coa"
                element={
                  <Lazy>
                    <CoaPage />
                  </Lazy>
                }
              />
              <Route
                path="akun-map"
                element={
                  <Lazy>
                    <AccountMapPage />
                  </Lazy>
                }
              />
              <Route
                path="jurnal"
                element={
                  <Lazy>
                    <JurnalPage />
                  </Lazy>
                }
              />
              <Route
                path="e-faktur"
                element={
                  <Lazy>
                    <EFakturPage />
                  </Lazy>
                }
              />
              <Route
                path="periode"
                element={
                  <Lazy>
                    <PeriodePage />
                  </Lazy>
                }
              />
              <Route
                path="rekon-bank"
                element={
                  <Lazy>
                    <RekonBankPage />
                  </Lazy>
                }
              />
              <Route
                path="utang-piutang"
                element={<Navigate to="/app/keuangan/utang" replace />}
              />
            </Route>

            <Route
              path="/app/laporan"
              element={
                <AppShell
                  title="Laporan"
                  subtitle="Ringkasan operasional, aging, stok, dan rendemen"
                />
              }
            >
              <Route
                index
                element={
                  <Lazy>
                    <LaporanPage />
                  </Lazy>
                }
              />
            </Route>

            <Route
              path="/app/audit"
              element={
                <AppShell
                  title="Audit Log"
                  subtitle="Jejak perubahan dokumen dan aksi penting"
                />
              }
            >
              <Route
                index
                element={
                  <Lazy>
                    <AuditPage />
                  </Lazy>
                }
              />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/portal" replace />} />
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  )
}
