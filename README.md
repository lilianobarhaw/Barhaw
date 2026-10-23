# Site Barhaw (Vercel)

Le site de la commu de LilianoBarhaw, sur une seule page qui se dévoile au défilement, aux couleurs prune, rose et violet, en style manga (lignes de vitesse, onomatopées, bulles, autocollants de mèmes) : les événements à venir (Osiris, le TOURNOI BARHAW, le live de 12 h…), ta chaîne Twitch (le live, ou la rediff quand tu n'es pas en live), les chaînes des potes, tes vidéos YouTube, le Discord, et Chopper, jouable en se connectant avec Discord.

Le site ne stocke rien lui-même : tout vient du **bot Barhaw** sur le VPS (son « API du site », `lib/site.js` du bot). Les événements se gèrent depuis Discord avec `/evenement`, les potes avec `/reseaux`, comme d'habitude.

## Les fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html`, `site.css`, `site.js` | La page (parties Accueil, Events, Tournoi, Ma chaîne, Potes, YouTube, Chopper avec son mini-jeu, Discord) |
| `mentions.html` | Mentions, données personnelles, cookies, crédits (adresse `/mentions`) |
| `api/public.js` | Ce que la page affiche, demandé au bot (gardé 20 s par Vercel) |
| `api/chopper.js` | La carte et les animations de Chopper ; nourrir, jouer et parler au nom du membre connecté |
| `api/moi.js` | Qui est connecté |
| `api/auth/login.js`, `api/auth/callback.js` | La connexion avec Discord (seulement le pseudo et l'image de profil) ; `/api/auth/logout` pour sortir |
| `lib/session.js` | Session signée (cookie HttpOnly, 30 jours), cookies |
| `lib/bot.js` | Les demandes au bot, signées avec `BOT_CLE` |
| `img/` | Chopper (ta photo), les icônes, l'aperçu des liens (`og-barhaw.png`, ta pp dans une case de manga : c'est l'image qui s'affiche quand on colle le lien du site sur Discord ou ailleurs) |
| `vercel.json` | Adresses propres, en-têtes de sécurité, accès bloqué à `/lib`, `/README.md`, `/package.json` |

## Mise en ligne

1. **Le bot d'abord** : mettre à jour le bot (zip `barhaw-bot-maj-site.zip`), ajouter `SITE_CLE` dans `reglages.env` et ouvrir le port 8788 (voir le LISEZMOI du bot, partie « Le site Barhaw »).
2. **GitHub** : créer un dépôt **privé** `barhaw-site`, puis « Add file → Upload files » et glisser tout le contenu du dossier (pas le dossier lui-même).
3. **Vercel** : Add New → Project → importer `barhaw-site` → Deploy. Le nom du projet donne l'adresse (`https://barhaw.vercel.app` si le nom est libre).
4. **Vercel → Settings → Environment Variables** (puis Deployments → … → Redeploy) :

| Variable | Valeur |
| --- | --- |
| `DISCORD_CLIENT_ID` | L'identifiant de l'application du bot BarhawBot (portail développeur Discord → General Information → Application ID) |
| `DISCORD_CLIENT_SECRET` | Portail développeur → OAuth2 → Client Secret (Reset Secret s'il n'est plus affiché : ça ne change pas le jeton du bot) |
| `SESSION_SECRET` | Une longue phrase au hasard (32 caractères ou plus), à ne donner à personne |
| `SITE_URL` | L'adresse du site, sans `/` à la fin, ex. `https://barhaw.vercel.app` |
| `BOT_URL` | `http://95.170.26.39:8788` (l'adresse du VPS et le port de l'API du site) |
| `BOT_CLE` | Exactement la même valeur que `SITE_CLE` dans `reglages.env` du bot |

5. **Portail développeur Discord → OAuth2 → Redirects** : ajouter `https://<adresse du site>/api/auth/callback` (exactement l'adresse de `SITE_URL`, suivie de `/api/auth/callback`).
6. Ouvrir le site, descendre jusqu'à Chopper, se connecter : les boutons Nourrir, Jouer et le champ pour lui parler apparaissent.

Si le site change d'adresse (domaine à toi, autre nom de projet) : changer `SITE_URL`, la redirection Discord, et la ligne `og:image` n'a pas besoin de changer (elle est relative).

## Comment ça marche

- **Les données** : `api/public.js` demande au bot `/public`. Le bot interroge Twitch au plus une fois par minute, YouTube toutes les 10 minutes, Discord toutes les 5 minutes. La page se rafraîchit toute seule toutes les minutes.
- **Si le bot ne répond pas** (VPS éteint) : la page s'affiche quand même, avec les événements prévus (une copie est dans `site.js`, `SECOURS`) ; les lives, les potes et Chopper reviennent dès que le bot répond.
- **Ma chaîne** : en live, le lecteur Twitch et le chat ; sinon, la chaîne rediff du bot (tes anciens lives en boucle) ; sinon, un message « pas de live ». Le lecteur se charge seulement quand on arrive près de cette partie, sans le son.
- **YouTube** : la dernière vidéo (chargée seulement au clic, mode « confidentialité renforcée »), les autres, et les Shorts à part.
- **Le tournoi** : tout vient du bot (`/tournoi` sur Discord : équipes, tirage des poules, dates, scores). Pendant un match, la partie Tournoi affiche le score en direct et le lecteur de ta chaîne ; sinon le compte à rebours de la finale. L'adresse directe : `/#tournoi`.
- **Ta pp** : le dessin de Maelle Henry (`img/pp-liliano-640.webp` et `img/pp-liliano-200.webp`) est collé à côté de Chopper en haut de la page, et sert d'avatar dans « Ma chaîne » et « Sur YouTube ». Le crédit est dans les mentions. Pour la changer : remplace ces deux fichiers en gardant leurs noms (images carrées).
- **Les équipes et les agents Valorant** : les équipes restent scellées (« Équipe 1 » à « Équipe 6 », sans joueurs) jusqu'au **22 décembre 2026 à 0 h**, avec un compte à rebours et les agents en ombres chinoises. À minuit pile, le site les dévoile tout seul (les agents passent en couleur), sans rien toucher ; le bot les annonce aussi sur Discord. Pour changer la date : `/tournoi revelation`. Les agents sont dans `img/agents/` (`agent-1…7.webp` en pied, `buste-1…7.webp` sur les cartes des équipes) ; la mention Riot Games (« Legal Jibber Jabber ») est en bas de page et dans les mentions.
- **Le goûter de Chopper** : le mini-jeu, dans la partie Chopper (adresse directe : `/#gouter`). Tout le monde peut jouer ; pour les membres connectés, le bot ouvre la partie, vérifie le score à la fin et le compte pour le classement (voir le LISEZMOI du bot).
- **Le salon du site sur Discord** : `/site salon` poste une carte avec des boutons qui ouvrent le site, le tournoi et le goûter.
- **Chopper** : la connexion Discord ouvre une session de 30 jours. Le bot vérifie que la personne est sur le serveur Barhaw (sinon : « Rejoins le Discord »). Nourrir et jouer, c'est une fois par jour, avec le même compteur que sur Discord ; la scène est aussi postée dans le salon de Chopper, avec son animation. Parler : une fois toutes les 2 minutes (réponse de l'IA du bot si `CLE_IA` est rempli, sinon des phrases toutes prêtes).
- **Sécurité** : les demandes du site au bot sont signées avec `BOT_CLE` et l'heure ; une demande trop vieille ou déjà vue est refusée, et la clé ne circule jamais. Aucun texte venu de l'extérieur (titres de live, événements, pseudos) n'est inséré comme du HTML. La politique de sécurité (`vercel.json`) n'autorise que les lecteurs Twitch et YouTube dans la page.
- **La musique** : le bouton « Musique » (en bas à gauche, dans l'en-tête sur téléphone) lance « The World's Number One Oden Store » (One Piece) d'un clic, avec un réglage du volume ; un second clic la coupe. Le morceau est le fichier `musique/oden.mp3` : ajoute-le dans le dossier `musique/` du dépôt (tant qu'il n'y est pas, le bouton ne s'affiche pas). Pour changer de morceau, remplace ce fichier en gardant le même nom.
- **Les vidéos** : le teaser du tournoi (`videos/teaser-tournoi.mp4`) est dans la partie Tournoi ; celui du live 12 h (`videos/live-12h.mp4`) s'affiche dans la carte du prochain event tant que c'est le live 12 h, et un bouton « Voir le teaser » l'ouvre depuis la liste des events. Elles se chargent seulement quand on appuie sur lecture. Pour en changer : remplace le fichier en gardant son nom (et l'image `.jpg` du même nom, qui s'affiche avant la lecture). Pour un nouvel event, ajoute une ligne dans `VIDEOS`, en haut de `site.js`, avec l'identifiant de l'event. GitHub refuse les fichiers de plus de 25 Mo envoyés depuis le site : compresse la vidéo avant si besoin.
- **Les mèmes** : les images de `img/memes/` sont collées au hasard sur la page à chaque visite (une en haut, une par partie, une en bas) ; un clic les affiche en grand. Pour en ajouter : mets l'image dans `img/memes/` et ajoute une ligne dans `MEMES`, en haut de `site.js` (avec sa largeur et sa hauteur).
- **Polices et images** : Dela Gothic One (titres, onomatopées, kanji) et M PLUS Rounded 1c (texte), chargées depuis Google Fonts (autorisé dans `vercel.json`, signalé dans les mentions). Chopper est un personnage de One Piece (crédit en bas de page et dans les mentions).

## Limites

- Offre Hobby de Vercel : 12 fonctions au plus dans `api/` ; le site en utilise 5.
- Le lecteur Twitch exige que l'adresse du site soit en `https` : il ne marche pas en ouvrant `index.html` directement sur ton PC.
