# Montages TikTok / Shorts

Outil pour monter les clips de live en vidéos verticales TikTok / YouTube Shorts, avec la D.A. Barhaw. Ce dossier n'est pas servi par le site (`/outils/*` renvoie vers l'accueil).

## Contenu

- `moteur.py` : le moteur. Il gère les sous-titres, les étiquettes, les zooms, les secousses, les flashs, les glitchs, le mixage et l'export.
- `plans/` : un fichier par clip, avec les coupes, les sous-titres, les étiquettes, les zooms, les bruitages et la musique.
  - `premier-clip-montage.py` : le tout premier montage, avant que le moteur existe.
  - `A.py` à `E.py` : les cinq clips suivants.

Ce qui n'est **pas** dans le dépôt :
- les clips sources, trop lourds et avec d'autres streamers dedans ;
- les sons Artlist, sous licence et à garder hors GitHub ;
- les vidéos finies.

Sur le PC, tout est rangé dans `Documents\Barhaw-3D\` :
- `son\tiktok\` : les sons Artlist ;
- `videos\tiktok\` : les vidéos finies ;
- `tiktok\` : une copie de ce dossier.

## La D.A.

**Format**
- Vertical 1080x1920, 30 images par seconde, léger étalonnage.
- Entre 10 et 30 secondes. On coupe les blancs inutiles et on garde ceux qui font rire.

**Sous-titres**
- Mot par mot en Dela Gothic One, en majuscules, blanc avec un contour noir.
- Le mot prononcé est en rose `#ff5aae`, les mots clés en jaune `#ffe14d`.
- Ils apparaissent avec un petit « pop ».
- Placés sur la jonction entre la caméra et le jeu, vers 650 px du haut. Sur un clip plein écran, plus bas, vers 1260 px.

**Étiquettes**
- Boîte arrondie penchée.
- Blanc pour l'accroche des 3 premières secondes, jaune pour une info, rose pour la chute.
- Placées loin du visage, des icônes TikTok à droite et des 300 px du bas.

**Mouvements**
- Zoom d'entrée de 1,15 à 1.
- Coups de zoom sur les moments forts, en ciblant la caméra ou le jeu.
- Secousse sur les impacts, flash blanc sur les chutes, glitch pour les effets numériques.

**Son**
- La voix est nivelée.
- La musique Artlist reste environ 4 dB sous la voix et baisse encore quand ça parle. On peut la couper net (avec un scratch) ou l'étouffer.
- Bruitages Artlist.
- Volume final à -14 LUFS, crête à -1 dB.

## Utilisation

Il faut Python 3 avec numpy et Pillow, plus ffmpeg et la police Dela Gothic One.

```
set SON_TIKTOK=C:\Users\lilia\Documents\Barhaw-3D\son\tiktok
set POLICE_TIKTOK=C:\chemin\vers\DelaGothicOne-Regular.ttf
python plans\B.py essai 0.5 3.0 9.0   (quelques images d'essai dans essais\)
python plans\B.py tout                (son puis vidéo dans sorties\)
```

Le clip source se place à côté de `moteur.py` sous le nom indiqué dans le plan (`SRC`, par exemple `B.mp4`).

Pour un nouveau clip :
1. Copier le plan qui ressemble le plus.
2. Mettre les temps de chaque mot, tirés d'une transcription.
3. Régler les coupes, les étiquettes et les bruitages. Pour caler un bruitage, utiliser `PIC[nom]`, qui donne l'instant de son pic.

## Règles

- Pas d'insulte en sous-titres : on coupe le passage. C'est ce qui a été fait sur le clip C.
- Signaler les pseudos prononcés qui apparaissent en sous-titres.
- Signaler une musique de jeu qui pourrait être repérée par les plateformes.
- Pas d'émoji sur la vidéo.
