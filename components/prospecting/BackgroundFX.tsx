export function BackgroundFX() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-dots" />
      <div className="bg-orb bg-orb-blue h-[420px] w-[420px] -left-32 -top-24" />
      <div className="bg-orb bg-orb-cyan h-[360px] w-[360px] right-[-120px] top-[12%]" />
      <div className="bg-orb bg-orb-grey h-[440px] w-[440px] left-[20%] bottom-[-180px]" />
      <div className="bg-orb bg-orb-blue h-[300px] w-[300px] right-[8%] bottom-[-120px] opacity-40" />
    </div>
  )
}
