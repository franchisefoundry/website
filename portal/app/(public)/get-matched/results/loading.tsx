import Image from 'next/image'

export default function ResultsLoading() {
  return (
    <div style={{ minHeight: '100vh', background: '#2a352a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @keyframes ffBreath { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:0.85} }
        @keyframes ffFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <Image src="/favicon-icon.png" alt="Franchise Foundry" width={80} height={80}
        style={{ animation: 'ffBreath 1.8s ease-in-out infinite', marginBottom: 24 }} />
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', fontWeight: 300, animation: 'ffFade 0.6s ease forwards', animationDelay: '0.2s', opacity: 0 }}>
        Scoring your matches…
      </p>
    </div>
  )
}
