export function LoginPreview() {
  return (
    <div className="relative h-full min-h-[560px] overflow-hidden lg:rounded-r-2xl">
      <img
        src="/login-sawah.jpg"
        alt="Sawah terasering di Tegallalang, Bali"
        width={1200}
        height={1600}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      <div className="motion-rise relative flex h-full min-h-[560px] flex-col justify-end px-8 py-8 xl:px-10 xl:py-10">
        <p className="font-display text-[2rem] leading-none font-semibold tracking-tight text-white xl:text-[2.35rem]">
          E-Gabah
        </p>
        <p className="mt-3 max-w-[18rem] text-[15px] leading-relaxed text-white/85">
          Operasi mill: beli gabah, giling, stok, jual, dan kas.
        </p>
        <p className="mt-6 text-[11px] text-white/55">
          Sawah Tegallalang · Christophe95 · CC BY-SA 4.0
        </p>
      </div>
    </div>
  )
}
