// Lance Gradle pour construire l'APK, en choisissant automatiquement le
// bon exécutable selon le système : gradlew.bat sous Windows, ./gradlew
// sous Mac/Linux. Évite l'erreur Windows "'.' n'est pas reconnu..." que
// provoque "./gradlew" dans l'invite de commandes (cmd.exe).
//
// Usage : node scripts/build-apk.cjs assembleDebug
//         node scripts/build-apk.cjs assembleRelease

const { spawnSync } = require('child_process')
const path = require('path')

const tache = process.argv[2] || 'assembleDebug'
const dossierAndroid = path.join(__dirname, '..', 'android')
const estWindows = process.platform === 'win32'
const executable = estWindows ? 'gradlew.bat' : './gradlew'

console.log(`→ ${executable} ${tache} (dans android/)`)

const resultat = spawnSync(executable, [tache], {
  cwd: dossierAndroid,
  stdio: 'inherit',
  shell: true,
})

if (resultat.status !== 0) {
  console.error('\n❌ La construction Gradle a échoué (voir le détail ci-dessus).')
  process.exit(resultat.status || 1)
}

const sousDossier = tache === 'assembleRelease' ? 'release' : 'debug'
console.log(`\n✅ APK généré : android/app/build/outputs/apk/${sousDossier}/`)
