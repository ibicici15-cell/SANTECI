import { Component } from 'react'

// Évite l'écran blanc : si une page plante, on affiche le message d'erreur
// (utile pour comprendre le problème sur le téléphone) et un bouton pour repartir.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Erreur affichage :', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', background: '#201D19', color: '#FAFAF7', padding: '2rem 1.25rem', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Oups, un problème est survenu</h1>
        <p style={{ opacity: 0.75, marginTop: '0.5rem', fontSize: '0.95rem' }}>
          L'application a rencontré une erreur. Tu peux réessayer ; si cela se reproduit, envoie-nous le message ci-dessous.
        </p>
        <pre style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.08)', borderRadius: 8, fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {String(this.state.error?.message || this.state.error)}
        </pre>
        <button
          onClick={() => { window.location.href = '/' }}
          style={{ marginTop: '1.25rem', background: '#F77F00', color: '#201D19', fontWeight: 700, border: 0, borderRadius: 12, padding: '0.75rem 1.25rem' }}
        >
          Revenir à l'accueil
        </button>
      </div>
    )
  }
}
