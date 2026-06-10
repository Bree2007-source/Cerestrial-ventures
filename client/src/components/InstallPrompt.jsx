import { useState, useEffect } from 'react'

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(iOS)

    if (iOS) {
      setTimeout(() => setShowPrompt(true), 3000)
      return
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShowPrompt(true), 3000)
    })

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
    })
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
        setDeferredPrompt(null)
      }
    }
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div style={{
      position: 'fixed', bottom: '20px', left: '50%',
      transform: 'translateX(-50%)', zIndex: 9999,
      backgroundColor: '#166534', color: 'white',
      padding: '16px 20px', borderRadius: '16px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', gap: '14px',
      maxWidth: '380px', width: 'calc(100% - 40px)',
      animation: 'slideUp 0.4s ease-out'
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>

      <div style={{ fontSize: '36px', flexShrink: 0 }}>🌾</div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '3px' }}>
          Install Cerestrial Ventures
        </div>
        {isIOS ? (
          <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: 1.4 }}>
            Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong>
          </div>
        ) : (
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            Shop faster — install our app!
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        {!isIOS && (
          <button onClick={handleInstall}
            style={{ padding: '7px 14px', backgroundColor: '#22c55e',
              color: 'white', border: 'none', borderRadius: '8px',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
            Install
          </button>
        )}
        <button onClick={() => setShowPrompt(false)}
          style={{ padding: '5px 10px', backgroundColor: 'transparent',
            color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
          Not now
        </button>
      </div>
    </div>
  )
}

export default InstallPrompt