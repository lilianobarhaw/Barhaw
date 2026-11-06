// Valorant des potes (la page /valorant) : le défi VALORANT de la semaine entre les potes du Discord Barhaw.
// La page ne parle jamais à HenrikDev ni à Riot : elle lit ce que le bot a déjà enregistré (/api/public, gardé 20 s par
// Vercel), et, pour le membre connecté, ses propres games (/api/chopper, action « valorant »). Rien n'attend une API.
// Relier son compte : la case d'accord, puis « Relier avec Discord » (/api/auth/login?valorant=1&accord=1). Le retour
// arrive ici avec ?liaison=ok (ou pas-riot, pris…). Le Riot ID n'est montré qu'au membre lui-même.
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  function el(tag, attrs = {}, ...enfants) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : String(v));
    }
    for (const c of enfants.flat()) if (c !== null && c !== undefined && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return e;
  }
  const vider = (e, ...enfants) => { e.replaceChildren(...enfants.flat().filter(Boolean)); return e; };
  const lienSur = (u) => (/^https:\/\/[^\s<>"]+$/i.test(String(u || "")) ? String(u) : "");
  const nombre = (n) => (Number(n) || 0).toLocaleString("fr-FR");
  const pct = (x) => (x === null || x === undefined || !Number.isFinite(Number(x)) ? "–" : `${Math.round(Number(x) * 100)} %`);
  const pluriel = (n, mot) => `${nombre(n)} ${mot}${n > 1 ? "s" : ""}`;
  const kda = (g) => `${g.k} / ${g.d} / ${g.a}`;
  const NOTES = { "S+": "splus", S: "s", "A+": "aplus", A: "a", "B+": "bplus", B: "b", C: "c", D: "d" };
  const STATS = {
    acs: ["ACS", (v) => nombre(Math.round(v))], fb: ["First bloods par round", (v) => v.toFixed(2).replace(".", ",")],
    hs: ["Headshots", pct], assists: ["Assists par round", (v) => v.toFixed(2).replace(".", ",")], impact: ["Rounds utiles", pct],
    objectif: ["Plants et désamorçages par round", (v) => v.toFixed(2).replace(".", ",")], survie: ["Rounds finis en vie", pct],
  };
  function ilYa(t) {
    const m = Math.max(1, Math.round((Date.now() - Number(t)) / 60_000));
    if (m < 60) return `il y a ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `il y a ${h} h`;
    const j = Math.round(h / 24);
    return j === 1 ? "hier" : `il y a ${j} jours`;
  }
  function avantLundi() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    const jour = Math.max(0, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday));
    const reste = Math.max(1, (7 - jour) * 1440 - (Number(p.hour) * 60 + Number(p.minute)));
    const j = Math.floor(reste / 1440);
    const h = Math.floor((reste % 1440) / 60);
    return j ? `Fin dans ${j} j ${h} h` : `Fin dans ${h} h ${String(reste % 60).padStart(2, "0")}`;
  }
  const resultat = (g) => (g.victoire === true ? "Victoire" : g.victoire === false ? "Défaite" : "Match nul");

  let donnees = null; // ce que le bot montre à tout le monde (donnees.valorant)
  let moi = null; // { lie, riot, semaine, historique, moyennes } pour le membre connecté
  let connecte = null; // true, false, ou null (pas encore su)
  let pasMembre = false;
  let occupe = false;
  let message = null; // { texte, erreur }
  let confirmer = false;
  const deja = {}; // ce qui est déjà affiché (pour ne pas tout redessiner à chaque rafraîchissement)
  const infos = () => donnees?.valorant || null;

  // l'icône de l'agent ; sans elle (pas de réseau), ses initiales
  function visage(g, classe = "") {
    const nom = String(g?.agent || "");
    const src = lienSur(g?.image);
    return el("span", { class: `fl-champ agent ${classe}`.trim(), title: nom || null },
      el("b", { "aria-hidden": "true", text: nom.replace(/[^A-Za-z]/g, "").slice(0, 2) || "?" }),
      src ? el("img", { src, alt: nom, width: 120, height: 120, loading: "lazy", decoding: "async", onerror: (e) => e.currentTarget.remove() }) : null,
    );
  }
  const tampon = (note, classe = "") => el("span", { class: `fl-note n-${NOTES[note] || "d"} ${classe}`.trim(), text: note || "?" });

  // ---------- la game de la semaine ----------
  function rendreUne() {
    const z = $("va-une");
    if (!z) return;
    const v = infos();
    const g = v?.partieDeLaSemaine;
    const cle = JSON.stringify([g, v?.actif]);
    if (deja.une === cle) return;
    deja.une = cle;
    z.classList.toggle("une-vide", !g);
    if (!g) {
      vider(z,
        el("div", { class: "fu-portrait" }, el("span", { class: "concentration", "aria-hidden": "true" }), el("div", { class: "fu-cadre fu-cadre-vide" }, el("span", { class: "fu-point", text: "?" }))),
        el("div", { class: "fu-infos" },
          el("p", { class: "fu-surtitre", text: "La game de la semaine" }),
          el("h3", { class: "fu-nom", text: v?.actif ? "Le site attend ses carrys." : "Valorant des potes ouvre très bientôt." }),
          el("p", { class: "fu-meta", text: "Relie ton compte et lance une compétition, une non classée ou une Swiftplay : la meilleure game de la semaine s'affiche ici, en grand, avec sa note." }),
          el("a", { class: "btn btn-plein", href: "#va-moi", text: "Relier mon compte" }),
        ),
      );
      return;
    }
    vider(z,
      el("div", { class: "fu-portrait" },
        el("span", { class: "concentration", "aria-hidden": "true" }),
        el("div", { class: "fu-cadre" }, visage(g, "fl-champ-grand")),
        tampon(g.note, "fu-tampon"),
        el("span", { class: "sfx fu-sfx", "aria-hidden": "true", text: g.note === "S+" ? "ドン!" : "バン!" }),
      ),
      el("div", { class: "fu-infos" },
        el("p", { class: "fu-surtitre", text: "La game de la semaine" }),
        el("h3", { class: "fu-nom" }, g.nom, el("span", { class: "fu-champion", text: ` sur ${g.agent}` })),
        el("p", { class: "fu-kda", "aria-label": `${g.k} kills, ${g.d} morts, ${g.a} assists`, text: kda(g) }),
        el("p", { class: "fu-meta", text: [g.roleNom, g.carte, `${resultat(g)}${g.scoreMap ? ` ${g.scoreMap}` : ""}`, g.file, ilYa(g.fin)].filter(Boolean).join(" · ") }),
        el("ul", { class: "fu-bulles" }, (g.raisons || []).map((r) => el("li", { text: r }))),
        el("p", { class: "fu-score" },
          el("span", { text: "Note" }), el("b", { text: `${g.score}/100` }),
          el("span", { text: "Points" }), el("b", { text: `+${g.points}` }),
          g.duo?.length ? el("span", { class: "fu-duo", text: `en duo avec ${g.duo.join(", ")}` }) : null,
        ),
      ),
    );
  }

  // ---------- le podium, la suite, les titres ----------
  function rendrePodium() {
    const z = $("va-podium");
    if (!z) return;
    const v = infos();
    const c = v?.classement || [];
    const titres = v?.titres || [];
    const cle = JSON.stringify([c, titres, v?.precedente, avantLundi()]);
    if (deja.podium === cle) return;
    deja.podium = cle;
    const marche = (x, place) => el("li", { class: `fp-marche place-${place}${x ? "" : " libre"}` },
      x
        ? el("div", { class: "fp-joueur" },
          place === 1 ? el("span", { class: "fp-couronne", "aria-hidden": "true", text: "👑" }) : null,
          visage(x.meilleure, "fp-champ"),
          el("strong", { class: "fp-nom", text: x.nom }),
          el("span", { class: "fp-points" }, el("b", { text: nombre(x.points) }), " pts"),
          el("small", {}, pluriel(x.parties, "game"), " · meilleure ", tampon(x.meilleure?.note, "fl-note-mini")),
        )
        : el("div", { class: "fp-joueur" }, el("span", { class: "fp-vide", text: "?" }), el("small", { text: "Place libre" })),
      el("div", { class: "fp-socle" }, el("span", { class: "fp-rang", text: String(place) })),
    );
    vider(z,
      el("div", { class: "fp-tete" }, el("h3", { text: "Le podium de la semaine" }), el("span", { class: "etiquette", text: avantLundi() })),
      el("ol", { class: "fp-podium", "aria-label": "Les trois premiers de la semaine" }, marche(c[1], 2), marche(c[0], 1), marche(c[2], 3)),
      c.length > 3
        ? el("ol", { class: "fp-suite", start: "4" }, c.slice(3).map((x) => el("li", {},
          el("span", { class: "fp-suite-nom", text: x.nom }), el("small", { text: pluriel(x.parties, "game") }), el("b", { text: `${nombre(x.points)} pts` }),
        )))
        : null,
      titres.length
        ? el("ul", { class: "fp-titres", "aria-label": "Les titres de la semaine" }, titres.map((t) => el("li", { class: `fp-titre titre-${t.cle}` },
          el("span", { class: "fp-titre-nom", text: t.titre }), el("strong", { text: t.nom }), el("small", { text: t.valeur }),
        )))
        : el("p", { class: "note", text: "Le podium et les titres (Carry de la semaine, Tireur d'élite, Roi des first bloods, Le pilier, L'ange gardien) se remplissent avec les games de la semaine." }),
      v?.precedente ? el("p", { class: "note fp-avant", text: `La semaine dernière : ${v.precedente.carry}, carry avec ${nombre(v.precedente.points)} pts.` }) : null,
    );
  }

  // ---------- comment c'est noté ----------
  function rendreRegles() {
    const z = $("va-regles");
    if (!z) return;
    const v = infos();
    const notes = v?.notes || [["S+", 10], ["S", 8], ["A+", 7], ["A", 6], ["B+", 4], ["B", 3], ["C", 1], ["D", 0]].map(([note, points]) => ({ note, points }));
    const cle = JSON.stringify([notes, v?.meilleures, v?.bonusDuo, v?.files]);
    if (deja.regles === cle) return;
    deja.regles = cle;
    vider(z,
      el("h3", { text: "Comment c'est noté" }),
      el("ul", { class: "fr-echelle", "aria-label": "Les notes et leurs points" }, notes.map((n) => el("li", {}, tampon(n.note, "fl-note-petite"), el("b", { text: pluriel(n.points, "pt") })))),
      el("ul", { class: "fr-regles" },
        el("li", {}, el("strong", { text: "Selon le rôle de ton agent. " }), "Ta game est comparée à une bonne game de ce rôle : ACS, first bloods, headshots, assists, rounds utiles, plants et désamorçages, survie. La victoire donne un bonus."),
        el("li", {}, el("strong", { text: "La qualité avant tout. " }), `Tes ${v?.meilleures || 10} meilleures games de la semaine comptent. +${v?.bonusDuo ?? 1} point quand tu joues avec un autre membre relié, dans ton équipe.`),
        el("li", {}, el("strong", { text: "Les games qui comptent. " }), `${(v?.files || ["Compétition", "Non classée", "Swiftplay"]).join(", ")}, jouées après avoir relié ton compte. Pas le deathmatch, pas les parties personnalisées.`),
        el("li", {}, el("strong", { text: "Dans la chasse. " }), "Une game A, A+, S ou S+ frappe le boss de la semaine et fait monter ton avis de recherche, comme pour LoL (6 games par jour)."),
      ),
      el("p", { class: "fr-mention", text: "Un défi entre potes, pas un classement officiel : pas de MMR, pas de rang. Valorant des potes n'est ni soutenu ni parrainé par Riot Games." }),
    );
  }

  // ---------- les dernières games ----------
  function carte(g) {
    return el("article", { class: `fl-game n-${NOTES[g.note] || "d"}${g.victoire === true ? " gagnee" : " perdue"}` },
      el("div", { class: "fl-game-haut" },
        visage(g),
        el("div", { class: "fl-game-titre" }, el("strong", { text: g.nom }), el("span", { text: `${g.agent} · ${g.roleNom}` })),
        tampon(g.note),
      ),
      el("p", { class: "fl-kda" },
        el("b", { text: kda(g) }),
        el("span", { class: g.victoire === true ? "fl-v" : "fl-d", text: resultat(g) }),
        el("small", { text: [g.scoreMap, g.carte].filter(Boolean).join(" · ") }),
      ),
      el("ul", { class: "fl-raisons" }, (g.raisons || []).slice(0, 3).map((r) => el("li", { text: r }))),
      el("p", { class: "fl-game-pied" },
        el("b", { text: `+${pluriel(g.points, "pt")}` }),
        g.duo?.length ? el("span", { class: "fl-duo", text: `duo avec ${g.duo.join(", ")}` }) : null,
        el("time", { datetime: new Date(Number(g.fin)).toISOString(), text: ilYa(g.fin) }),
      ),
    );
  }
  function rendreFil() {
    const z = $("va-fil");
    if (!z) return;
    const v = infos();
    const l = v?.dernieres || [];
    const cle = JSON.stringify([l.map((g) => [g.fin, g.nom]), v?.membres, Math.floor(Date.now() / 600_000)]);
    if (deja.fil === cle) return;
    deja.fil = cle;
    vider(z, l.length
      ? el("div", { class: "fl-fil" }, l.map(carte))
      : el("p", { class: "note fm-attente", text: v?.membres ? `${pluriel(v.membres, "compte")} relié${v.membres > 1 ? "s" : ""} : les games notées arrivent ici 5 à 15 minutes après leur fin.` : "Les games notées arrivent ici 5 à 15 minutes après leur fin, avec leur note et ce qui l'explique." }));
  }

  // ---------- ton compte ----------
  const tete = (titre, ...plus) => el("div", { class: "fp-tete" }, el("h3", { text: titre }), ...plus);
  function relier() {
    const bouton = el("a", { class: "btn btn-plein", href: "/api/auth/login?valorant=1&accord=1", "aria-disabled": "true", tabindex: "-1", text: "Relier avec Discord" });
    const caseAccord = el("input", { type: "checkbox", id: "va-accord", onchange: (e) => {
      const ok = e.currentTarget.checked;
      bouton.setAttribute("aria-disabled", String(!ok));
      if (ok) bouton.removeAttribute("tabindex"); else bouton.setAttribute("tabindex", "-1");
    } });
    bouton.addEventListener("click", (e) => { if (!caseAccord.checked) e.preventDefault(); });
    return [
      tete("Relier ton compte VALORANT"),
      el("div", { class: "va-accord" },
        el("label", { for: "va-accord" }, caseAccord, el("span", { text: "J'accepte que Barhaw lise mes games VALORANT et les affiche, avec mon pseudo Discord, sur le site et le Discord Barhaw." })),
        el("p", { text: "Relier ton compte rend ces stats visibles pour la commu. Tu peux tout retirer à tout moment : tout est effacé." }),
      ),
      el("div", { class: "fm-actions" }, bouton),
      el("p", { class: "va-aide" }, "Ton compte Riot doit être connecté à ton Discord : ", el("b", { text: "Paramètres Discord → Connexions → Riot Games" }), ". Aucun mot de passe ne passe par Barhaw."),
      message ? el("p", { class: `fm-message${message.erreur ? " erreur" : ""}`, role: message.erreur ? "alert" : "status", text: message.texte }) : null,
    ];
  }
  function detailNote(g) {
    const d = g.detail || [];
    return el("ul", { class: "va-detail" },
      d.map((c) => {
        const [nom, fmt] = STATS[c.cle] || [c.cle, String];
        return el("li", {},
          el("span", { text: nom }),
          el("small", { text: `${fmt(c.valeur)} · repère ${fmt(c.repere)} · compte pour ${Math.round(c.poids * 100)} %` }),
          el("span", { class: `va-barre${c.ratio < 1 ? " bas" : ""}`, "aria-hidden": "true" }, el("i", { style: `width:${Math.min(100, Math.round((c.ratio / 2) * 100))}%` })),
        );
      }),
      g.manquant?.length ? el("li", {}, el("small", { text: `Pas dans cette partie : ${g.manquant.map((x) => (STATS[x] || [x])[0].toLowerCase()).join(", ")} (laissé de côté, sans pénalité).` })) : null,
      g.aTravailler ? el("li", { class: "va-travail" }, el("span", { text: `À travailler : ${g.aTravailler}.` })) : null,
      el("li", {}, el("small", { text: `Note ${g.score}/100 · ${resultat(g)}${g.scoreMap ? ` ${g.scoreMap}` : ""} · ${g.carte} · ${g.file}` })),
    );
  }
  function maSemaine(m) {
    const s = m.semaine || {};
    const parties = s.parties || [];
    const comptees = new Set([...parties].sort((a, b) => b.points - a.points || b.score - a.score).slice(0, infos()?.meilleures || 10).map((g) => g.fin));
    const mo = m.moyennes;
    return [
      tete("Ta semaine sur VALORANT", el("span", { class: "etiquette fm-riot", title: "Ton Riot ID (toi seul le vois)", text: m.riot })),
      el("div", { class: "fm-stats" },
        el("div", {}, el("b", { text: s.rang ? `${s.rang}ᵉ` : "–" }), el("span", { text: s.rang ? `sur ${s.sur}` : "pas encore classé" })),
        el("div", {}, el("b", { text: nombre(s.points || 0) }), el("span", { text: "points" })),
        el("div", {}, el("b", { text: nombre(parties.length) }), el("span", { text: `game${parties.length > 1 ? "s" : ""} notée${parties.length > 1 ? "s" : ""}` })),
      ),
      mo ? el("ul", { class: "va-moyennes", "aria-label": "Tes moyennes sur deux semaines" },
        el("li", {}, el("b", { text: nombre(mo.acs) }), el("span", { text: "ACS moyen" })),
        el("li", {}, el("b", { text: pct(mo.hs) }), el("span", { text: "headshots" })),
        el("li", {}, el("b", { text: pct(mo.kast) }), el("span", { text: "rounds utiles" })),
        el("li", {}, el("b", { text: nombre(mo.fb) }), el("span", { text: "first bloods" })),
        el("li", {}, el("b", { text: nombre(mo.objectif) }), el("span", { text: "plants et désamorçages" })),
        el("li", {}, el("b", { text: mo.agents?.[0]?.agent || "–" }), el("span", { text: "ton agent le plus joué" })),
      ) : null,
      parties.length
        ? el("div", { class: "fm-games" }, parties.slice(0, 12).map((g) => el("details", { class: "va-pourquoi" },
          el("summary", { title: "Pourquoi cette note ?" },
            el("div", { class: `fm-game ${g.victoire === true ? "gagnee" : "perdue"}${comptees.has(g.fin) ? "" : " hors-compte"}` },
              visage(g, "fl-champ-petit"),
              el("span", { class: "fm-game-txt" }, el("strong", { text: `${g.agent} · ${kda(g)}` }), el("small", { text: `${g.roleNom} · ${resultat(g).toLowerCase()} · ${ilYa(g.fin)}` })),
              tampon(g.note, "fl-note-petite"),
              el("b", { class: "fm-game-pts", text: `+${g.points}` }),
            ),
          ),
          detailNote(g),
        )))
        : el("p", { class: "note fm-attente", text: "Lance une compétition, une non classée ou une Swiftplay : elle apparaît ici 5 à 15 minutes après la fin, avec sa note. Touche une game pour voir pourquoi elle a cette note." }),
      message ? el("p", { class: `fm-message${message.erreur ? " erreur" : ""}`, role: message.erreur ? "alert" : "status", text: message.texte }) : null,
      confirmer
        ? el("div", { class: "fm-confirmer", role: "group", "aria-label": "Retirer ton compte VALORANT" },
          el("p", { text: "Retirer ton compte efface tes games et tes points. Sûr ?" }),
          el("div", { class: "fm-actions" },
            el("button", { class: "btn btn-plein btn-petit", type: "button", disabled: occupe, onclick: retirer, text: "Oui, retirer" }),
            el("button", { class: "btn btn-contour btn-petit", type: "button", onclick: () => { confirmer = false; rendreMoi(); }, text: "Annuler" }),
          ))
        : el("button", { class: "fm-retirer", type: "button", onclick: () => { confirmer = true; rendreMoi(); }, text: "Retirer mon compte VALORANT" }),
    ];
  }
  function rendreMoi() {
    const z = $("va-moi");
    if (!z) return;
    const ouvert = Boolean(infos()?.actif || moi?.actif);
    const cle = JSON.stringify([connecte, pasMembre, moi, message, occupe, confirmer, ouvert, donnees ? 1 : 0]);
    if (deja.moi === cle) return;
    deja.moi = cle;
    // une game ouverte (« pourquoi cette note ? ») reste ouverte
    const ouvertes = [...z.querySelectorAll("details[open]")].map((d) => d.querySelector(".fm-game-txt")?.textContent);
    let contenu;
    if (!donnees && connecte === null) contenu = [el("p", { class: "note", text: "Chargement…" })];
    else if (!ouvert && !moi?.lie) contenu = [tete("Ton compte VALORANT"), el("p", { text: "Valorant des potes ouvre très bientôt : tu pourras relier ton compte ici, et tes games seront notées toutes seules." }), message ? el("p", { class: "fm-message", text: message.texte }) : null];
    else if (pasMembre) contenu = [tete("Ton compte VALORANT"), el("p", { text: "Rejoins le Discord Barhaw pour entrer dans Valorant des potes." }), el("a", { class: "btn btn-plein", href: "/#discord", text: "Rejoindre le Discord" })];
    else if (moi?.lie) contenu = maSemaine(moi);
    else contenu = relier();
    vider(z, ...contenu);
    for (const d of z.querySelectorAll("details")) if (ouvertes.includes(d.querySelector(".fm-game-txt")?.textContent)) d.open = true;
  }
  async function demander(action) {
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await r.json().catch(() => ({ erreur: "Réponse illisible, réessaie." }));
      if (r.status === 401) { connecte = false; moi = null; return d; }
      connecte = true;
      pasMembre = d.erreur === "pas-membre";
      if (d.valorant) moi = d.valorant;
      return d;
    } catch {
      return { erreur: "reseau", texte: "Impossible de joindre le site. Vérifie ta connexion." };
    }
  }
  async function retirer() {
    if (occupe) return;
    occupe = true;
    rendreMoi();
    const d = await demander("valorant-retirer");
    occupe = false;
    confirmer = false;
    message = d.ok ? { texte: "C'est fait : ton compte est retiré et tes games sont effacées." } : { texte: d.texte || "Ça n'a pas marché, réessaie dans un moment.", erreur: true };
    rendreMoi();
    charger();
  }

  // le retour de Discord : ?liaison=…
  const LIAISONS = {
    ok: ["C'est relié ! Tes prochaines games compteront, 5 à 15 minutes après leur fin.", false],
    "pas-riot": ["Aucun compte Riot vérifié n'est connecté à ton Discord. Dans Discord : Paramètres → Connexions → Riot Games, puis recommence.", true],
    introuvable: ["Ce compte Riot n'a pas encore de profil VALORANT. Lance une partie, puis recommence.", true],
    pris: ["Ce compte VALORANT est déjà relié à un autre membre du Discord.", true],
    deja: ["Un autre compte VALORANT est déjà relié. Retire-le d'abord pour en mettre un autre.", true],
    "pas-membre": ["Rejoins le Discord Barhaw pour entrer dans Valorant des potes.", true],
    "pas-cle": ["Valorant des potes ouvre très bientôt : rien n'a été enregistré, reviens dans un moment.", true],
    "riot-id": ["Le compte Riot de ton Discord n'a pas de Riot ID lisible. Reconnecte-le dans Discord, puis recommence.", true],
    annule: ["Liaison annulée : rien n'a été enregistré.", true],
    accord: ["Coche la case d'accord avant de relier ton compte.", true],
    escale: ["Le bot fait une petite pause. Réessaie dans quelques minutes.", true],
  };
  function lireRetour() {
    const u = new URL(location.href);
    const l = u.searchParams.get("liaison");
    if (!l) return;
    const [texte, erreur] = LIAISONS[l] || ["Les données VALORANT ne répondent pas pour l'instant. Réessaie dans un moment.", true];
    message = { texte, erreur };
    u.searchParams.delete("liaison");
    history.replaceState(null, "", u.pathname + u.search + u.hash);
  }

  function rendre() {
    rendreUne();
    rendrePodium();
    rendreRegles();
    rendreFil();
    rendreMoi();
  }
  async function chargerPublic() {
    try {
      const r = await fetch("/api/public", { headers: { Accept: "application/json" } });
      const d = await r.json();
      if (d && !d.horsLigne) donnees = d;
      else if (!donnees) donnees = { valorant: null };
    } catch {
      if (!donnees) donnees = { valorant: null };
    }
  }
  async function charger() {
    await Promise.all([chargerPublic(), demander("valorant")]);
    rendre();
  }

  function demarrer() {
    lireRetour();
    rendre();
    charger();
    // la page reste ouverte : les nouvelles games arrivent toutes seules (le bot les a déjà, la page ne fait que lire)
    setInterval(() => { if (!document.hidden) charger(); }, 60_000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) charger(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer);
  else demarrer();
})();
