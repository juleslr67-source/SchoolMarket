# 🏫 SchoolMarket — Guide d'installation

## En 10 minutes, ton appli est en ligne pour toute ta classe !

---

## ÉTAPE 1 — Firebase (base de données gratuite)

1. Va sur **https://console.firebase.google.com**
2. Clique **"Créer un projet"** → donne un nom (ex: `schoolmarket-2025`)
3. Désactive Google Analytics → **Créer le projet**
4. Dans le menu à gauche : **"Realtime Database"** → **"Créer une base de données"**
5. Choisis la région Europe → **"Démarrer en mode test"** → Activer
6. Clique sur l'icône ⚙️ (Paramètres du projet) → **"Vos applications"** → icône `</>`
7. Donne un nom → **Enregistrer**
8. Copie le bloc `firebaseConfig` qui apparaît

---

## ÉTAPE 2 — Colle ta config Firebase

Ouvre le fichier `src/App.js` et remplace la section `FIREBASE_CONFIG` :

```js
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",          // ← ton vrai apiKey
  authDomain:        "ton-projet.firebaseapp.com",
  databaseURL:       "https://ton-projet-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "ton-projet",
  storageBucket:     "ton-projet.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc..."
};
```

---

## ÉTAPE 3 — Déployer sur Vercel (gratuit, 2 minutes)

1. Va sur **https://vercel.com** → crée un compte gratuit (avec GitHub)
2. Clique **"Add New Project"** → **"Import Git Repository"**
3. Si tu n'as pas GitHub : clique **"Deploy"** puis **"Upload"** et glisse-dépose ce dossier
4. Vercel détecte automatiquement React → clique **"Deploy"**
5. Ton appli est en ligne sur une URL du style `schoolmarket-xxx.vercel.app` 🎉

---

## ÉTAPE 4 — Partager avec ta classe

Envoie l'URL Vercel à tes camarades.
Chacun crée son compte avec un pseudo et un avatar.
Tout est synchronisé en temps réel grâce à Firebase !

---

## Alternative encore plus simple : Netlify Drop

1. Va sur **https://app.netlify.com/drop**
2. Glisse-dépose le dossier `build/` (après `npm run build`)
3. C'est en ligne immédiatement, sans compte requis

---

## Lancer en local (pour tester)

```bash
npm install
npm start
```

Ouvre http://localhost:3000
