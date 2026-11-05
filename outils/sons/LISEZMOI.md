# Les sons de la VF 1.0

Tout est dans `son/` (AAC, `.m4a`), chargé par le site seulement quand le visiteur allume les sons (bouton haut-parleur).

## D'où ils viennent (banque Artlist, licence de Liliano)

| Fichier | Son Artlist |
|---|---|
| pop | pop-bulle (déjà utilisé dans le teaser) |
| souffle | whoosh-airy (teaser) |
| clic | ui-mignon (teaser) |
| taiko | impact-taiko (teaser) |
| impact | impact-tambour (teaser) |
| quiz-bon | Unrealsfx · Building Game UI – Reward Received, Positive Alert |
| quiz-faux | Epic Stock Media · Vibrant Game – Kazoo Slide Down, Negative |
| carte | Omnibit Sound · Casino Central – Single Card, Flipping |
| paire | Bjorn Lynne · Multimedia – Sunshine Bright Bells |
| saut | J.BoB · Cartoon UI – Power Jump |
| tonneau | Omnibit Sound · Cartoon Mania – Hollow Bonk, Squeaky Hit |
| cloche | Vadi Sound · Wrestling Ring – Bell Ring Single Tap |
| potion | Unrealsfx · Magical Game – Magic Potion, Bubbly |
| soin | Alberto Sueri · RPG Game – Magical Crystals |
| victoire | Cristian Lucchetta · White Magic – Level Up, Positive, Winning |
| mer | West Wolf · Seaside Nature – Sea Waves Gushing, Lapping on Breakwater |
| jeu-quiz | YesNoMaybe · Bark Technology |
| jeu-memory | Peter Spacey · Kawaii Kitty Dance |
| jeu-course | MANYUKO · Burger Flip |
| jeu-rumble | Roie Shpigler · Daishō (Two Swords) |
| jeu-docteur | T. Bless · Froggy Fraud Adventure |

## Les refaire

- Bruitages : `python3 outils/sons/effets.py <dossier des sons Artlist> son/`
- Musiques et mer : `python3 outils/sons/boucle.py '{"src": "...mp3", "dst": "son/jeu-quiz.m4a", "bpm": 96, "debut": 110.1, "temps": 32, "debit": "96k"}'`
  (la boucle tombe sur les temps ; le fichier a 0,5 s de marge de chaque côté ; la longueur de la boucle est dans `SON_BOUCLES` de `site.js`)
- Les petites vidéos (boss de BOSS LIVE, arrivée sur une île) : dans Blender `import barhaw_clips_vf as C ; C.tout()`, puis
  `sh outils/sons/clips.sh <Documents/Barhaw-3D/rendus/clips> .`
