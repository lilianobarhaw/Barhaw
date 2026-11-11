// GRAND LINE en fête (V4) : tout ce qui donne de la vie à la carte en 3D, en plus de la mer qui vit.
//   · le jour et la nuit (à l'heure de Paris : c'est site.js qui donne l'ambiance) : la scène est toujours dessinée de jour,
//     puis teintée (aube, crépuscule, nuit bleue) ; là où il y a une lumière, les vraies couleurs reviennent ;
//   · les lumières : les lanternes des îles (trouvées dans les modèles : tout ce qui est en matière « brillante »),
//     les navires, les barques, le sillage qui luit la nuit, le faisceau du phare ;
//   · le ciel : les feux d'artifice, les étoiles filantes, l'aurore au nord ;
//   · les modèles de fete-mer.glb (outils/blender/barhaw_fete_mer_v4.py) : la Baleine étoilée qui accompagne le navire et
//     fait son grand saut, le Nuage-Voilier, la barge des feux d'artifice, les lanternes qu'on lâche le soir, les méduses,
//     l'arène des défis (balises, guirlandes, le ponton du crabe arbitre) et la couronne du vainqueur ;
//   · un défi entre commus : les navires quittent leur route, se font face dans l'arène et se tirent dessus (à côté, toujours).
// Ce module ne connaît pas la carte : js/grandline-3d.js lui passe ce dont il a besoin (ctx) et l'appelle aux bons moments.
import * as THREE from "./three-r170.module.min.js";

