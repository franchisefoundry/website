export default function ResultsLoading() {
  return (
    <>
      <style>{`
        @keyframes ffLogoPulse {
          0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          50%      { transform: translate(-50%,-50%) scale(1.10); opacity: 0.88; }
        }
        @keyframes ffRingSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ffDotFade {
          0%,80%,100% { opacity: 0; }
          40%          { opacity: 1; }
        }
        @keyframes ffProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        .rl-dot { display: inline-block; opacity: 0; animation: ffDotFade 1.5s infinite both; }
        .rl-dot:nth-child(2) { animation-delay: 0.2s; }
        .rl-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Sora', system-ui, sans-serif",
        zIndex: 9999,
      }}>
        {/* Logo + spinning ring */}
        <div style={{ position: 'relative', width: 220, height: 220, margin: '0 auto 36px' }}>
          <img
            src="/logo-full.png"
            alt="Franchise Foundry"
            width={148}
            height={148}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              objectFit: 'contain',
              animation: 'ffLogoPulse 2.2s ease-in-out infinite',
            }}
          />
          <svg
            viewBox="0 0 140 140"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              animation: 'ffRingSpin 1.9s linear infinite',
              transformOrigin: 'center',
            }}
          >
            <circle cx="70" cy="70" r="62"
              fill="none" stroke="#c8924a" strokeWidth="5"
              strokeDasharray="95 294" strokeLinecap="round" />
            <circle cx="70" cy="70" r="62"
              fill="none" stroke="#c8924a" strokeWidth="5"
              strokeDasharray="20 369" strokeDashoffset="-130"
              strokeLinecap="round" />
          </svg>
        </div>

        {/* Text */}
        <p style={{ margin: '0 0 10px', fontSize: '1.45rem', fontWeight: 600, color: '#5f725f', letterSpacing: '-0.01em', textAlign: 'center' }}>
          Getting your matches<span className="rl-dot">.</span><span className="rl-dot">.</span><span className="rl-dot">.</span>
        </p>
        <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 400, color: '#aaa', textAlign: 'center' }}>
          Finding the best franchise opportunities for you
        </p>

        {/* Progress bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          height: 4,
          background: 'linear-gradient(90deg, #5f725f, #c8924a)',
          borderRadius: '0 2px 2px 0',
          animation: 'ffProgress 5s ease-out forwards',
        }} />
      </div>
    </>
  )
}
