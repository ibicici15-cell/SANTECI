/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // --- Palette "Santé-CI" ---
        fond: '#FBFAF6',        // blanc sable, très légèrement chaud
        surface: '#FFFFFF',
        surfaceVerte: '#EAF4EE',// vert tinté clair, pour zones "confiance/santé"
        charbon: '#1E2321',     // texte principal, presque noir-vert
        ardoise: '#5B6660',     // texte secondaire
        foret: {
          DEFAULT: '#0B6E4F',  // vert forêt — confiance, santé, validation
          dark: '#08543C',
          light: '#DCEEE4',
        },
        ambre: {
          DEFAULT: '#E8720C',  // orange ivoirien — action, CTA
          dark: '#C25A02',
          light: '#FDE8D4',
        },
        ocre: '#C99A3B',        // or/ocre — accent secondaire, statut essai
        alerte: '#C6412E',
        ligne: '#E7E2D6',
      },
      fontFamily: {
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        corps: ['"Inter"', 'system-ui', 'sans-serif'],
        donnee: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        carte: '0 2px 14px rgba(30, 35, 33, 0.06)',
        carteHover: '0 8px 28px rgba(30, 35, 33, 0.10)',
      },
    },
  },
  plugins: [],
}
