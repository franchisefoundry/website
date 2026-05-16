import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <Image
          src="/logo-full.png"
          alt="Franchise Foundry"
          width={200}
          height={52}
          className="object-contain"
          priority
        />
      </div>
      {children}
    </div>
  )
}