const TEINTES = { lumiere: [1, 0.8, 0.46], luciole: [1, 0.93, 0.42], lave: [1, 0.46, 0.14], feu: [1, 0.55, 0.16], spectre: [0.42, 1, 0.74], astre: [0.55, 0.88, 1] };
const CHAUD = TEINTES.lumiere;
const CYAN = [0.3, 0.92, 1];
const ROSE = [1, 0.31, 0.6];
const FEUX = [[1, 0.31, 0.6], [1, 0.83, 0.42], [0.7, 0.42, 1], [0.25, 0.9, 0.85], [1, 1, 0.94], [1, 0.42, 0.3], [0.55, 1, 0.5]];
const MAX_LUM = 384;
const borne = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lisse = (a, b, x) => { const t = borne((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const versAngle = (a, b, t) => a + (((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI) * t;
const grainDe = (texte) => { let h = 7; for (const c of String(texte)) h = (h * 31 + c.charCodeAt(0)) % 2147483000; return h + 11; };

// ---------- le masque des lumières : des ronds doux, ajoutés les uns aux autres (dessinés à part, en petit) ----------
function creerMasque() {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const centre = new THREE.InstancedBufferAttribute(new Float32Array(MAX_LUM * 4), 4); // x, y, z, taille
  const couleur = new THREE.InstancedBufferAttribute(new Float32Array(MAX_LUM * 4), 4); // r, v, b ; à plat sur la mer (1) ou face à nous (0)
  centre.setUsage(THREE.DynamicDrawUsage);
  couleur.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("aCentre", centre);
  geo.setAttribute("aCouleur", couleur);
  geo.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute vec4 aCentre; attribute vec4 aCouleur;
      varying vec2 vP; varying vec3 vC;
      void main() {
        vP = position.xy;
        vC = aCouleur.rgb;
        if (aCouleur.a > 0.5) gl_Position = projectionMatrix * viewMatrix * vec4(aCentre.xyz + vec3(position.x, 0.0, position.y) * aCentre.w, 1.0);
        else { vec4 mv = viewMatrix * vec4(aCentre.xyz, 1.0); mv.xy += position.xy * aCentre.w; gl_Position = projectionMatrix * mv; }
      }`,
    fragmentShader: `
      varying vec2 vP; varying vec3 vC;
      void main() { float f = smoothstep(1.0, 0.0, length(vP)); f *= f; gl_FragColor = vec4(vC * f, f); }`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  let n = 0;
  return {
    scene,
    vider() { n = 0; },
    pousser(x, y, z, taille, c, force = 1, plat = 1) {
      if (n >= MAX_LUM || force <= 0.01 || taille <= 0.01) return;
      centre.array.set([x, y, z, taille], n * 4);
      couleur.array.set([c[0] * force, c[1] * force, c[2] * force, plat], n * 4);
      n++;
    },
    fin() { geo.instanceCount = n; centre.needsUpdate = true; couleur.needsUpdate = true; return n; },
    nombre: () => n,
    detruire() { geo.dispose(); mat.dispose(); },
  };
}

// ---------- la teinte de l'heure : la scène dessinée de jour devient aube, crépuscule ou nuit ----------
function creerTeinte() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const uniforms = { tScene: { value: null }, tLum: { value: null }, uNuit: { value: 0 }, uOr: { value: 0 }, uTeinte: { value: new THREE.Vector3(1.1, 0.82, 0.62) }, uOmbre: { value: new THREE.Vector3(0.3, 0.16, 0.42) }, uMilieu: { value: new THREE.Vector3(0.98, 0.52, 0.5) }, uClair: { value: new THREE.Vector3(1, 0.9, 0.62) }, uLampes: { value: 0 }, uEclair: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: "varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `
      uniform sampler2D tScene; uniform sampler2D tLum;
      uniform float uNuit; uniform float uOr; uniform float uLampes; uniform float uEclair; uniform vec3 uTeinte; uniform vec3 uOmbre; uniform vec3 uMilieu; uniform vec3 uClair;
      varying vec2 vUv;
      void main() {
        vec4 s = texture2D(tScene, vUv);
        vec3 c = s.rgb;
        vec3 lum = texture2D(tLum, vUv).rgb;
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        // l'aube, le crépuscule : tout se réchauffe, et l'image glisse vers les couleurs du ciel (les ombres violettes, le rose, l'or)
        vec3 ciel = l < 0.5 ? mix(uOmbre, uMilieu, l * 2.0) : mix(uMilieu, uClair, l * 2.0 - 1.0);
        vec3 dore = mix(c * uTeinte, ciel, 0.36);
        // la nuit : plus de contraste, moins de couleur, tout en bleu ; les blancs restent des reflets de lune
        vec3 n = pow(c, vec3(1.35));
        n = mix(vec3(dot(n, vec3(0.299, 0.587, 0.114))), n, 0.55) * vec3(0.27, 0.38, 0.72) + vec3(0.018, 0.024, 0.06) * s.a;
        vec3 r = mix(mix(c, dore, uOr), n, uNuit);
        // l'éclair de la tempête rend un instant ses couleurs à la mer
        r = mix(r, c * 1.08, uEclair * uNuit * 0.85);
        // les lumières : sous une lanterne, les vraies couleurs reviennent, réchauffées ; autour, un halo
        float k = clamp(max(lum.r, max(lum.g, lum.b)), 0.0, 1.0);
        vec3 eclaire = mix(c, vec3(l), 0.3) * (lum * 1.55 + 0.1);
        r = mix(r, max(r, eclaire), smoothstep(0.0, 0.55, k) * uLampes);
        r += lum * lum * 0.24 * uLampes;
        // les coins s'assombrissent un peu, la nuit
        r *= 1.0 - uNuit * 0.28 * smoothstep(0.45, 1.05, length(vUv - 0.5) * 1.35);
        gl_FragColor = vec4(r, s.a);
      }`,
    depthTest: false, depthWrite: false, blending: THREE.NoBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  return { scene, camera: new THREE.Camera(), uniforms, detruire() { geo.dispose(); mat.dispose(); } };
}

// ---------- les étincelles : feux d'artifice, étoiles filantes, gerbes d'eau, fumée des canons (un seul nuage de points) ----------
function creerEtincelles(N, ciel) {
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 4), tai = new Float32Array(N);
  const P = Array.from({ length: N }, () => ({ vie: 0 }));
  const geo = new THREE.BufferGeometry();
  const attr = (a, k) => { const b = new THREE.BufferAttribute(a, k); b.setUsage(THREE.DynamicDrawUsage); return b; };
  geo.setAttribute("position", attr(pos, 3));
  geo.setAttribute("aCouleur", attr(col, 4));
  geo.setAttribute("aTaille", attr(tai, 1));
  const uniforms = { uEchelle: { value: 900 }, uOpaque: { value: 0.9 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      attribute vec4 aCouleur; attribute float aTaille; uniform float uEchelle; varying vec4 vC;
      void main() { vC = aCouleur; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aTaille * uEchelle / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
    // de jour : des points pleins (on les voit sur la mer claire) ; la nuit : de la lumière qui s'ajoute
    fragmentShader: `
      uniform float uOpaque; varying vec4 vC;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, d); a *= a * vC.a;
        vec3 c = mix(vC.rgb, vec3(1.0), smoothstep(0.55, 0.0, d) * 0.6);
        gl_FragColor = vec4(c * a, a * uOpaque);
      }`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  ciel.add(points);
  let curseur = 0, vivants = 0;
  // o : { x, y, z, vx, vy, vz, duree, c: [r, v, b], t (taille), frein, poids, genre (0 étincelle, 1 fumée, 2 eau), pas(p, dt), suite(p) }
  function naitre(o) {
    for (let k = 0; k < 32; k++) { curseur = (curseur + 1) % N; if (P[curseur].vie <= 0) break; }
    const p = P[curseur];
    p.x = o.x; p.y = o.y; p.z = o.z; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.duree = o.duree || 1; p.vie = p.duree; p.c = o.c || FEUX[4]; p.t = o.t ?? 0.6; p.frein = o.frein ?? 1.5; p.poids = o.poids ?? 4;
    p.genre = o.genre || 0; p.pas = o.pas || null; p.suite = o.suite || null; p.ph = Math.random() * 6.28; p.force = o.force ?? 1;
    return p;
  }
  function maj(dt) {
    vivants = 0;
    for (let k = 0; k < N; k++) {
      const p = P[k];
      if (p.vie <= 0) { if (tai[k]) { tai[k] = 0; col[k * 4 + 3] = 0; } continue; }
      p.vie -= dt;
      if (p.vie <= 0 || (p.genre === 2 && p.y < 0 && p.vy < 0)) { p.vie = 0; tai[k] = 0; col[k * 4 + 3] = 0; if (p.suite) p.suite(p); continue; }
      vivants++;
      const f = Math.exp(-p.frein * dt);
      p.vx *= f; p.vz *= f; p.vy = p.vy * f - p.poids * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.pas) p.pas(p, dt);
      const u = 1 - p.vie / p.duree;
      let a, t = p.t;
      if (p.genre === 1) { a = Math.sin(u * Math.PI) * 0.42; t = p.t * (0.6 + u * 1.6); }
      else if (p.genre === 2) { a = 0.95 * (1 - u * u); t = p.t * (1 - u * 0.4); }
      else { a = Math.pow(1 - u, 1.4) * (u > 0.55 ? 0.7 + 0.3 * Math.sin(p.vie * 46 + p.ph) : 1); t = p.t * (1 - u * 0.45); }
      pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
      col[k * 4] = p.c[0]; col[k * 4 + 1] = p.c[1]; col[k * 4 + 2] = p.c[2]; col[k * 4 + 3] = a * p.force;
      tai[k] = t;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aCouleur.needsUpdate = true;
    geo.attributes.aTaille.needsUpdate = true;
    points.visible = vivants > 0;
  }
  return { naitre, maj, uniforms, vivants: () => vivants, detruire() { geo.dispose(); mat.dispose(); } };
}

export function creerFete(ctx) {
  const { renderer, scene, camera, iles, flotte, porteur, cam, leger, v4, v3, hasard, cap, pointDeMer, lireV4, sceneGLB, habiller, animateurs, matiere, BRILLANTS, eclabousse, jetDeau, sillages, eclabs, lanternes, uniformsMer, MER_X, MER_Z, erreurs } = ctx;
  const ciel = new THREE.Scene(); // ce qui se dessine par-dessus, sans être teinté : les feux d'artifice, l'aurore, le faisceau du phare
  const lum = creerMasque();
  const et = creerEtincelles(leger ? 420 : 1000, ciel);
  const lumVives = []; // des fonctions (s) qui posent les lumières qui bougent
  const vieFete = []; // des fonctions (s, dt) : ce qui bouge
  const eclats = []; // les éclairs de lumière (un bouquet, un coup de canon) : { x, y, z, c, r, age, duree }
  let donnees = null;
  let temps = 0;

  // ---------- l'ambiance : le jour, l'aube, le crépuscule, la nuit ----------
  const amb = { nuit: 0, or: 0, phase: "jour" };
  const voulu = { nuit: 0, or: 0, phase: "jour" };
  let premiere = true;
  function ambiance(a) {
    if (!a) return { ...voulu };
    voulu.nuit = borne(Number(a.nuit) || 0);
    voulu.or = borne(Number(a.or) || 0);
    voulu.phase = ["jour", "aube", "crepuscule", "nuit"].includes(a.phase) ? a.phase : voulu.nuit > 0.5 ? "nuit" : voulu.or > 0.3 ? "crepuscule" : "jour";
    voulu.rapide = Boolean(a.rapide);
    if (premiere || a.vite) { amb.nuit = voulu.nuit; amb.or = voulu.or; premiere = false; }
    if (voulu.phase !== amb.phase) { amb.phase = voulu.phase; ctx.surAmbiance?.(amb.phase); }
    return { ...voulu };
  }
  // les lampes s'allument dès le crépuscule
  const lampes = () => borne(amb.nuit + amb.or * 0.6);

  // ---------- les lumières ----------
  const lampe = (x, y, z, r, c, f = 1) => { lum.pousser(x, Math.max(0.2, y - 1.2), z, r * 1.7, c, f * 0.5, 1); lum.pousser(x, y, z, r * 0.6, c, f, 0); };
  // dans un modèle : tout ce qui est en matière brillante (lanternes, fenêtres, lave, braises…), regroupé par paquets
  const pt = new THREE.Vector3();
  function pointsBrillants(racine, pas = 2.6, max = 10) {
    racine.updateWorldMatrix(true, true);
    const amas = new Map();
    racine.traverse((o) => {
      if (!o.isMesh || !BRILLANTS.has(o.userData.matiere)) return;
      const p = o.geometry.attributes.position;
      const saut = Math.max(1, Math.floor(p.count / 160));
      for (let k = 0; k < p.count; k += saut) {
        pt.fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld);
        const cle = `${Math.round(pt.x / pas)},${Math.round(pt.y / pas)},${Math.round(pt.z / pas)},${o.userData.matiere}`;
        let a = amas.get(cle);
        if (!a) amas.set(cle, (a = { x: 0, y: 0, z: 0, n: 0, m: o.userData.matiere }));
        a.x += pt.x; a.y += pt.y; a.z += pt.z; a.n++;
      }
    });
    return [...amas.values()].sort((a, b) => b.n - a.n).slice(0, max).map((a) => ({ x: a.x / a.n, y: a.y / a.n, z: a.z / a.n, m: a.m }));
  }
  function eclairerIle(i, modele) {
    try {
      const pts = pointsBrillants(modele, 2.6, leger ? 6 : 10);
      i.lumieres = pts.map((p) => ({ x: p.x, y: p.y, z: p.z, c: TEINTES[p.m] || CHAUD, r: p.m === "lave" ? 4.4 : 3.3, ph: (p.x * 7.1 + p.z * 3.3) % 6.28 }));
      i.lampe = pts.length ? pts.reduce((a, b) => (b.y > a.y ? b : a)) : null;
    } catch (e) { erreurs.push(`lumières ${i.id} : ${e.message}`); }
  }
  function poserLumieres(s) {
    lum.vider();
    const L = lampes();
    if (L < 0.01) return lum.fin();
    for (const i of iles.values()) {
      if (!i.visible || !i.groupe.visible || !i.lumieres?.length) continue;
      lum.pousser(i.x, 0.3, i.z, i.r * 1.6, CHAUD, 0.2, 1);
      for (const l of i.lumieres) lampe(l.x, l.y, l.z, l.r, l.c, 0.86 + Math.sin(s * 3.1 + l.ph) * 0.1);
    }
    // le navire qu'on regarde et les autres : une lanterne à bord
    lampe(porteur.position.x, 3.6, porteur.position.z, 7, CHAUD, 1.15);
    for (const f of flotte.values()) lampe(f.porteur.position.x, 3.4, f.porteur.position.z, 6.4, CHAUD, 1.05);
    // les barques, les marchands, les bouées de la mer qui vit
    for (const l of lanternes) if (l.g.visible) lampe(l.g.position.x, l.y, l.g.position.z, l.r, CHAUD, l.clignote ? 0.6 + Math.sin(s * 2.4 + l.g.position.x) * 0.35 : 0.9);
    // la mer luit là où on la remue : le sillage, les éclaboussures
    for (const w of sillages) if (w.material.opacity > 0.04) lum.pousser(w.position.x, 0.2, w.position.z, 1.5 * w.scale.x, CYAN, w.material.opacity * 1.5 * amb.nuit, 1);
    for (const r of eclabs) if (r.material.opacity > 0.04) lum.pousser(r.position.x, 0.2, r.position.z, 1.3 * r.scale.x, CYAN, r.material.opacity * 1.3 * amb.nuit, 1);
    // ce qui se passe en mer
    const ev = ctx.evenement();
    if (ev?.type === "fantome") lampe(ev.groupe.position.x, 5, ev.groupe.position.z, 7, TEINTES.spectre, 0.8);
    else if (ev?.type === "bouteille") lum.pousser(ev.groupe.position.x, 0.3, ev.groupe.position.z, 4, TEINTES.luciole, 0.7, 1);
    for (const e of eclats) { const k = 1 - e.age / e.duree; lum.pousser(e.x, 0.3, e.z, e.r * (0.6 + 0.4 * k), e.c, k * 0.9, 1); lum.pousser(e.x, e.y, e.z, e.r * 0.5 * k, e.c, k, 0); }
    for (const f of lumVives) f(s, L);
    return lum.fin();
  }

  // ---------- le rendu : de jour, tel quel ; sinon la scène, le masque des lumières, puis la teinte ----------
  let post = null;
  const px = new THREE.Vector2();
  function preparerPost() {
    renderer.getDrawingBufferSize(px);
    const aa = Boolean(renderer.getContextAttributes?.()?.antialias);
    const cibleScene = new THREE.WebGLRenderTarget(px.x, px.y, { samples: aa ? 4 : 0, depthBuffer: true });
    const cibleLum = new THREE.WebGLRenderTarget(Math.ceil(px.x / 2), Math.ceil(px.y / 2), { depthBuffer: false });
    const teinte = creerTeinte();
    teinte.uniforms.tScene.value = cibleScene.texture;
    teinte.uniforms.tLum.value = cibleLum.texture;
    return { cibleScene, cibleLum, teinte, l: px.x, h: px.y };
  }
  let eclair = 0;
  let nbLum = 0;
  function rendre(s) {
    const actif = amb.nuit > 0.008 || amb.or > 0.008;
    if (actif) {
      post ||= preparerPost();
      renderer.getDrawingBufferSize(px);
      if (post.l !== px.x || post.h !== px.y) { post.l = px.x; post.h = px.y; post.cibleScene.setSize(px.x, px.y); post.cibleLum.setSize(Math.ceil(px.x / 2), Math.ceil(px.y / 2)); }
      nbLum = poserLumieres(s);
      renderer.setRenderTarget(post.cibleLum);
      renderer.render(lum.scene, camera);
      renderer.setRenderTarget(post.cibleScene);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      const u = post.teinte.uniforms;
      u.uNuit.value = amb.nuit;
      u.uOr.value = amb.or;
      u.uLampes.value = lampes();
      u.uEclair.value = eclair;
      if (amb.phase === "aube") { u.uTeinte.value.set(1.06, 0.9, 0.86); u.uOmbre.value.set(0.28, 0.22, 0.5); u.uMilieu.value.set(0.98, 0.62, 0.68); u.uClair.value.set(1, 0.93, 0.8); }
      else { u.uTeinte.value.set(1.1, 0.83, 0.62); u.uOmbre.value.set(0.3, 0.16, 0.42); u.uMilieu.value.set(0.98, 0.52, 0.5); u.uClair.value.set(1, 0.9, 0.62); }
      renderer.render(post.teinte.scene, post.teinte.camera);
    } else {
      nbLum = 0;
      renderer.render(scene, camera);
    }
    if (et.vivants() || cielVisible) {
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(ciel, camera);
      renderer.autoClear = true;
    }
  }

  // ---------- les feux d'artifice ----------
  const attente = []; // les fusées à tirer : { t, x, z, … }
  function eclat(x, y, z, c, r = 16, duree = 0.7) { if (eclats.length < 14) eclats.push({ x, y, z, c, r, duree, age: 0 }); }
  const dr = new THREE.Vector3(), haut = new THREE.Vector3();
  function bouquet(x, y, z, c, style) {
    const c2 = FEUX[Math.floor(Math.random() * FEUX.length)];
    const nb = leger ? 34 : 64;
    const tirer = (vx, vy, vz, cc, o = {}) => et.naitre({ x, y, z, vx, vy, vz, c: cc, duree: 1.2 + Math.random() * 0.6, t: 0.7, frein: 1.7, poids: 2.6, ...o });
    if (style === "anneau") {
      const a0 = Math.random() * 6.28, incl = (Math.random() - 0.5) * 1.2;
      for (let k = 0; k < nb * 0.7; k++) { const a = a0 + (k / (nb * 0.7)) * 6.283; tirer(Math.cos(a) * 9, Math.sin(a) * Math.sin(incl) * 9, Math.sin(a) * Math.cos(incl) * 9, c); }
      for (let k = 0; k < nb * 0.3; k++) { const a = Math.random() * 6.28, b = Math.acos(Math.random() * 2 - 1), v = 3.5; tirer(Math.sin(b) * Math.cos(a) * v, Math.cos(b) * v, Math.sin(b) * Math.sin(a) * v, c2); }
    } else if (style === "coeur" || style === "etoile") {
      // une forme face à nous : un cœur, une étoile
      dr.setFromMatrixColumn(camera.matrixWorld, 0);
      haut.setFromMatrixColumn(camera.matrixWorld, 1);
      for (let k = 0; k < nb; k++) {
        const t = (k / nb) * 6.283;
        let fx, fy;
        if (style === "coeur") { fx = Math.pow(Math.sin(t), 3); fy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16; }
        else { const q = (t / 6.283) * 5, i = Math.floor(q), f = q - i; const r = 1 - 0.58 * (1 - Math.abs(f - 0.5) * 2); const a = Math.PI / 2 + ((i + f) / 5) * 6.283; fx = Math.cos(a) * r; fy = Math.sin(a) * r; }
        const v = 8.5;
        tirer((dr.x * fx + haut.x * fy) * v, (dr.y * fx + haut.y * fy) * v, (dr.z * fx + haut.z * fy) * v, c, { poids: 1.2, duree: 1.6 + Math.random() * 0.3 });
      }
    } else if (style === "saule") {
      for (let k = 0; k < nb; k++) { const a = Math.random() * 6.28, b = Math.acos(Math.random() * 2 - 1), v = 5 + Math.random() * 2.5; tirer(Math.sin(b) * Math.cos(a) * v, Math.cos(b) * v + 2, Math.sin(b) * Math.sin(a) * v, FEUX[1], { duree: 2.3 + Math.random() * 0.7, frein: 0.9, poids: 3.4, t: 0.55 }); }
    } else {
      for (let k = 0; k < nb; k++) { const a = Math.random() * 6.28, b = Math.acos(Math.random() * 2 - 1), v = 7 + Math.random() * 2.5; tirer(Math.sin(b) * Math.cos(a) * v, Math.cos(b) * v, Math.sin(b) * Math.sin(a) * v, k % 5 ? c : c2); }
    }
    eclat(x, y, z, c, 18, 0.8);
  }
  function fusee(o) {
    const h = o.h ?? 13 + Math.random() * 7;
    const T = 0.9 + Math.random() * 0.25;
    const c = o.c || FEUX[Math.floor(Math.random() * FEUX.length)];
    const styles = ["boule", "boule", "anneau", "saule", "coeur", "etoile"];
    const style = o.style || styles[Math.floor(Math.random() * styles.length)];
    let trait = 0;
    et.naitre({
      x: o.x, y: o.y ?? 0.8, z: o.z, vx: (Math.random() - 0.5) * 2, vy: h / T, vz: (Math.random() - 0.5) * 2, duree: T, c: FEUX[1], t: 0.55, frein: 0, poids: 0,
      pas: (p, dt) => { trait += dt; if (trait > 0.035) { trait = 0; et.naitre({ x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 0.8, vy: -1, vz: (Math.random() - 0.5) * 0.8, duree: 0.45, c: FEUX[1], t: 0.34, poids: 2 }); } },
      suite: (p) => bouquet(p.x, p.y, p.z, c, style),
    });
  }
  // un feu d'artifice autour d'un point : n fusées, l'une après l'autre
  function feter(x, z, n = 6, o = {}) {
    for (let k = 0; k < n; k++) attente.push({ t: temps + k * (0.28 + Math.random() * 0.35), x: x + (Math.random() - 0.5) * (o.large ?? 9), z: z + (Math.random() - 0.5) * (o.large ?? 9), ...o });
  }
  // une gerbe d'eau (un boulet qui tombe, la baleine qui retombe)
  function gerbe(x, z, f = 1) {
    const c = amb.nuit > 0.5 ? [0.55, 0.95, 1] : [0.96, 0.99, 1];
    for (let k = 0; k < (leger ? 9 : 16) * Math.min(2, f); k++) {
      const a = Math.random() * 6.28, v = Math.random() * 2.2 * f;
      et.naitre({ x, y: 0.2, z, vx: Math.cos(a) * v, vy: (6 + Math.random() * 5) * Math.sqrt(f), vz: Math.sin(a) * v, duree: 1.4, c, t: 0.55 + Math.random() * 0.3, frein: 0.3, poids: 15, genre: 2 });
    }
    eclabousse(x, z, 1.4 * f);
    if (amb.nuit > 0.3) eclat(x, 0.6, z, CYAN, 5 * f, 0.6);
  }
  function fumee(x, y, z, vx, vz) {
    for (let k = 0; k < 5; k++) et.naitre({ x, y, z, vx: vx * (0.4 + Math.random() * 0.6) + (Math.random() - 0.5), vy: 0.6 + Math.random(), vz: vz * (0.4 + Math.random() * 0.6) + (Math.random() - 0.5), duree: 1.1 + Math.random() * 0.5, c: [0.92, 0.9, 0.88], t: 1.5 + Math.random(), frein: 2.2, poids: -0.4, genre: 1 });
  }

  // ---------- le ciel : l'aurore au nord, le faisceau du phare ----------
  let cielVisible = false;
  const aurores = [];
  const uAurore = { uT: { value: 0 }, uForce: { value: 0 } };
  for (let k = 0; k < (leger ? 2 : 3); k++) {
    const geo = new THREE.PlaneGeometry(150 - k * 26, 11 + k * 2, 60, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...uAurore, uPh: { value: k * 2.1 } },
      vertexShader: `
        uniform float uT; uniform float uPh; varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z += sin(p.x * 0.11 + uT * 0.35 + uPh) * 4.0 + sin(p.x * 0.31 - uT * 0.5 + uPh * 2.0) * 1.6;
          p.y += sin(p.x * 0.07 + uT * 0.22 + uPh) * 1.8;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform float uT; uniform float uPh; uniform float uForce; varying vec2 vUv;
        void main() {
          float rideau = pow(sin(vUv.x * 46.0 + sin(vUv.x * 9.0 + uT * 0.6 + uPh) * 2.6 + uT * 0.8) * 0.5 + 0.5, 2.0) * 0.65 + 0.35;
          float a = smoothstep(0.0, 0.12, vUv.y) * pow(1.0 - vUv.y, 1.5) * rideau * smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
          vec3 c = mix(vec3(0.2, 1.0, 0.62), vec3(0.62, 0.36, 1.0), smoothstep(0.15, 0.9, vUv.y + sin(vUv.x * 7.0 + uPh) * 0.12));
          gl_FragColor = vec4(c * a * uForce * 0.85, 0.0);
        }`,
      transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set((k - 1) * 14, 15 + k * 4, -MER_Z + 4 - k * 5);
    m.frustumCulled = false;
    m.visible = false;
    ciel.add(m);
    aurores.push(m);
  }
  // le faisceau du phare : deux longs pinceaux de lumière qui tournent (posés quand le modèle du Phare est chargé)
  const faisceau = (() => {
    const g = new THREE.Group();
    const long = 44, large = 6.5;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0, long, 0, -large, long, 0, large, 0, 0, 0, -long, 0, large, -long, 0, -large]), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array([1, 0.95, 0.7, 0, 0, 0, 0, 0, 0, 1, 0.95, 0.7, 0, 0, 0, 0, 0, 0]), 3));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    g.add(new THREE.Mesh(geo, mat));
    g.visible = false;
    ciel.add(g);
    return { g, mat };
  })();
  lumVives.push((s, L) => {
    if (!faisceau.g.visible) return;
    const a = faisceau.g.rotation.y, p = faisceau.g.position;
    for (const sens of [1, -1]) for (const [d, r, f] of [[9, 5, 0.5], [18, 6.5, 0.36], [28, 8, 0.22]]) lum.pousser(p.x + Math.cos(a) * d * sens, 0.25, p.z - Math.sin(a) * d * sens, r, CHAUD, f * L, 1);
  });

  // ---------- en live : des anneaux roses qui pulsent sous le navire ----------
  const anneauxLive = new Map();
  const geoLive = new THREE.RingGeometry(3.3, 3.85, 44);
  function anneauLive(cle, p, s, vu) {
    let a = anneauxLive.get(cle);
    if (!a) {
      a = [0, 1].map(() => { const m = new THREE.Mesh(geoLive, new THREE.MeshBasicMaterial({ color: 0xff4f9a, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; scene.add(m); return m; });
      anneauxLive.set(cle, a);
    }
    a.forEach((m, k) => {
      const u = (s * 0.55 + k * 0.5) % 1;
      m.visible = true;
      m.position.set(p.x, 0.13, p.z);
      m.scale.setScalar(0.75 + u * 1.5);
      m.material.opacity = 0.7 * (1 - u);
    });
    vu.add(cle);
  }
  lumVives.push((s, L) => { for (const a of anneauxLive.values()) if (a[0].visible) lum.pousser(a[0].position.x, 0.25, a[0].position.z, 8, ROSE, 0.42 * L, 1); });

  // ---------- un défi : l'arène, les navires face à face ----------
  const arene = { actif: false, cle: "", centre: v3(0, 0), a0: 0, tour: 0, sortie: 0, participants: [], moi: "", gagnant: "", scores: {}, objets: null, prochainTir: 3, feteFaite: "" };
  const poses = new Map(); // l'id d'une commu (« moi » hors de la flotte) → où est vraiment son navire (sa route, ou sa place dans l'arène)
  function majDefi(d) {
    const defi = d.defi && typeof d.defi === "object" ? d.defi : null;
    const moi = d.flotte?.id || "";
    arene.moi = moi;
    arene.scores = defi?.scores || {};
    const presents = defi?.phase === "combat" ? (defi.commus || []).filter((id) => id === moi || flotte.has(id)).slice(0, 6) : [];
    arene.participants = presents;
    const actif = presents.length >= 2;
    // un nouveau défi : l'arène se choisit une place à la première image (quand on sait où sont les navires)
    if (actif && arene.cle !== String(defi.id || "defi")) { arene.cle = String(defi.id || "defi"); arene.aPlacer = true; arene.a0 = hasard(grainDe(arene.cle))() * 6.28; }
    arene.actif = actif;
    // la victoire : la couronne au-dessus du vainqueur, et un grand feu d'artifice la première fois qu'on la voit
    arene.gagnant = defi?.phase === "victoire" && (defi.gagnant === moi || flotte.has(defi.gagnant)) ? String(defi.gagnant) : "";
    if (arene.gagnant && arene.feteFaite !== `${defi.id}:${arene.gagnant}`) { arene.feteFaite = `${defi.id}:${arene.gagnant}`; arene.salve = temps + 1.2; }
  }
  // la place de l'arène : en pleine mer, loin des îles et du bord de la carte, au plus près des navires qui s'affrontent
  function placerArene() {
    let cx = 0, cz = 0, n = 0;
    for (const id of arene.participants) { const q = poses.get(id); if (q) { cx += q.rx; cz += q.rz; n++; } }
    if (n < arene.participants.length) return; // on attend de savoir où ils sont tous
    cx /= n; cz /= n;
    // chaque point de la mer a une note : de la place autour de lui d'abord (jusqu'à tenir toute l'arène), puis la distance aux navires
    let mieux = null;
    for (let x = -(MER_X - 38); x <= MER_X - 38; x += 3) for (let z = -(MER_Z - 36); z <= MER_Z - 32; z += 3) {
      let place = 99;
      for (const i of iles.values()) place = Math.min(place, Math.hypot(x - i.x, z - i.z) - i.r);
      if (place < 9) continue;
      const note = Math.min(place, RAYON_ARENE + 5) * 6 - Math.hypot(x - cx, z - cz);
      if (!mieux || note > mieux.note) mieux = { x, z, note };
    }
    arene.centre.set(mieux ? mieux.x : borne(cx, -40, 40), 0, mieux ? mieux.z : borne(cz, -14, 14));
    arene.aPlacer = false;
  }
  const RAYON_ARENE = 14; // le cercle des balises
  const rayonArene = () => (arene.participants.length <= 2 ? 6.6 : arene.participants.length === 3 ? 7.6 : 8.8); // le cercle des navires
  // où est vraiment ce navire : sur sa route (p, dir), ou à sa place dans l'arène (il y glisse en trois secondes)
  function pose(id, p, dir, dt) {
    let q = poses.get(id);
    if (!q) poses.set(id, (q = { m: 0, x: p.x, z: p.z, cap: 0, roulis: 0, ax: p.x, az: p.z, acap: 0, duree: 3.5 }));
    q.rx = p.x; q.rz = p.z; // sa place sur sa route
    const k = arene.actif && !arene.aPlacer ? arene.participants.indexOf(id) : -1;
    // le trajet dure selon la distance : de trois à huit secondes
    if (k >= 0 && q.m <= 0) q.duree = borne(Math.hypot(arene.centre.x - p.x, arene.centre.z - p.z) / 10, 3, 8);
    q.m = borne(q.m + (k >= 0 ? dt : -dt) / q.duree);
    q.roulis *= Math.exp(-dt * 3.2);
    const route = -Math.atan2(dir.z, dir.x);
    if (k >= 0) {
      const a = arene.a0 + (k / arene.participants.length) * Math.PI * 2 + arene.tour;
      const R = rayonArene();
      q.ax = arene.centre.x + Math.cos(a) * R;
      q.az = arene.centre.z + Math.sin(a) * R;
      q.acap = cap(-Math.cos(a), -Math.sin(a));
    }
    const e = q.m * q.m * (3 - 2 * q.m);
    q.x = p.x + (q.ax - p.x) * e;
    q.z = p.z + (q.az - p.z) * e;
    if (e <= 0) q.cap = route;
    else {
      // en chemin, il regarde où il va ; il ne se tourne vers le centre qu'en arrivant
      const tx = q.ax - p.x, tz = q.az - p.z, loin = Math.hypot(tx, tz) > 8;
      const voyage = loin ? (k >= 0 ? cap(tx, tz) : cap(-tx, -tz)) : route;
      q.cap = versAngle(versAngle(route, voyage, lisse(0, 0.2, e)), q.acap, loin ? lisse(0.78, 1, e) : e);
    }
    q.combat = k >= 0 && q.m > 0.96;
    return q;
  }
  // la caméra, pendant le défi du navire qu'on regarde : toute l'arène
  function cadre() {
    const q = poses.get(arene.moi);
    if (!arene.actif || arene.aPlacer || !q || q.m < 0.05 || !arene.participants.includes(arene.moi)) return null;
    return { x: arene.centre.x, z: arene.centre.z - 1.5, e: q.m * q.m * (3 - 2 * q.m) };
  }
  // les boulets : ils partent d'un navire, passent au-dessus de l'eau et tombent à côté de l'autre
  const boulets = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshBasicMaterial({ color: 0x241c26 })); m.visible = false; scene.add(m); return { m, t: 9, T: 1, de: v3(0, 0), a: v3(0, 0) }; });
  function tirer(s) {
    const prets = [...poses.values()].filter((q) => q.combat);
    if (prets.length < 2) return;
    const de = prets[Math.floor(Math.random() * prets.length)];
    let vers = prets[Math.floor(Math.random() * prets.length)];
    if (vers === de) vers = prets[(prets.indexOf(de) + 1) % prets.length];
    const b = boulets.find((x) => x.t >= x.T);
    if (!b) return;
    const dx = vers.x - de.x, dz = vers.z - de.z, d = Math.hypot(dx, dz) || 1;
    const cote = Math.random() < 0.5 ? -1 : 1;
    const loin = 0.8 + Math.random() * 0.5;
    b.de.set(de.x + (dx / d) * 2.6, 2.1, de.z + (dz / d) * 2.6);
    b.a.set(de.x + dx * loin + (-dz / d) * cote * (3 + Math.random() * 2.5), 0, de.z + dz * loin + (dx / d) * cote * (3 + Math.random() * 2.5));
    b.t = 0;
    b.T = 1.05 + Math.random() * 0.25;
    de.roulis = -0.17;
    eclat(b.de.x, 2.4, b.de.z, TEINTES.feu, 8, 0.35);
    fumee(b.de.x, 2.2, b.de.z, (dx / d) * 3, (dz / d) * 3);
    for (let k = 0; k < 6; k++) et.naitre({ x: b.de.x, y: 2.2, z: b.de.z, vx: (dx / d) * (5 + Math.random() * 4) + (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 2, vz: (dz / d) * (5 + Math.random() * 4) + (Math.random() - 0.5) * 3, duree: 0.35, c: TEINTES.feu, t: 0.5, frein: 3, poids: 2 });
    arene.prochainTir = s + 0.9 + Math.random() * 1.5;
  }

  // ---------- les modèles de fete-mer.glb ----------
  let modeles = null; // { faire, instancier }
  const etatVie = { baleine: null, lanternes: 0, meduses: 0, celestes: 0 };
  const contourInst = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `
      void main() {
        vec4 q = vec4(position + normalize(normal) * 0.035, 1.0);
        #ifdef USE_INSTANCING
          q = instanceMatrix * q;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * q;
      }`,
    fragmentShader: "void main() { gl_FragColor = vec4(0.165, 0.086, 0.047, 1.0); }",
  });
  if (v4) lireV4("fete-mer.glb").then((glb) => {
    if (ctx.detruit()) return;
    const base = sceneGLB(glb);
    base.updateMatrixWorld(true);
    const sortes = new Map();
    for (const o of base.children) { const k = String(o.name).split("_")[0]; if (!sortes.has(k)) sortes.set(k, []); sortes.get(k).push(o); }
    // un modèle animé (une copie habillée)
    const faire = (k, ech = 1) => {
      const modele = new THREE.Group();
      for (const o of sortes.get(k) || []) modele.add(o.clone(true));
      const { bouge } = habiller(modele, { relief: () => null, contour: 0.03, cuit: true });
      const g = new THREE.Group();
      g.add(modele);
      g.scale.setScalar(ech);
      g.rotation.order = "YXZ";
      scene.add(g);
      return { g, modele, anims: animateurs(bouge) };
    };
    // le même modèle posé n fois d'un coup (les lanternes, les balises) : immobile en lui-même, c'est le site qui le déplace
    const SANS = new Set(["lumiere", "luciole", "feu", "spectre", "astre", "corde", "fanion_rose", "fanion_or", "fanion_violet", "fanion_turquoise", "fanion_creme"]);
    const instancier = (k, n, contour = false) => {
      const parts = [];
      const groupe = new THREE.Group();
      for (const o of sortes.get(k) || []) o.traverse((m) => {
        if (!m.isMesh) return;
        const im = new THREE.InstancedMesh(m.geometry, matiere(m.userData.matiere, Boolean(m.geometry.getAttribute("color"))), n);
        im.frustumCulled = false;
        im.count = 0;
        groupe.add(im);
        parts.push({ im, local: m.matrixWorld.clone() });
        if (contour && !SANS.has(m.userData.matiere)) { const c = new THREE.InstancedMesh(m.geometry, contourInst, n); c.frustumCulled = false; c.count = 0; groupe.add(c); parts.push({ im: c, local: m.matrixWorld.clone() }); }
      });
      scene.add(groupe);
      const o3 = new THREE.Object3D();
      o3.rotation.order = "YXZ";
      const mat = new THREE.Matrix4();
      return {
        groupe,
        poser(i, x, y, z, ry = 0, e = 1, rx = 0, rz = 0, ex = e) { o3.position.set(x, y, z); o3.rotation.set(rx, ry, rz); o3.scale.set(ex, e, e); o3.updateMatrix(); for (const p of parts) { mat.multiplyMatrices(o3.matrix, p.local); p.im.setMatrixAt(i, mat); } },
        fin(nb) { for (const p of parts) { p.im.count = nb; p.im.instanceMatrix.needsUpdate = true; } groupe.visible = nb > 0; },
      };
    };
    modeles = { faire, instancier };
    const R = hasard(9191);

    // la Baleine étoilée : elle accompagne le navire qu'on regarde, le dos hors de l'eau ; de temps en temps, son grand saut
    {
      const E = leger ? 0.7 : 0.8;
      const { g, anims } = faire("etoilee", E);
      const jet = jetDeau();
      const centre = v3(porteur.position.x, porteur.position.z);
      const b = { a: 1.2, saut: -1, prochain: 16 + Math.random() * 12, souffle: 7, fond: 0, x: 0, z: 0, y: 0, envie: false, pres: false, sauter() { if (b.saut >= 0) return false; b.envie = true; return true; }, sauts: 0 };
      etatVie.baleine = b;
      const T = 3.7;
      vieFete.push((s, dt) => {
        const cible = cadre() ? arene.centre : porteur.position;
        const dx = cible.x - centre.x, dz = cible.z - centre.z, d = Math.hypot(dx, dz);
        if (d > 0.01) { const pas = Math.min(d, dt * (d > 70 ? 60 : 4.5)); centre.x += (dx / d) * pas; centre.z += (dz / d) * pas; }
        const rr = cadre() ? 27 : 19;
        // sous une île, on ne la voit pas : elle file ressortir de l'autre côté (plus vite encore si elle a envie de sauter)
        b.a += dt * (b.saut >= 0 ? 0.16 : b.pres && b.fond > 0.85 ? (b.envie ? 1.3 : 0.45) : 0.07);
        const x = borne(centre.x + Math.cos(b.a) * rr, -MER_X + 9, MER_X - 9), z = borne(centre.z + Math.sin(b.a) * rr, -MER_Z + 9, MER_Z - 9);
        // près d'une île, elle plonge et passe dessous
        let pres = false;
        for (const i of iles.values()) if (i.groupe.visible && Math.hypot(x - i.x, z - i.z) < i.r + 7) { pres = true; break; }
        b.pres = pres;
        b.fond += ((pres ? 1 : 0) - b.fond) * Math.min(1, dt * 1.2);
        let y = -1.25 * E + Math.sin(s * 0.7) * 0.12 - b.fond * 9, tangage = 0, roulis = 0;
        if (b.saut < 0 && s > b.prochain) b.envie = true;
        if (b.saut < 0 && b.envie && b.fond < 0.05) { b.saut = 0; b.envie = false; }
        if (b.saut >= 0) {
          const u0 = b.saut / T;
          b.saut += dt;
          const u = b.saut / T;
          if (u < 0.18) { const t = u / 0.18; y -= t * 3.2 * E; tangage = t * 0.75; }
          else if (u < 0.82) {
            const t = (u - 0.18) / 0.64;
            y = -4.45 * E + (9 + 4.45 * E) * Math.sin(t * Math.PI);
            tangage = 0.95 - t * 1.9;
            roulis = Math.sin(t * Math.PI) * 0.85;
            if (u0 < 0.26 && u >= 0.26) { gerbe(x, z, 2.2); eclabousse(x, z, 4); }
            if (u0 < 0.74 && u >= 0.74) { gerbe(x, z, 3); eclabousse(x, z, 6); eclabousse(x, z, 3.4); if (amb.nuit > 0.3) eclat(x, 1, z, CYAN, 16, 1); }
          } else { const t = (u - 0.82) / 0.18; y -= (1 - t) * 3.2 * E; tangage = -0.75 * (1 - t); }
          if (u >= 1) { b.saut = -1; b.sauts++; b.prochain = s + 36 + Math.random() * 22; b.souffle = s + 3; }
        } else if (s > b.souffle && b.fond < 0.05) { b.souffle = s + 9 + Math.random() * 6; jet.userData.age = 0; jet.visible = true; }
        g.position.set(x, y, z);
        g.rotation.y = cap(-Math.sin(b.a), Math.cos(b.a));
        g.rotation.z = tangage;
        g.rotation.x = roulis;
        g.visible = y > -7.5;
        b.x = x; b.z = z; b.y = y;
        if (jet.visible) {
          const j = jet.userData;
          j.age += dt;
          const tx = x + Math.cos(-g.rotation.y) * 3 * E, tz = z + Math.sin(-g.rotation.y) * 3 * E;
          const pos = jet.geometry.attributes.position;
          j.graines.forEach(([an, f, h], i) => { const t = Math.min(1, j.age / 1.6); pos.setXYZ(i, tx + Math.cos(an) * f * t * 1.7, 1.2 + h * 5.5 * Math.sin(t * Math.PI * 0.85), tz + Math.sin(an) * f * t * 1.7); });
          pos.needsUpdate = true;
          jet.material.opacity = 0.9 * (1 - Math.min(1, j.age / 1.8));
          if (j.age > 1.8) jet.visible = false;
        }
        for (const f of anims) f(s, dt);
      });
      // la nuit, les étoiles de son dos éclairent l'eau autour d'elle
      lumVives.push((s, L) => {
        if (!g.visible || b.y < -4) return;
        const c = Math.cos(-g.rotation.y), si = Math.sin(-g.rotation.y);
        for (const d of [-3.4, 0.2, 3.6]) lampe(b.x + c * d * E, b.y + 2.6 * E, b.z + si * d * E, 3.4, TEINTES.astre, 0.85 * amb.nuit + 0.15 * L);
      });
    }

    // le Nuage-Voilier : il fait le tour de la carte, haut dans le ciel, son ombre sur la mer
    {
      const { g, anims } = faire("dirigeable", leger ? 0.95 : 1.1);
      const pts = Array.from({ length: 6 }, () => v3((R() * 2 - 1) * (MER_X - 22), (R() * 2 - 1) * (MER_Z - 14))).sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
      const route = new THREE.CatmullRomCurve3(pts, true, "centripetal");
      const long = route.getLength();
      const ombre = new THREE.Mesh(new THREE.CircleGeometry(4, 24), new THREE.MeshBasicMaterial({ color: 0x1a2a44, transparent: true, opacity: 0.13, depthWrite: false }));
      ombre.rotation.x = -Math.PI / 2;
      ombre.scale.set(1.5, 0.6, 1);
      scene.add(ombre);
      const off = R();
      let capAvant = 0;
      const etat = { x: 0, y: 18, z: 0 };
      vieFete.push((s, dt) => {
        const u = (off + (s * 2.3) / long) % 1;
        const p = route.getPointAt(u), t = route.getTangentAt(u);
        etat.x = p.x; etat.z = p.z; etat.y = 18 + Math.sin(s * 0.5) * 0.7;
        g.position.set(etat.x, etat.y, etat.z);
        const c = cap(t.x, t.z);
        const vire = Math.atan2(Math.sin(c - capAvant), Math.cos(c - capAvant)) / Math.max(0.001, dt);
        capAvant = c;
        g.rotation.y = c;
        g.rotation.x += (borne(-vire * 1.6, -0.25, 0.25) - g.rotation.x) * Math.min(1, dt * 2);
        g.rotation.z = Math.sin(s * 0.6) * 0.03;
        ombre.position.set(etat.x + 3, 0.16, etat.z + 2);
        ombre.rotation.z = c;
        for (const f of anims) f(s, dt);
      });
      lumVives.push((s, L) => { lampe(etat.x, etat.y - 2.9, etat.z, 4.2, CHAUD, 0.95); lum.pousser(etat.x, 0.25, etat.z, 8, CHAUD, 0.26 * L, 1); });
    }

    // la barge des feux d'artifice : au mouillage devant le port ; la nuit, elle tire une salve de temps en temps
    const port = iles.get("port");
    if (port) {
      const { g, anims } = faire("barge", 1.05);
      const d = Math.hypot(port.x, port.z) || 1;
      const bx = port.x + (-port.x / d || 1) * (port.r + 8), bz = port.z + (-port.z / d || 0) * (port.r + 8);
      g.position.set(bx, 0, bz);
      g.rotation.y = 0.6;
      let prochaine = 12 + Math.random() * 10;
      arene.barge = { x: bx, z: bz };
      vieFete.push((s, dt) => {
        g.visible = port.groupe.visible;
        if (!g.visible) return;
        g.position.y = Math.sin(s * 1.1) * 0.07;
        g.rotation.x = Math.sin(s * 0.9) * 0.03;
        for (const f of anims) f(s, dt);
        if (s > prochaine && amb.nuit > 0.6 && !ctx.tempete()) { prochaine = s + 24 + Math.random() * 14; feter(bx, bz, leger ? 3 : 4 + Math.floor(Math.random() * 2), { large: 3, y: 2 }); }
      });
      lumVives.push(() => { if (g.visible) { lampe(bx + 2.3, 3, bz - 1.4, 3.4, CHAUD, 0.9); lampe(bx - 1.6, 3.2, bz + 1.2, 3.6, CHAUD, 0.8); } });
    }

    // les lanternes : le soir, on les lâche au port et à la dernière île atteinte ; les unes flottent, les autres s'envolent
    {
      const nF = leger ? 14 : 34, nC = leger ? 8 : 16;
      const carrees = instancier("lanterne", nF), fleurs = instancier("lotus", nF), volantes = instancier("celeste", nC);
      const semis = Array.from({ length: Math.max(nF, nC) }, () => [R(), R(), R(), R()]);
      const pos = Array.from({ length: nF + nC }, () => ({ x: 0, y: 0, z: 0, f: 0 }));
      vieFete.push((s) => {
        const f = lisse(0.12, 0.5, Math.max(amb.nuit, amb.or * 0.95));
        const ou = escales();
        etatVie.lanternes = f > 0.01 && ou.length ? nF : 0;
        etatVie.celestes = f > 0.01 && ou.length ? nC : 0;
        if (f <= 0.01 || !ou.length) { carrees.fin(0); fleurs.fin(0); volantes.fin(0); for (const p of pos) p.f = 0; return; }
        let a = 0, b = 0;
        for (let k = 0; k < nF; k++) {
          const i = ou[k % ou.length], [r1, r2, r3] = semis[k];
          const an = r1 * 6.28 + s * 0.022 * (k % 2 ? 1 : -1), r = i.r + 2.6 + r2 * 8 + Math.sin(s * 0.11 + k) * 0.8;
          const p = pos[k];
          p.x = i.x + Math.cos(an) * r; p.z = i.z + Math.sin(an) * r; p.y = 0.14 + Math.sin(s * 1.3 + k) * 0.05; p.f = f;
          (k % 3 ? carrees : fleurs).poser(k % 3 ? a++ : b++, p.x, p.y, p.z, s * 0.2 * (r3 - 0.5) + k, 1.75 * f, Math.sin(s * 1.1 + k) * 0.06, Math.cos(s * 0.9 + k) * 0.06);
        }
        carrees.fin(a);
        fleurs.fin(b);
        for (let k = 0; k < nC; k++) {
          const i = ou[k % ou.length], [r1, r2, r3, r4] = semis[k];
          const u = (s / 44 + r4) % 1;
          const fondu = lisse(0, 0.06, u) * (1 - lisse(0.8, 1, u));
          const p = pos[nF + k];
          p.x = i.x + (r1 - 0.5) * i.r * 1.2 + u * 13 + Math.sin(s * 0.4 + k) * 0.9;
          p.z = i.z + (r2 - 0.5) * i.r * 1.2 - u * 4 + Math.cos(s * 0.33 + k) * 0.9;
          p.y = 1.5 + u * 30;
          p.f = f * fondu;
          volantes.poser(k, p.x, p.y, p.z, r3 * 6.28, 2.1 * Math.max(0.001, p.f), Math.sin(s * 0.8 + k) * 0.08, 0);
        }
        volantes.fin(nC);
      });
      lumVives.push(() => {
        for (let k = 0; k < nF; k++) { const p = pos[k]; if (p.f > 0.02) { lum.pousser(p.x, 0.2, p.z, 3, CHAUD, 0.62 * p.f, 1); lum.pousser(p.x, 0.6, p.z, 1.1, CHAUD, p.f, 0); } }
        for (let k = nF; k < nF + nC; k++) { const p = pos[k]; if (p.f > 0.02) lum.pousser(p.x, p.y + 0.5, p.z, 1.7, TEINTES.feu, 0.95 * p.f, 0); }
      });
    }

    // les méduses : la nuit, elles montent luire à la surface, par petits bancs
    {
      const n = leger ? 8 : 18;
      const meduses = instancier("meduse", n);
      const bancs = Array.from({ length: 3 }, () => pointDeMer(R, 9));
      const semis = Array.from({ length: n }, () => [R(), R(), R()]);
      const pos = Array.from({ length: n }, () => ({ x: 0, z: 0, f: 0 }));
      vieFete.push((s) => {
        const f = lisse(0.3, 0.7, amb.nuit);
        etatVie.meduses = f > 0.01 ? n : 0;
        if (f <= 0.01) { meduses.fin(0); for (const p of pos) p.f = 0; return; }
        for (let k = 0; k < n; k++) {
          const c = bancs[k % 3], [r1, r2, r3] = semis[k];
          const an = r1 * 6.28 + s * 0.05, r = 1.5 + r2 * 5.5;
          const p = pos[k];
          p.x = c.x + Math.cos(an) * r + Math.sin(s * 0.07 + k) * 1.5; p.z = c.z + Math.sin(an) * r; p.f = f;
          meduses.poser(k, p.x, 0.18 + Math.sin(s * 0.8 + k) * 0.08, p.z, r3 * 6.28, 1.3 * f * (1 + Math.sin(s * 1.6 + r3 * 6.28) * 0.14));
        }
        meduses.fin(n);
      });
      lumVives.push(() => { for (const p of pos) if (p.f > 0.02) lum.pousser(p.x, 0.2, p.z, 2.3, TEINTES.spectre, 0.75 * p.f, 1); });
    }

    // l'arène : un cercle de balises reliées par des guirlandes, le ponton du crabe arbitre ; elle sort de l'eau quand un défi commence
    {
      const N = leger ? 8 : 10, Ra = RAYON_ARENE;
      const balises = instancier("balise", N, true), guirlandes = instancier("guirlande", N, !leger);
      const ponton = faire("ponton", 1.2);
      ponton.g.visible = false;
      const couronne = faire("couronne", 2.3);
      couronne.g.visible = false;
      arene.objets = true;
      const ptsLum = [];
      vieFete.push((s, dt) => {
        arene.sortie = borne(arene.sortie + (arene.actif && !arene.aPlacer ? dt / 2.4 : -dt / 1.8));
        if (arene.actif) arene.tour += dt * 0.05;
        ptsLum.length = 0;
        const e = arene.sortie;
        if (e <= 0.001) { balises.fin(0); guirlandes.fin(0); ponton.g.visible = false; }
        else {
          const c = arene.centre;
          const monte = (k) => { const t = borne(e * 1.6 - k * 0.05); return -6 * Math.pow(1 - t, 3) + Math.sin(t * Math.PI) * 0.5; };
          const corde = 2 * Ra * Math.sin(Math.PI / N);
          for (let k = 0; k < N; k++) {
            const a = arene.a0 + (k / N) * 6.283, a2 = arene.a0 + ((k + 0.5) / N) * 6.283;
            const x = c.x + Math.cos(a) * Ra, z = c.z + Math.sin(a) * Ra, y = monte(k) + Math.sin(s * 1.5 + k) * 0.08;
            balises.poser(k, x, y, z, cap(-Math.cos(a), -Math.sin(a)), 1.25, Math.sin(s * 1.2 + k * 2) * 0.07, Math.cos(s * 1.4 + k) * 0.06);
            ptsLum.push(x, y + 2.3, z);
            const rm = Ra * Math.cos(Math.PI / N);
            guirlandes.poser(k, c.x + Math.cos(a2) * rm, monte(k) + 0.4, c.z + Math.sin(a2) * rm, cap(-Math.sin(a2), Math.cos(a2)), 1.25, 0, 0, corde / 8);
          }
          balises.fin(N);
          guirlandes.fin(N);
          // le ponton : au nord de l'arène (en haut de l'écran), tourné vers le centre
          const px = c.x, pz = c.z - Ra - 4.6;
          ponton.g.visible = true;
          ponton.g.position.set(px, monte(2) * 0.9 + Math.sin(s * 1.1) * 0.06, pz);
          ponton.g.rotation.y = cap(0, 1);
          ponton.g.rotation.x = Math.sin(s * 0.9) * 0.02;
          for (const f of ponton.anims) f(s, dt);
          ptsLum.push(px - 2, 2.6, pz, px + 2, 2.6, pz);
          // les canons
          if (arene.actif && s > arene.prochainTir) { arene.prochainTir = s + 0.5; tirer(s); }
        }
        for (const b of boulets) {
          if (b.t >= b.T) { b.m.visible = false; continue; }
          b.t += dt;
          const u = Math.min(1, b.t / b.T);
          b.m.visible = true;
          b.m.position.set(b.de.x + (b.a.x - b.de.x) * u, b.de.y * (1 - u) + Math.sin(u * Math.PI) * 4.2, b.de.z + (b.a.z - b.de.z) * u);
          if (u >= 1) { b.m.visible = false; gerbe(b.a.x, b.a.z, 1); }
        }
        // la couronne du vainqueur
        const q = arene.gagnant ? poses.get(arene.gagnant) : null;
        couronne.g.visible = Boolean(q);
        if (q) {
          couronne.g.position.set(q.x, 12.5 + Math.sin(s * 1.6) * 0.45, q.z);
          couronne.g.rotation.y = s * 0.9;
          couronne.g.rotation.z = Math.sin(s * 1.1) * 0.08;
          if (arene.salve && s > arene.salve) { arene.salve = 0; feter(q.x, q.z, leger ? 6 : 10, { large: 16 }); arene.prochaineFete = s + 9; }
          if (s > (arene.prochaineFete || 0)) { arene.prochaineFete = s + 6 + Math.random() * 6; feter(q.x, q.z, 2, { large: 14 }); }
        }
      });
      lumVives.push((s) => {
        for (let k = 0; k < ptsLum.length; k += 3) lampe(ptsLum[k], ptsLum[k + 1], ptsLum[k + 2], 3.2, CHAUD, 0.9 * lisse(0.3, 1, arene.sortie));
        if (couronne.g.visible) lampe(couronne.g.position.x, couronne.g.position.y, couronne.g.position.z, 5, TEINTES.luciole, 1);
      });
    }
  }).catch((e) => { erreurs.push(`fete-mer : ${e.message}`); });

  // où lâcher les lanternes : le port et la dernière île atteinte (si on les voit)
  let ouLanternes = [];
  const escales = () => ouLanternes;
  function maj(d) {
    donnees = d;
    majDefi(d);
    const ids = new Set(["port"]);
    const atteinte = d.route?.[d.etape]?.find((x) => x.etat === "atteinte");
    if (atteinte) ids.add(atteinte.id);
    ouLanternes = [...ids].map((id) => iles.get(id)).filter((i) => i && i.groupe.visible !== false);
  }

  // ---------- chaque image ----------
  let prochaineFilante = 6;
  function image(s, dt) {
    temps = s;
    // l'heure change en douceur (une trentaine de secondes pour passer du jour à la nuit, quand on est devant)
    const k = Math.min(1, dt * (voulu.rapide ? 0.9 : 0.09));
    amb.nuit += (voulu.nuit - amb.nuit) * k;
    amb.or += (voulu.or - amb.or) * k;
    if (Math.abs(voulu.nuit - amb.nuit) < 0.002) amb.nuit = voulu.nuit;
    if (Math.abs(voulu.or - amb.or) < 0.002) amb.or = voulu.or;
    eclair += ((ctx.eclair() ? 1 : 0) - eclair) * Math.min(1, dt * 14);
    uniformsMer.uNuit.value = amb.nuit;
    uniformsMer.uOr.value = amb.or;
    uniformsMer.uReflet.value = cam.cible.x + 16;
    for (const id of poses.keys()) if (id !== "moi" && id !== arene.moi && !flotte.has(id)) poses.delete(id);
    if (arene.actif && arene.aPlacer) placerArene();
    for (const f of vieFete) f(s, dt);
    // les anneaux « en live »
    const vus = new Set();
    if (donnees?.live) anneauLive("moi", porteur.position, s, vus);
    for (const [id, f] of flotte) if (f.d?.live) anneauLive(id, f.porteur.position, s, vus);
    for (const [cle, a] of anneauxLive) if (!vus.has(cle)) for (const m of a) m.visible = false;
    // les fusées qui attendent leur tour
    for (let n = attente.length - 1; n >= 0; n--) if (s >= attente[n].t) { fusee(attente[n]); attente.splice(n, 1); }
    // les étoiles filantes, la nuit
    if (amb.nuit > 0.7 && s > prochaineFilante && !ctx.tempete()) {
      prochaineFilante = s + 5 + Math.random() * 8;
      const sens = Math.random() < 0.5 ? -1 : 1;
      let trait = 0;
      et.naitre({
        x: cam.cible.x - sens * (20 + Math.random() * 30), y: 24 + Math.random() * 10, z: cam.cible.z - 8 - Math.random() * 26, vx: sens * (42 + Math.random() * 16), vy: -7, vz: 9, duree: 0.85, c: [0.85, 0.95, 1], t: 0.75, frein: 0, poids: 0,
        pas: (p, d2) => { trait += d2; if (trait > 0.016) { trait = 0; et.naitre({ x: p.x, y: p.y, z: p.z, duree: 0.5, c: [0.7, 0.88, 1], t: 0.45, frein: 0, poids: 0.5 }); } },
      });
    }
    for (let n = eclats.length - 1; n >= 0; n--) { eclats[n].age += dt; if (eclats[n].age >= eclats[n].duree) eclats.splice(n, 1); }
    et.maj(dt);
    et.uniforms.uOpaque.value = 0.92 - amb.nuit * 0.8;
    renderer.getDrawingBufferSize(px);
    et.uniforms.uEchelle.value = px.y / (2 * Math.tan((camera.fov * Math.PI) / 360));
    // l'aurore (la nuit, au nord) et le faisceau du phare
    const fa = lisse(0.55, 1, amb.nuit) * (ctx.tempete() ? 0 : 1);
    uAurore.uT.value = s;
    uAurore.uForce.value = fa;
    for (const m of aurores) m.visible = fa > 0.01;
    const phare = iles.get("phare");
    const L = lampes();
    faisceau.g.visible = Boolean(phare?.lampe && phare.visible && phare.groupe.visible && L > 0.03);
    if (faisceau.g.visible) {
      faisceau.g.position.set(phare.lampe.x, phare.lampe.y, phare.lampe.z);
      faisceau.g.rotation.y = s * 0.5;
      faisceau.mat.opacity = 0.34 * L;
    }
    cielVisible = fa > 0.01 || faisceau.g.visible;
  }

  function detruire() {
    post?.cibleScene.dispose();
    post?.cibleLum.dispose();
    post?.teinte.detruire();
    lum.detruire();
    et.detruire();
    contourInst.dispose();
    ciel.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  }

  return {
    ambiance, eclairerIle, maj, image, rendre, pose, cadre, feter, gerbe, detruire,
    saut: () => etatVie.baleine?.sauter() ?? false,
    // pendant un défi : le score de cette commu (pour son étiquette), ou rien
    score: (id) => (arene.actif && arene.participants.includes(id) ? Number(arene.scores[id]) || 0 : null),
    gagnant: () => arene.gagnant,
    etat: () => ({
      phase: amb.phase, nuit: Math.round(amb.nuit * 100) / 100, or: Math.round(amb.or * 100) / 100, teinte: Boolean(post), lumieres: nbLum, etincelles: et.vivants(), feteMer: Boolean(modeles),
      ilesEclairees: [...iles.values()].filter((i) => i.lumieres?.length).map((i) => i.id), phare: Boolean(iles.get("phare")?.lampe), faisceau: faisceau.g.visible, aurore: aurores[0].visible,
      lanternes: etatVie.lanternes, celestes: etatVie.celestes, meduses: etatVie.meduses, baleine: etatVie.baleine ? { saut: etatVie.baleine.saut >= 0, sauts: etatVie.baleine.sauts, x: Math.round(etatVie.baleine.x), z: Math.round(etatVie.baleine.z) } : null,
      arene: { actif: arene.actif, sortie: Math.round(arene.sortie * 100) / 100, participants: [...arene.participants], centre: [Math.round(arene.centre.x), Math.round(arene.centre.z)], gagnant: arene.gagnant, combat: [...poses.values()].filter((q) => q.combat).length, places: [...poses].map(([id, q]) => [id, Math.round(q.m * 100) / 100]), aPlacer: Boolean(arene.aPlacer) },
      live: [...anneauxLive.entries()].filter(([, a]) => a[0].visible).map(([cle]) => cle),
    }),
  };
}
