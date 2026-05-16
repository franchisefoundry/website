export default function ResultsLoading() {
  return (
    <>
      <style>{`
        @keyframes ffBreath {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes ffDots {
          0%, 20% { opacity: 0.2; }
          40% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: '#2a352a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        fontFamily: "'Sora', system-ui, sans-serif",
      }}>
        <img
          src="/favicon-icon.png"
          alt="Franchise Foundry"
          width={72}
          height={72}
          style={{ animation: 'ffBreath 1.8s ease-in-out infinite' }}
        />
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>
            Scoring your matches
          </p>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 8 }}>
            {[0, 0.3, 0.6].map((delay, i) => (
              <span key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'rgba(200,146,74,0.8)',
                display: 'inline-block',
                animation: `ffDots 1.4s ease-in-out ${delay}s infinite`,
              }} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
