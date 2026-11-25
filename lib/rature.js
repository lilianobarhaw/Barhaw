// Le site secret de la VF 1.0 : « La Rature ». Un cadenas à 4 symboles caché en bas du site ; les 4 marques qui donnent
// le code sont semées dans GRAND LINE (le récit de Port Barhaw, le navire noir la nuit sur la carte, la case rayée du
// Bestiaire, la présentation de GRAND LINE à 3 h du matin). Le code ouvert, Rature prend le site : ses ratures, ses
// murmures et le journal de bord de son navire, le Dernier Mot.
// Tout ce qui est secret reste ici, côté serveur (ce dossier n'est pas servi : /lib/* renvoie vers l'accueil) : le code,
// les marques, le journal et les ratures ne partent vers le navigateur que si on les a mérités.

// les 12 symboles des molettes du cadenas, dans l'ordre des molettes (le site les dessine)
export const SYMBOLES = ["plume", "ancre", "bougie", "cle", "lune", "vague", "sablier", "rouage", "coquillage", "pavillon", "etoile", "cloche"];
export const CODE = ["plume", "pavillon", "coquillage", "sablier"];

// l'ouverture de la VF 1.0 (22 décembre 2026 à 21 h 30, heure de Paris) : avant, le secret dort
export const OUVERTURE = Date.parse("2026-12-22T20:30:00Z");

// l'heure de Paris (0 à 23), pour les marques qui ne se montrent qu'à certaines heures
export function heureParis(t = Date.now()) {
  const h = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" }).format(new Date(t));
  return Number.parseInt(h, 10) % 24;
}
export const deNuit = (h) => h >= 22 || h < 6;

// les 4 marques : où elles sont, quand elles se montrent, ce qu'elles disent
export const MARQUES = {
  1: { chiffre: "I", symbole: "plume", note: "Je l'ai vue la dessiner.", quand: () => true },
  2: { chiffre: "II", symbole: "pavillon", note: "Pas d'emblème. Pas de sillage. Pas de nom.", quand: (h) => deNuit(h), attendre: "Il ne passe que la nuit." },
  3: { chiffre: "III", symbole: "coquillage", note: "Celle-là, je l'ai rayée avant que vous la voyiez. Il en reste la coquille.", quand: () => true },
  4: { chiffre: "IV", symbole: "sablier", note: "À cette heure-ci, plus personne ne lit. Sauf toi.", quand: (h) => h === 3, attendre: "Pas maintenant." },
};

export function marquePourSite(n, h = heureParis()) {
  const m = MARQUES[n];
  if (!m) return { erreur: "marque", texte: "Rien ici." };
  if (!m.quand(h)) return { erreur: "pas-maintenant", texte: m.attendre || "Pas maintenant." };
  return { marque: Number(n), chiffre: m.chiffre, symbole: m.symbole, note: m.note };
}

// le code proposé : 4 symboles connus, dans l'ordre des molettes
export function lireCode(v) {
  if (!Array.isArray(v) || v.length !== 4) return null;
  const c = v.map((x) => String(x || ""));
  return c.every((x) => SYMBOLES.includes(x)) ? c : null;
}
export const bonCode = (c) => Array.isArray(c) && c.length === CODE.length && c.every((x, i) => x === CODE[i]);

