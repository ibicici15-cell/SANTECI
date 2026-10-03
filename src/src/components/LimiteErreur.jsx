import { Component } from 'react'

/**
 * Filet de sécurité : si un composant plante pendant le rendu, React
 * démonte normalement TOUTE l'application sans rien afficher (page figée,
 * plus aucun clic ne fonctionne). Ce composant intercepte l'erreur et
 * affiche un message avec un bouton pour recharger, au lieu de laisser
 * l'utilisateur bloqué sans explication.
 */
export default class LimiteErreur extends Component {
  constructor(props) {
    super(props)
    this.state = { aPlante: false }
  }

  static getDerivedStateFromError() {
    return { aPlante: true }
  }

  componentDidCatch(erreur, info) {
    // Toujours visible dans la console du navigateur (F12) pour diagnostiquer
    console.error('[Santé-CI] Erreur applicative interceptée :', erreur, info)
  }

  render() {
    if (this.state.aPlante) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-sm text-center">
            <p className="font-display text-2xl font-bold text-charbon">Un problème est survenu</p>
            <p className="text-ardoise text-sm mt-2">
              La page a rencontré une erreur inattendue. Rechargez pour continuer — si le
              problème persiste, ouvrez la console du navigateur (F12) et signalez le message
              d'erreur affiché.
            </p>
            <button onClick={() => window.location.reload()} className="btn-primaire mt-6">
              Recharger la page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
