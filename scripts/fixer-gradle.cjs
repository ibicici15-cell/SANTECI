// Corrige les soucis de version Gradle/Java qui se chevauchent sur ce
// genre de projet Capacitor :
//  1. Gradle lui-même : passe à une version qui gère Java 21
//     (android/gradle/wrapper/gradle-wrapper.properties).
//  2. Le JDK réellement utilisé pour COMPILER, forcé sur le JDK 21
//     embarqué dans Android Studio (celui qu'Android Studio utilise par
//     défaut) même quand le build est lancé depuis un simple terminal —
//     sinon Gradle retombe sur un JDK plus ancien du système et plante
//     avec "error: invalid source release: 21" (la librairie
//     @capacitor/android, dans node_modules, exige Java 21 pour
//     compiler — on ne doit pas et ne peut pas modifier ce fichier-là).
//
// À lancer une fois après "npx cap add android" (et à relancer si vous
// supprimez puis régénérez le dossier android/) :
//   npm run fix-gradle

const fs = require('fs')
const path = require('path')

const NOUVELLE_VERSION = '8.13'
const cheminProps = path.join(__dirname, '..', 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties')

if (!fs.existsSync(cheminProps)) {
  console.error(
    '\n❌ Fichier introuvable : ' + cheminProps +
    '\n   Lance d\'abord "npx cap add android", puis relance "npm run fix-gradle".\n'
  )
  process.exit(1)
}

let contenu = fs.readFileSync(cheminProps, 'utf8')
const nouvelleLigne = `distributionUrl=https\\://services.gradle.org/distributions/gradle-${NOUVELLE_VERSION}-bin.zip`

if (/^distributionUrl=/m.test(contenu)) {
  contenu = contenu.replace(/^distributionUrl=.*$/m, nouvelleLigne)
} else {
  contenu += `\n${nouvelleLigne}\n`
}

fs.writeFileSync(cheminProps, contenu, 'utf8')
console.log(`✅ Gradle mis à jour vers ${NOUVELLE_VERSION} dans ${cheminProps}`)

// ---------------------------------------------------------------------
// Force Gradle à utiliser le JDK 21 d'Android Studio, même en ligne de
// commande (sinon il peut retomber sur un JDK système plus ancien).
// ---------------------------------------------------------------------
const CANDIDATS_JDK21 = process.platform === 'win32' ? [
  'C:\\Program Files\\Android\\Android Studio\\jbr',
] : process.platform === 'darwin' ? [
  '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
] : [
  `${process.env.HOME}/android-studio/jbr`,
  '/opt/android-studio/jbr',
  '/usr/local/android-studio/jbr',
]

const jdkTrouve = CANDIDATS_JDK21.find(p => fs.existsSync(p))
const cheminGradleProps = path.join(__dirname, '..', 'android', 'gradle.properties')

if (jdkTrouve) {
  let gp = fs.existsSync(cheminGradleProps) ? fs.readFileSync(cheminGradleProps, 'utf8') : ''
  const ligneJavaHome = `org.gradle.java.home=${jdkTrouve.replace(/\\/g, '\\\\')}`
  if (/^org\.gradle\.java\.home=/m.test(gp)) {
    gp = gp.replace(/^org\.gradle\.java\.home=.*$/m, ligneJavaHome)
  } else {
    gp += (gp === '' || gp.endsWith('\n') ? '' : '\n') + ligneJavaHome + '\n'
  }
  fs.writeFileSync(cheminGradleProps, gp, 'utf8')
  console.log(`✅ Gradle forcé à utiliser le JDK 21 d'Android Studio : ${jdkTrouve}`)
} else {
  console.log(
    '⚠️  JDK 21 d\'Android Studio introuvable au chemin habituel.\n' +
    '   Ouvre Android Studio → Settings → Build Tools → Gradle → note le\n' +
    '   chemin affiché dans "Gradle JDK", puis ajoute toi-même cette ligne\n' +
    '   dans android/gradle.properties (antislashs doublés sous Windows) :\n' +
    '     org.gradle.java.home=C:\\\\chemin\\\\vers\\\\jbr'
  )
}

console.log('   Prochaine étape : npx cap sync android')