// le journal de bord du Dernier Mot (la dernière page parle à celui qui lit, avec son nom s'il est connecté)
export function journal(nom = "") {
  const pages = [
    { jour: "Jour 1", titre: "Mon nom", texte: "On m'a demandé mon nom. Je l'ai rayé. Un nom, c'est une prise : on vous attrape avec, on vous range dans un carnet, on vous appelle quand on a besoin de vous. Moi, personne ne m'appelle. On me croise." },
    { jour: "Jour 9", titre: "La Grande Carte", texte: "Je ne l'ai pas déchirée. J'étais là quand elle l'a fait. Elle pleurait en tirant sur le papier, et elle répétait : « Comme ça, personne ne possédera tout. » Elle se trompait. Pour posséder une carte déchirée, il suffit de quelqu'un qui ramasse." },
    { jour: "Jour 40", titre: "Ce que j'ai rayé", texte: "Un nom, au Récif : les rochers le commencent et ne le finissent jamais. Une mer, au désert : personne n'a remarqué qu'elle manquait. Une bougie, au Marais : le Roi Crapaud la cherche encore. Ce que je raye ne disparaît pas. Ça passe de l'autre côté." },
    { jour: "Jour 41", titre: "L'autre côté", texte: "Du haut du Grand Arbre, vous l'avez vue. Après le bord de la carte, il y a une autre mer. Elle est faite de tout ce que j'ai rayé. Elle est calme. Elle est pleine. Et la nuit, quand on tend l'oreille, elle répète vos noms à l'envers." },
    { jour: "Jour 77", titre: "Le Dernier Mot", texte: "Mon navire ne laisse pas de sillage. Ce n'est pas de la magie : la mer refuse de se souvenir de lui. Calcaire ne m'attrapera jamais. L'Amiral Boulet a baissé ses canons. Mère Brume m'a éteint la route, et j'ai continué dans le noir. Alors elle m'a montré la dernière." },
    { jour: "Jour 112", titre: "Vos pavillons", texte: "Vous vous battez pour des îles. Vous comptez vos milles, vos rameurs, vos couronnes. Moi, je compte autre chose : les noms qu'on crie le plus fort. Ce sont les plus faciles à rayer. Il suffit d'un trait." },
  ];
  const n = String(nom || "").replace(/\s+/g, " ").trim().slice(0, 40);
  pages.push(n
    ? { jour: "Aujourd'hui", titre: "Toi", texte: "Tu as trouvé mes quatre marques. Tu as ouvert mon cadenas. Tu sais lire, alors. Je note ton nom tout en bas de la page. Pour plus tard.", nom: n }
    : { jour: "Aujourd'hui", titre: "Toi", texte: "Tu as trouvé mes quatre marques. Tu as ouvert mon cadenas. Tu sais lire, alors. Je ne connais pas encore ton nom. Ça viendra." });
  return pages;
}

// ce que Rature raye sur le site (le mot barré, et le sien écrit par-dessus) ; seulement les titres qui existent
export const RATURES = [
  { cible: "#titre-accueil .degrade", par: "personne." },
  { cible: "#titre-evenements .degrade", par: "derniers jours." },
  { cible: "#titre-grandline .degrade", par: "VIDE." },
  { cible: "#titre-guerre .degrade", par: "des noms." },
  { cible: "#titre-creatures .degrade", par: "proies." },
  { cible: "#titre-mer .degrade", par: "qui oublie." },
  { cible: "#titre-chaine .degrade", par: "cage." },
  { cible: "#titre-potes .degrade", par: "disparus." },
  { cible: "#titre-cartes .degrade", par: "mer d'avant." },
  { cible: "#titre-jeux .degrade", par: "lire." },
  { cible: "#titre-chasse .degrade", par: "ton nom." },
  { cible: "#titre-discord .degrade", par: "silence." },
];
// ses murmures (écrits à la main dans la marge, puis effacés) et les mots qu'elle glisse quand on a le dos tourné
export const MURMURES = [
  "Tu lis encore ?",
  "Je suis passée avant toi.",
  "Ne souffle pas sur les bougies.",
  "Il manque une île. Tu ne l'as pas remarqué.",
  "Ton navire fait trop de bruit.",
  "Après le bord, il y a une autre mer.",
  "Je garde une page pour toi.",
  "Ne te retourne pas. Je suis déjà partie.",
];
export const MOTS = ["rien", "personne", "jamais", "oublié", "rayé", "plus rien", "ailleurs"];

export function contenuOuvert(nom = "") {
  return { journal: journal(nom), ratures: RATURES, murmures: MURMURES, mots: MOTS };
}
