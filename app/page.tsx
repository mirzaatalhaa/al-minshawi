import { RecitationStation } from "./recitation-station";

export default function Page() {
  return (
    <main className="relative isolate flex min-h-dvh flex-1 flex-col items-center justify-between overflow-hidden">
      <div className="hero-bg fixed inset-0 -z-20 bg-cover bg-center" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/80" />
      </div>
      <div className="grain fixed inset-0 -z-10" aria-hidden="true" />
      <img
        src="/logo.png"
        alt="Sheikh Muhammad Siddiq Al-Minshawi"
        className="pointer-events-none fixed left-1/2 top-1/2 z-0 w-[min(82vw,620px)] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_18px_42px_rgba(0,0,0,0.5)]"
      />
      <RecitationStation />
    </main>
  );
}
