# Le générique de GRAND LINE (VF 1.0)

Un générique de 45,5 s, façon opening d'anime, qui passe à la première entrée dans GRAND LINE en VF
(puis à la demande, avec le bouton « ▶ Le générique »). Tout est original : les îles, les maîtres des lieux,
les boss, le vaisseau fantôme et le capitaine Calcaire viennent des modèles du site (niveau 5).

Musique : « Spark » de Leva (Artlist, sous licence). Voix : Liliano (le capitaine Calcaire).

## Les quatre temps

| Temps | Instants | Ce qu'on voit |
|---|---|---|
| 1. La brume | 0 – 16,7 s | La nuit, le brouillard, la lune. Le vaisseau fantôme sort de la brume, Calcaire parle depuis la proue. |
| 2. La montée | 9,3 – 23,5 s | Le rire, puis « Mes îles… mes monstres… mes règles » : le phare, le monstre, Krakor dans l'éclair, des éclats de plus en plus courts, deux arrêts dans le noir (« Bienvenue sur… GRAND LINE »), l'aube qui pointe. |
| 3. Le jour | 23,5 – 38,5 s | Le titre sur l'archipel, les 8 îles et leurs maîtres (un par temps fort), la baleine, le monstre, les 3 boss. |
| 4. La nuit qui tombe | 38,5 – 45,5 s | Le logo : le soleil se couche, les étoiles s'allument, le phare aussi ; puis la brume reprend tout. « Aucun équipage n'en est jamais revenu… » |

## Refaire le générique

1. **Les plans 3D** : dans Blender (5.2), avec `outils/blender/barhaw_generique_vf.py` dans le dossier des scripts
   (`Documents\Barhaw-3D\scripts`) :

   ```python
   import sys; sys.path.insert(0, r"C:\Users\lilia\Documents\Barhaw-3D\scripts")
   import barhaw_generique_vf as G
   G.essai("brume_calcaire", 45)   # une image d'essai
   G.lancer()                       # tous les plans, l'un après l'autre (suivi dans rendus/generique/bilan.json)
   G.lancer(["jour_eveil"])         # ou seulement certains
   ```

   Chaque plan donne `rendus/generique/<plan>.mp4` (1920 × 1080, 30 i/s ; les îles en 1920 × 1200).

2. **Le son** : `python3 mix_gen.py` → `sortie/generique-son.wav` (−16 LUFS). `python3 analyse_mix.py` montre
   l'écart entre la voix et le reste pour chaque réplique. La voix se prépare avant avec `traiter_vf.py`
   (la prise `vf.wav`) et la salle avec `ir.py`.

3. **L'image** : `python3 montage_gen.py` → `sortie/generique-image.mp4`.
   `python3 montage_gen.py 23.5 41` fait un extrait ; `python3 montage_gen.py apercu 24.2 39.5` quelques images fixes.

4. **Pour le site** : on colle le son (`ffmpeg -i generique-image.mp4 -i generique-son.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k generique-complet.mp4`),
   puis `bash encoder_site.sh generique-complet.mp4 <dossier>` donne les fichiers de `videos/` :
   `generique-gl-720.webm/.mp4`, `generique-gl-480.webm/.mp4` et l'affiche `generique-gl.jpg`.

Le découpage (les plans, les instants des répliques, les noms des îles) est dans `plan_gen.py` :
un temps fort de la musique tous les 0,375 s, `b(k) = 2,5 + 0,375 × k`.

Les dossiers se changent avec `GEN_DOSSIER` (le dossier de travail), `GEN_RENDUS` (les plans de Blender)
et `GEN_SONS` (la banque de bruitages et la musique).
