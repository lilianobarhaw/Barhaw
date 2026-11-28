// La Battle Royale de GRAND LINE sur le site : « L'Île sans retour » en 3D, en direct.
//   • l'île (inventée) : un volcan qui fume et crache des braises, la lave, la jungle, les palmiers, les épaves, la mer
//     qui monte à chaque marée (elle rétrécit l'île), le ciel d'orage au coucher du soleil
//   • les pirates : chacun est une petite affiche WANTED plantée sur un piquet, avec sa photo et sa prime, là où le bot
//     l'a placé (les mêmes places que sur l'image du Discord) ; la tête de liste a une couronne et un cadre doré
//   • la vie autour : des mouettes, des navires à l'ancre (une lanterne à la poupe), des torches que la marée éteint,
//     des lucioles dans la jungle, des îles au loin dans la brume
//   • le duel du round : pendant le suspense, les deux pirates viennent se faire face dans un cercle de lumière (bleu
//     contre rouge), la caméra va vers eux, les étincelles montent ; au résultat ils chargent : le choc, l'onde, le
//     perdant vole en arrière et tombe (ou tient bon), le gagnant saute, « +425 000 ฿ » s'envole
//   • chaque événement du round a son animation, l'une après l'autre : le tonneau de rhum descend en parachute, le
//     coffre sort du sol et s'ouvre, un lien de lumière relie les alliés, les tentacules de la créature, le sol qui
//     s'ouvre (le piège), la vague de la marée, la charge d'un duel. Les tombés restent en petites tombes ; la marée
//     emporte celles du bord
//   • la fin : les feux d'artifice, un faisceau de lumière sur l'affiche du survivant, la caméra tourne autour de lui
//   • avant la battle : l'île tourne doucement, avec les affiches des têtes d'affiche et celle du dernier survivant
// creerBattle3D(toile, { couche, petit, reduit, photo, surPirate, son }) → { etat(d), focus(k), pause(oui), vitesse(v), redimensionner(), arreter() }
//   d : { mode: "attente" | "direct", maree, round, pirates: [{ k, nom, avatar, portrait, prime, x, y, vivant, top, vies, mort }],
//         suspense: { a, b } | null, dernier: { round, fil, duel } | null, fete: k du survivant | null,
//         rythme: le temps (s) pour jouer les événements d'un round (7 par défaut) }
//   son(nom) : la page joue le bruitage si elle veut (suspense, choc, tombe, plouf, envol, bete, piege, epee, coffre,
//   rhum, alliance, maree, feu, victoire)
//   couche : un calque (div) au-dessus de la toile, pour les étiquettes (noms, gains qui s'envolent)
import * as THREE from "./three-r170.module.min.js";

// Les couleurs : d'autres modules du site coupent la gestion des couleurs de three.js pour toute la page (ColorManagement,
// partagé par tous). Selon l'ordre de chargement, les mêmes couleurs sortaient alors délavées. Ici, chaque couleur écrite
// en sRGB (0xrrggbb, "#rrggbb") est donc convertie à la main : le rendu est le même dans les deux cas.
const C = (v) => (v && v.isColor ? v : (typeof v === "string" ? new THREE.Color().setStyle(v, THREE.LinearSRGBColorSpace) : new THREE.Color().setHex(v, THREE.LinearSRGBColorSpace)).convertSRGBToLinear());
// (au moment de dessiner, three.js convertit encore la couleur de la brume et du fond : on lui rend sa gestion des couleurs
// le temps d'une image, puis on la remet comme on l'a trouvée)
function rendreJuste(rendu, scene, camera) {
  const avant = THREE.ColorManagement.enabled;
  THREE.ColorManagement.enabled = true;
  try { rendu.render(scene, camera); } finally { THREE.ColorManagement.enabled = avant; }
}

// ---------- l'île (la même que sur les images du Discord) ----------
const R = 44;
const VOLCAN = { x: 7, z: -9, r: 19, h: 31 };
const NIVEAUX = [0, 1.6, 3.6, 6.2, 9.5]; // la hauteur de la mer à chaque marée
const TAILLE = 2.8 * R;
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function bruit(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * bruit(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
export function hauteur(x, z) {
  const ang = Math.atan2(z, x);
  const bord = 1 + 0.42 * (fbm(Math.cos(ang) * 1.6 + 5, Math.sin(ang) * 1.6 + 5, 4) - 0.5);
  const dd = Math.hypot(x, z) / R / bord;
  let h = (1 - dd * dd) * 8 - 1.4;
  h += (fbm(x * 0.07 + 3, z * 0.07 + 7, 5) - 0.42) * 8 * Math.max(0, 1 - dd);
  const dv = Math.hypot(x - VOLCAN.x, z - VOLCAN.z) / VOLCAN.r;
  h += Math.pow(Math.max(0, 1 - dv), 1.7) * VOLCAN.h * (0.85 + 0.3 * fbm(x * 0.2, z * 0.2, 3));
  if (dv < 0.2) h -= ((0.2 - dv) / 0.2) * 8;
  if (dd > 1) h = Math.min(h, -1.5 - (dd - 1) * 26);
  return h;
}
// une place de la carte du bot (image de 720 × 720, vue de dessus) → l'île
export const versMonde = (px, py) => ({ x: (px / 360 - 1) * 58, z: (py / 360 - 1) * 58 });

const court = (n) => {
  const v = Number(n) || 0;
  const f = (x) => (x >= 100 ? String(Math.round(x)) : x.toFixed(1).replace(".", ",").replace(/,0$/, ""));
  if (v >= 999_500_000) return `${f(v / 1e9)} Md`;
  if (v >= 999_500) return `${f(v / 1e6)} M`;
  if (v >= 1_000) return `${Math.round(v / 1e3)} k`;
  return String(Math.round(v));
};
function toile(l, h) { const c = document.createElement("canvas"); c.width = l; c.height = h; return c; }
function texture(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const lueur = (couleur, taille = 128) => texture((() => {
  const c = toile(taille, taille);
  const g = c.getContext("2d");
  const d = g.createRadialGradient(taille / 2, taille / 2, 0, taille / 2, taille / 2, taille / 2);
  d.addColorStop(0, couleur); d.addColorStop(0.4, couleur.replace(/[\d.]+\)$/, "0.35)")); d.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = d; g.fillRect(0, 0, taille, taille);
  return c;
})());
function chargerImage(url) {
  return new Promise((ok, ko) => {
    if (!url) return ko(new Error("pas d'image"));
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.referrerPolicy = "no-referrer";
    i.onload = () => ok(i);
    i.onerror = () => ko(new Error("image"));
    i.src = url;
    setTimeout(() => ko(new Error("trop long")), 10_000);
  });
}
const TITRE = (t) => `400 ${t}px "Dela Gothic One", "M PLUS Rounded 1c", sans-serif`;
const FORT = (t) => `800 ${t}px "M PLUS Rounded 1c", system-ui, sans-serif`;
// la petite affiche d'un pirate (sa photo, sa prime) ; grise et barrée quand il est tombé
function dessinerAffichette(c, { nom, prime, image, top, mort, vies = 0 }) {
  const g = c.getContext("2d");
  const L = c.width, H = c.height;
  g.clearRect(0, 0, L, H);
  const fond = g.createRadialGradient(L / 2, H * 0.45, 4, L / 2, H / 2, H * 0.7);
  fond.addColorStop(0, top ? "#fff0b8" : "#f4e0ae"); fond.addColorStop(1, top ? "#d9a23a" : "#c99a58");
  g.fillStyle = fond;
  g.beginPath(); g.roundRect(2, 2, L - 4, H - 4, 6); g.fill();
  g.strokeStyle = top ? "#8a5a00" : "#3b2410"; g.lineWidth = top ? 6 : 4;
  g.beginPath(); g.roundRect(5, 5, L - 10, H - 10, 5); g.stroke();
  g.fillStyle = "#3b2410"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = TITRE(L * 0.17);
  g.fillText("WANTED", L / 2, H * 0.1);
  const f = { x: L * 0.13, y: H * 0.18, l: L * 0.74 };
  g.fillStyle = "#2a170b";
  g.fillRect(f.x - 3, f.y - 3, f.l + 6, f.l + 6);
  if (image) {
    const w = image.naturalWidth || image.width, h = image.naturalHeight || image.height, s = Math.min(w, h);
    g.drawImage(image, (w - s) / 2, (h - s) / 2, s, s, f.x, f.y, f.l, f.l);
  } else {
    g.fillStyle = "#d7b97f"; g.fillRect(f.x, f.y, f.l, f.l);
    g.fillStyle = "#2a1a10";
    g.beginPath(); g.arc(L / 2, f.y + f.l * 0.4, f.l * 0.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(L / 2, f.y + f.l * 1.02, f.l * 0.36, f.l * 0.36, 0, Math.PI, 0); g.fill();
  }
  g.fillStyle = "#1e120a";
  let t = L * 0.13;
  g.font = TITRE(t);
  const n = String(nom || "?").toUpperCase();
  while (t > L * 0.07 && g.measureText(n).width > L * 0.86) { t -= 1; g.font = TITRE(t); }
  g.fillText(n.length > 16 ? `${n.slice(0, 15)}…` : n, L / 2, H * 0.83);
  g.font = TITRE(L * 0.13);
  g.fillText(`${court(prime)} ฿`, L / 2, H * 0.93);
  // les vies en plus (les tonneaux de rhum reçus) : des petits cœurs dans le coin de la photo
  for (let k = 0; k < Math.min(3, vies) && vies >= 2; k++) {
    const x = f.x + L * 0.085 + k * L * 0.125, y = f.y + L * 0.085, r = L * 0.048;
    g.beginPath();
    g.moveTo(x, y + r * 0.9);
    g.bezierCurveTo(x - r * 1.7, y - r * 0.2, x - r * 0.7, y - r * 1.35, x, y - r * 0.45);
    g.bezierCurveTo(x + r * 0.7, y - r * 1.35, x + r * 1.7, y - r * 0.2, x, y + r * 0.9);
    g.lineWidth = L * 0.022; g.strokeStyle = "#fff7ef"; g.stroke();
    g.fillStyle = "#e0314b"; g.fill();
  }
  if (mort) {
    g.globalCompositeOperation = "saturation";
    g.fillStyle = "#000"; g.fillRect(0, 0, L, H);
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = "rgba(196,30,34,0.9)"; g.lineWidth = L * 0.07; g.lineCap = "round";
    g.beginPath(); g.moveTo(L * 0.15, H * 0.2); g.lineTo(L * 0.85, H * 0.78); g.moveTo(L * 0.85, H * 0.2); g.lineTo(L * 0.15, H * 0.78); g.stroke();
  }
}

export function creerBattle3D(canvas, { couche = null, petit = false, reduit = false, photo = (u) => u, surPirate = () => {}, son = () => {} } = {}) {
  let graine = 987654;
  const alea = () => (graine = (graine * 16807) % 2147483647) / 2147483647;
  const rendu = new THREE.WebGLRenderer({ canvas, antialias: !petit, alpha: false, powerPreference: "high-performance" });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio || 1, petit ? 1.25 : 1.75));
  rendu.outputColorSpace = THREE.SRGBColorSpace;
  rendu.toneMapping = THREE.ACESFilmicToneMapping;
  rendu.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.5, 3000);

  // ---------- le ciel d'orage au coucher du soleil (et la mer qui le reflète) ----------
  const SOLEIL = new THREE.Vector3(-0.62, 0.07, -0.78).normalize();
  const GLSL_BRUIT = `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1.,0.)),u.x), mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),u.x), u.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }`;
  const GLSL_CIEL = `
uniform vec3 uSoleil, uZenith, uMilieu, uHorizon, uSoleilC, uNuageSombre, uNuageBord;
uniform float uT, uEclair;
vec3 ciel(vec3 d){
  float e = clamp(d.y, -0.25, 1.0);
  vec3 c = mix(uHorizon, uMilieu, smoothstep(0.0, 0.065, e));
  c = mix(c, uZenith, smoothstep(0.05, 0.38, e));
  float s = max(dot(d, uSoleil), 0.0);
  c += uSoleilC * (pow(s, 30.0) * 0.35 + pow(s, 160.0) * 1.1);
  c = mix(c, uSoleilC * 5.0, smoothstep(0.99935, 0.9996, s));
  if (d.y > -0.03) {
    vec2 uv = d.xz / (d.y + 0.11) * 0.8 + vec2(uT * 0.004, uT * 0.002);
    float n = fbm(uv * 0.5 + vec2(3.1, 1.7));
    float n2 = fbm(uv * 1.9 + 4.0);
    float dens = smoothstep(0.42, 0.8, n * 0.72 + n2 * 0.28) * smoothstep(-0.02, 0.07, d.y);
    float bord = (pow(s, 70.0) * 1.2 + pow(s, 18.0) * 0.18) * (1.0 - smoothstep(0.45, 0.85, n)) + 0.22 * smoothstep(0.05, 0.0, d.y);
    vec3 nc = mix(uNuageSombre, uNuageBord, clamp(bord * 1.6, 0.0, 1.0));
    nc = mix(nc, uNuageSombre * 0.55, 0.4 * smoothstep(0.55, 0.95, n));
    c = mix(c, nc, dens * 0.94);
    c += vec3(0.55, 0.6, 1.0) * uEclair * dens * smoothstep(0.45, 0.8, n);
  }
  return c;
}`;
  const uCiel = {
    uSoleil: { value: SOLEIL }, uZenith: { value: C(0x081a44) }, uMilieu: { value: C(0x2a3f86) },
    uHorizon: { value: C(0xff9a4a) }, uSoleilC: { value: C(0xffb060) },
    uNuageSombre: { value: C(0x2a2a5a) }, uNuageBord: { value: C(0xffc070) },
    uT: { value: 0 }, uEclair: { value: 0 },
  };
  const ciel = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: uCiel,
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec3 vDir; ${GLSL_BRUIT} ${GLSL_CIEL}
void main(){
  gl_FragColor = vec4(ciel(normalize(vDir)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  }));
  ciel.renderOrder = -10;
  scene.add(ciel);

  // ---------- le terrain ----------
  const N = petit ? 150 : 240;
  const geoTerrain = new THREE.PlaneGeometry(TAILLE, TAILLE, N, N);
  geoTerrain.rotateX(-Math.PI / 2);
  {
    const pos = geoTerrain.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, hauteur(pos.getX(i), pos.getZ(i)));
    geoTerrain.computeVertexNormals();
    const nrm = geoTerrain.attributes.normal;
    const cols = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const sable = C(0xd9b27a), sableMouille = C(0x8a6a48), herbe = C(0x3c7a3a), jungle = C(0x1f4a2a);
    const roche = C(0x4a4048), rocheSombre = C(0x231c22), cendre = C(0x1a1418), braise = C(0x5a1a0e);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = pos.getY(i), pente = 1 - nrm.getY(i);
      const n = fbm(x * 0.15 + 9, z * 0.15 + 2, 3);
      const dv = Math.hypot(x - VOLCAN.x, z - VOLCAN.z) / VOLCAN.r;
      if (h < 0.2) c.copy(sableMouille);
      else if (h < 1.6) c.copy(sable).lerp(sableMouille, Math.max(0, 0.6 - h / 2));
      else if (h < 11) c.copy(herbe).lerp(jungle, Math.min(1, n * 1.4 + (h - 1.6) / 14));
      else c.copy(roche).lerp(rocheSombre, Math.min(1, (h - 11) / 16));
      if (pente > 0.35 && h > 1.6) c.lerp(roche, Math.min(1, (pente - 0.35) * 2.2));
      if (dv < 0.42 && h > 14) c.lerp(cendre, Math.min(1, (0.42 - dv) * 4));
      if (dv < 0.26 && h > 14) c.lerp(braise, Math.min(1, (0.26 - dv) * 6));
      c.multiplyScalar(0.85 + 0.3 * n);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    geoTerrain.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  }
  scene.add(new THREE.Mesh(geoTerrain, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 })));

  // ---------- la lave, la lueur du volcan ----------
  // la lave coule : une texture de croûte et de bulles qui défile le long des coulées
  const texLave = (() => {
    const c = toile(256, 32), g = c.getContext("2d");
    g.fillStyle = "#ff5a12"; g.fillRect(0, 0, 256, 32);
    for (let k = 0; k < 120; k++) {
      const x = Math.random() * 256, y = Math.random() * 32, r = 2 + Math.random() * 8, croute = Math.random() < 0.55;
      for (const dx of [-256, 0, 256]) {
        const gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        gr.addColorStop(0, croute ? "rgba(70,12,2,0.85)" : "rgba(255,214,110,0.95)");
        gr.addColorStop(1, croute ? "rgba(70,12,2,0)" : "rgba(255,214,110,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y, r, 0, 7); g.fill();
      }
    }
    const t = texture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const matLave = new THREE.MeshBasicMaterial({ color: C(0xffffff), map: texLave, toneMapped: false, fog: false });
  const matLac = new THREE.MeshBasicMaterial({ color: C(0xffffff), map: texLave.clone(), toneMapped: false });
  matLac.map.repeat.set(2, 2); matLac.map.needsUpdate = true;
  const fondCratere = hauteur(VOLCAN.x, VOLCAN.z) + 0.6;
  {
    const lac = new THREE.Mesh(new THREE.CircleGeometry(VOLCAN.r * 0.17, 40), matLac);
    lac.rotation.x = -Math.PI / 2;
    lac.position.set(VOLCAN.x, fondCratere, VOLCAN.z);
    scene.add(lac);
    for (const a0 of [0.6, 1.9, 2.6, 4.4, 5.3]) {
      let x = VOLCAN.x + Math.cos(a0) * VOLCAN.r * 0.2, z = VOLCAN.z + Math.sin(a0) * VOLCAN.r * 0.2;
      const pts = [];
      for (let k = 0; k < 90; k++) {
        const h = hauteur(x, z);
        if (h < 3) break;
        pts.push(new THREE.Vector3(x, h + 0.15, z));
        const e = 0.3;
        const gx = hauteur(x + e, z) - hauteur(x - e, z), gz = hauteur(x, z + e) - hauteur(x, z - e);
        const gg = Math.hypot(gx, gz) || 1;
        x -= (gx / gg) * 0.55 + Math.cos(a0) * 0.12 + (alea() - 0.5) * 0.25;
        z -= (gz / gg) * 0.55 + Math.sin(a0) * 0.12 + (alea() - 0.5) * 0.25;
      }
      if (pts.length >= 4) {
        const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.42, 5, false);
        // la texture se répète le long de la coulée (sinon elle serait étirée)
        const uv = tube.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * pts.length * 0.22);
        scene.add(new THREE.Mesh(tube, matLave));
      }
    }
  }
  const lueurVolcan = new THREE.PointLight(C(0xff5a1a), 900, 120, 1.6);
  lueurVolcan.position.set(VOLCAN.x, fondCratere + 6, VOLCAN.z);
  scene.add(lueurVolcan);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: lueur("rgba(255,120,40,1)"), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(VOLCAN.x, fondCratere + 5, VOLCAN.z);
  halo.scale.set(34, 26, 1);
  scene.add(halo);

  // ---------- la végétation ----------
  const matTronc = new THREE.MeshStandardMaterial({ color: C(0x5a4030), roughness: 0.9 });
  const matPalme = new THREE.MeshStandardMaterial({ color: C(0x2f6a2e), roughness: 0.8, side: THREE.DoubleSide });
  const palmiers = [];
  function palmier(x, z, taille) {
    const y = hauteur(x, z);
    const pench = alea() * Math.PI * 2, force = 0.6 + alea() * 1.2;
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      pts.push(new THREE.Vector3(x + Math.cos(pench) * force * t * t * taille * 0.25, y + t * taille, z + Math.sin(pench) * force * t * t * taille * 0.25));
    }
    const groupe = new THREE.Group();
    groupe.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, (0.22 * taille) / 7, 5), matTronc));
    const haut = pts[5];
    const palmes = new THREE.Group();
    palmes.position.copy(haut);
    for (let f = 0; f < 7; f++) {
      const geo = new THREE.PlaneGeometry(taille * 0.62, (0.9 * taille) / 7, 8, 1);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) / (taille * 0.62) + 0.5;
        p.setY(i, p.getY(i) * (1 - u) * 1.3);
        p.setZ(i, -u * u * taille * 0.32);
        p.setX(i, p.getX(i) + taille * 0.31);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, matPalme);
      m.rotation.order = "YXZ";
      m.rotation.y = (f / 7) * Math.PI * 2 + alea() * 0.4;
      m.rotation.x = -Math.PI / 2 + 0.35;
      palmes.add(m);
    }
    groupe.add(palmes);
    scene.add(groupe);
    palmiers.push({ groupe, palmes, y, phase: alea() * 9 });
  }
  const NB = petit ? 700 : 1400;
  const bosquets = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: C(0xffffff), roughness: 0.95, flatShading: true }), NB);
  const VERTS = [0x2a5d30, 0x347238, 0x25563a, 0x3f7f36, 0x2f6a2c, 0x1f4a2a].map((c) => C(c));
  const FLEURS = [0xd6557c, 0xe7b24a, 0xb07ae0].map((c) => C(c));
  const bosquetsInfo = [];
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let n = 0, essais = 0, np = 0;
    const MAXP = petit ? 26 : 44;
    while ((n < NB || np < MAXP) && essais < 90000) {
      essais++;
      const x = (alea() - 0.5) * TAILLE * 0.8, z = (alea() - 0.5) * TAILLE * 0.8;
      const h = hauteur(x, z);
      const dv = Math.hypot(x - VOLCAN.x, z - VOLCAN.z) / VOLCAN.r;
      if (h > 1.2 && h < 4.5 && np < MAXP && alea() < 0.5) { palmier(x, z, 5.5 + alea() * 3.5); np++; continue; }
      if (n < NB && h > 2.2 && h < 14 && dv > 0.5 && fbm(x * 0.09, z * 0.09, 3) > 0.4) {
        const k = 0.6 + alea() * 0.9;
        p.set(x, h + k * 0.5, z);
        s.set(k, k * (0.8 + alea() * 0.5), k);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), alea() * 6.28);
        bosquets.setMatrixAt(n, m.compose(p, q, s));
        bosquets.setColorAt(n, alea() < 0.035 ? FLEURS[Math.floor(alea() * FLEURS.length)] : VERTS[Math.floor(alea() * VERTS.length)]);
        bosquetsInfo.push({ h, m: m.clone() });
        n++;
      }
    }
    bosquets.count = n;
    scene.add(bosquets);
  }
  // ---------- les rochers et les épaves ----------
  const matRoche = new THREE.MeshStandardMaterial({ color: C(0x2c262c), roughness: 0.95, flatShading: true });
  for (let k = 0; k < 14; k++) {
    const a = alea() * Math.PI * 2, d = R * (0.95 + alea() * 0.35);
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const p = geo.attributes.position;
    const gr = alea() * 50;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const f = 0.75 + 0.5 * fbm(x * 1.7 + gr, z * 1.7 + y * 1.3 + gr, 3);
      p.setXYZ(i, x * f, y * f * 1.1, z * f);
    }
    geo.computeVertexNormals();
    const r = new THREE.Mesh(geo, matRoche);
    const t = 1.4 + alea() * 3.2;
    r.scale.set(t, t * (0.9 + alea()), t);
    r.position.set(Math.cos(a) * d, -0.3, Math.sin(a) * d);
    r.rotation.set(alea(), alea() * 6, alea());
    scene.add(r);
  }
  const matBois = new THREE.MeshStandardMaterial({ color: C(0x3a2618), roughness: 0.9 });
  const matVoile = new THREE.MeshStandardMaterial({ color: C(0x6a1a1a), roughness: 0.9, side: THREE.DoubleSide });
  function epave(x, z, rot, incl, taille = 1) {
    const g = new THREE.Group();
    const forme = new THREE.Shape();
    forme.moveTo(7, 0); forme.quadraticCurveTo(4, 2.6, -3, 2.5); forme.quadraticCurveTo(-7, 2.2, -7, 0);
    forme.quadraticCurveTo(-7, -2.2, -3, -2.5); forme.quadraticCurveTo(4, -2.6, 7, 0);
    const coque = new THREE.Mesh(new THREE.ExtrudeGeometry(forme, { depth: 3.2, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.6, bevelSegments: 2 }), matBois);
    coque.rotation.x = Math.PI / 2;
    coque.position.y = 1.6;
    g.add(coque);
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 11, 8), matBois);
    mat.position.set(1, 6.5, 0); mat.rotation.z = 0.35;
    g.add(mat);
    const geoV = new THREE.PlaneGeometry(5.5, 5, 8, 8);
    const pv = geoV.attributes.position;
    for (let i = 0; i < pv.count; i++) { const y = pv.getY(i); pv.setZ(i, Math.sin(pv.getX(i) * 0.9 + y) * 0.35 + (y + 2.5) * 0.12); }
    geoV.computeVertexNormals();
    const voile = new THREE.Mesh(geoV, matVoile);
    voile.position.set(2.2, 6.6, 0.4); voile.rotation.z = 0.2;
    g.add(voile);
    g.scale.setScalar(taille);
    g.position.set(x, -1.6 * taille, z);
    g.rotation.set(incl * 0.5, rot, incl);
    scene.add(g);
  }
  epave(-44, 30, 0.6, 0.38, 1.1);
  epave(40, 36, -1.1, -0.3, 0.9);
  epave(-30, -46, 2.2, 0.25, 0.8);

  // ---------- la mer (elle monte avec la marée) ----------
  const texH = (() => {
    const T = 192, data = new Uint8Array(T * T * 4);
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      const x = (i / (T - 1) - 0.5) * TAILLE, z = (j / (T - 1) - 0.5) * TAILLE;
      const v = Math.max(0, Math.min(255, Math.round(((hauteur(x, z) + 20) / 60) * 255)));
      data.set([v, v, v, 255], (j * T + i) * 4);
    }
    const t = new THREE.DataTexture(data, T, T, THREE.RGBAFormat);
    t.magFilter = t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  })();
  const geoMer = new THREE.PlaneGeometry(1400, 1400, petit ? 90 : 160, petit ? 90 : 160);
  geoMer.rotateX(-Math.PI / 2);
  const uMer = { ...uCiel, uCam: { value: new THREE.Vector3() }, uH: { value: texH }, uTaille: { value: TAILLE }, uNiveau: { value: 0 }, uEau: { value: C(0x14506e) }, uEauProfonde: { value: C(0x062038) } };
  const mer = new THREE.Mesh(geoMer, new THREE.ShaderMaterial({
    uniforms: uMer,
    vertexShader: `
      uniform float uT, uNiveau; varying vec3 vMonde; varying vec3 vNormale;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vec2 p = w.xz; float y = 0.0; vec2 g = vec2(0.0);
        vec2 D0 = normalize(vec2(1.0, 0.3)), D1 = normalize(vec2(-0.4, 1.0)), D2 = normalize(vec2(0.8, -0.6));
        float a0 = dot(D0, p) * 0.06 + uT * 0.9; y += 0.45 * sin(a0); g += 0.45 * 0.06 * cos(a0) * D0;
        float a1 = dot(D1, p) * 0.11 + uT * 1.2; y += 0.25 * sin(a1); g += 0.25 * 0.11 * cos(a1) * D1;
        float a2 = dot(D2, p) * 0.23 + uT * 1.6; y += 0.12 * sin(a2); g += 0.12 * 0.23 * cos(a2) * D2;
        vMonde = vec3(p.x, uNiveau + y, p.y); vNormale = normalize(vec3(-g.x, 1.0, -g.y));
        gl_Position = projectionMatrix * viewMatrix * vec4(vMonde, 1.0);
      }`,
    fragmentShader: `
      uniform float uTaille, uNiveau; uniform vec3 uCam, uEau, uEauProfonde; uniform sampler2D uH;
      varying vec3 vMonde; varying vec3 vNormale;
      ${GLSL_BRUIT} ${GLSL_CIEL}
      void main(){
        vec3 v = normalize(uCam - vMonde);
        vec2 q = vMonde.xz;
        float b0 = vnoise(q * 0.9 + uT), bx = vnoise(q * 0.9 + vec2(0.31, 0.0) + uT), bz = vnoise(q * 0.9 + vec2(0.0, 0.31) + uT);
        float c0 = vnoise(q * 0.17 + 7.0), cx = vnoise(q * 0.17 + vec2(7.08, 7.0)), cz = vnoise(q * 0.17 + vec2(7.0, 7.08));
        vec3 n = normalize(vNormale + vec3(b0 - bx, 0.0, b0 - bz) * 0.45 + vec3(c0 - cx, 0.0, c0 - cz) * 2.6);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        vec3 r = reflect(-v, n); r.y = abs(r.y);
        vec3 rr = normalize(vec3(r.x, r.y * 0.7 + 0.05, r.z)); // le reflet prend un peu plus de ciel bleu
        vec3 c = mix(uEauProfonde, uEau, 0.25 + 0.2 * b0);
        vec2 uvh = q / uTaille + 0.5;
        float th = (uvh.x > 0.0 && uvh.x < 1.0 && uvh.y > 0.0 && uvh.y < 1.0) ? texture2D(uH, uvh).r * 60.0 - 20.0 : -20.0;
        float hf = th - uNiveau;
        c = mix(c, uEau * 1.9 + vec3(0.02, 0.12, 0.1), smoothstep(-7.0, -0.3, hf) * 0.75);
        c = mix(c, ciel(rr) * 0.5, fres * 0.75);
        c += uSoleilC * pow(max(dot(r, uSoleil), 0.0), 700.0) * 14.0;
        float ecume = smoothstep(-1.8, -0.05, hf) * (0.45 + 0.55 * vnoise(q * 2.2 + uT * 0.6)) + smoothstep(-0.6, 0.0, hf) * 0.5;
        c = mix(c, vec3(0.92, 0.95, 1.0) * 0.55, clamp(ecume, 0.0, 1.0) * 0.8);
        float brume = 1.0 - exp(-length(uCam - vMonde) * 0.0022);
        c = mix(c, ciel(normalize(vec3(-v.x, mix(0.05, 0.004, brume), -v.z))), brume * 0.75);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  scene.add(mer);
  let niveau = 0, niveauCible = 0;

  // ---------- la fumée et les braises du volcan ----------
  const puff = lueur("rgba(255,255,255,1)");
  const fumees = [];
  const sommet = hauteur(VOLCAN.x, VOLCAN.z) + 4;
  for (let k = 0; k < (petit ? 70 : 170); k++) {
    const t = alea();
    const lum = Math.max(0, 1 - t * 4);
    const col = C(0x2a2230).lerp(C(0x0e0a12), Math.min(1, t * 1.4)).add(new THREE.Color(0.7 * lum, 0.16 * lum, 0.03 * lum));
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, color: col, transparent: true, opacity: 0.2 - t * 0.1, depthWrite: false }));
    s.userData = { t, ox: (alea() - 0.5) * (3 + t * 26), oz: (alea() - 0.5) * (3 + t * 14), v: 0.012 + alea() * 0.01, k2: 5 + t * 24 + alea() * 6 };
    scene.add(s);
    fumees.push(s);
  }
  const NBR = petit ? 220 : 480;
  const geoBraises = new THREE.BufferGeometry();
  const posBraises = new Float32Array(NBR * 3);
  const vieBraises = new Float32Array(NBR * 4);
  for (let k = 0; k < NBR; k++) { vieBraises[k * 4] = alea(); vieBraises[k * 4 + 1] = alea(); vieBraises[k * 4 + 2] = alea(); vieBraises[k * 4 + 3] = 0.5 + alea(); }
  geoBraises.setAttribute("position", new THREE.BufferAttribute(posBraises, 3));
  scene.add(new THREE.Points(geoBraises, new THREE.PointsMaterial({ color: new THREE.Color(6, 1.6, 0.3), size: 0.4, sizeAttenuation: true })));

  // ---------- un peu de vie : des mouettes, des navires à l'ancre, des torches, des lucioles, des îles au loin ----------
  const mouettes = [];
  {
    const matM = new THREE.MeshBasicMaterial({ color: C(0xffe2c8), side: THREE.DoubleSide });
    const geoAile = new THREE.BufferGeometry();
    geoAile.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, -0.36, 0, 0, 0.36, 1.55, 0, 0.1]), 3));
    for (let k = 0; k < (petit ? 6 : 12); k++) {
      const g = new THREE.Group();
      const ad = new THREE.Mesh(geoAile, matM), ag = new THREE.Mesh(geoAile, matM);
      ag.scale.x = -1;
      g.add(ad, ag);
      scene.add(g);
      mouettes.push({ g, ad, ag, r: 24 + alea() * 46, h: 22 + alea() * 26, v: (0.1 + alea() * 0.14) * (alea() < 0.5 ? -1 : 1), ph: alea() * 9, cx: (alea() - 0.5) * 22, cz: (alea() - 0.5) * 22 });
    }
  }
  // les navires de ceux qui sont venus voir (à l'ancre, une lanterne à la poupe)
  const navires = [];
  {
    const matCoque = new THREE.MeshStandardMaterial({ color: C(0x4a3020), roughness: 0.85 });
    const matToile = new THREE.MeshStandardMaterial({ color: C(0xe9dcc0), roughness: 0.9, side: THREE.DoubleSide, emissive: C(0x3a2a1a), emissiveIntensity: 0.35 });
    const texLanterne = lueur("rgba(255,190,90,1)");
    const formeCoque = new THREE.Shape();
    formeCoque.moveTo(7, 0); formeCoque.quadraticCurveTo(4, 2.4, -3, 2.3); formeCoque.quadraticCurveTo(-7, 2, -7, 0);
    formeCoque.quadraticCurveTo(-7, -2, -3, -2.3); formeCoque.quadraticCurveTo(4, -2.4, 7, 0);
    const geoCoque = new THREE.ExtrudeGeometry(formeCoque, { depth: 2.6, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.5, bevelSegments: 2 });
    const voile = (l, h) => {
      const geo = new THREE.PlaneGeometry(l, h, 6, 6);
      const pv = geo.attributes.position;
      for (let i = 0; i < pv.count; i++) pv.setZ(i, Math.cos((pv.getX(i) / l) * Math.PI) * 0.7 * (0.5 + (pv.getY(i) / h + 0.5) * 0.5));
      geo.computeVertexNormals();
      return new THREE.Mesh(geo, matToile);
    };
    const places = [[1.72, 0.5, 1], [3.1, 2.2, 0.85], [4.25, -0.6, 0.95], [5.4, 1.2, 0.8], [0.45, -1.9, 0.9]];
    for (const [a, rot, taille] of places.slice(0, petit ? 3 : 5)) {
      const g = new THREE.Group();
      const coque = new THREE.Mesh(geoCoque, matCoque);
      coque.rotation.x = Math.PI / 2;
      coque.position.y = 1.5;
      const mat1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 12, 6), matCoque);
      mat1.position.set(0.6, 7.2, 0);
      const mat2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 8.5, 6), matCoque);
      mat2.position.set(-3.6, 5.4, 0);
      const v1 = voile(5.4, 6.4); v1.position.set(0.6, 8.2, 0.3); v1.rotation.y = Math.PI / 2;
      const v2 = voile(3.8, 4.4); v2.position.set(-3.6, 6.2, 0.3); v2.rotation.y = Math.PI / 2;
      const lanterne = new THREE.Sprite(new THREE.SpriteMaterial({ map: texLanterne, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      lanterne.position.set(-6.4, 3.6, 0);
      lanterne.scale.setScalar(3.4);
      g.add(coque, mat1, mat2, v1, v2, lanterne);
      g.scale.setScalar(taille);
      const d = R * 1.62 + alea() * 16;
      g.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      g.rotation.y = rot;
      scene.add(g);
      navires.push({ g, lanterne, taille, rot, ph: alea() * 9 });
    }
  }
  // les torches plantées autour de l'île : une flamme, et sa lueur sur le sol (la marée les éteint)
  const torches = [];
  {
    const texFlamme = lueur("rgba(255,170,70,1)");
    const texSol = lueur("rgba(255,140,60,1)", 96);
    const geoPoteau = new THREE.CylinderGeometry(0.1, 0.14, 2.6, 5);
    const matPoteau = new THREE.MeshStandardMaterial({ color: C(0x3a2618), roughness: 0.9 });
    const geoSol = new THREE.CircleGeometry(1, 20);
    const haut = new THREE.Vector3(0, 0, 1), nrm = new THREE.Vector3();
    const NT = petit ? 7 : 14;
    for (let k = 0; k < NT; k++) {
      const a = (k / NT) * Math.PI * 2 + alea() * 0.3;
      // on avance depuis la mer jusqu'à une hauteur de plage ou de talus
      const vise = 1.8 + (k % 3) * 2.1;
      let x = 0, z = 0, h = -9, ok = false;
      for (let d = R * 1.25; d > 6; d -= 0.6) {
        x = Math.cos(a) * d; z = Math.sin(a) * d; h = hauteur(x, z);
        if (h >= vise) { ok = true; break; }
      }
      if (!ok || h > 13) continue;
      const poteau = new THREE.Mesh(geoPoteau, matPoteau);
      poteau.position.set(x, h + 1.2, z);
      const flamme = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFlamme, color: C(0xffffff), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      flamme.position.set(x, h + 2.9, z);
      const e = 0.4;
      nrm.set(hauteur(x - e, z) - hauteur(x + e, z), 2 * e, hauteur(x, z - e) - hauteur(x, z + e)).normalize();
      const lueurSol = new THREE.Mesh(geoSol, new THREE.MeshBasicMaterial({ map: texSol, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      lueurSol.quaternion.setFromUnitVectors(haut, nrm);
      lueurSol.position.set(x + nrm.x * 0.35, h + 0.35, z + nrm.z * 0.35);
      lueurSol.scale.setScalar(5.5);
      scene.add(poteau, flamme, lueurSol);
      torches.push({ poteau, flamme, lueurSol, y: h, ph: alea() * 9 });
    }
  }
  // les lucioles de la jungle
  const NL = petit ? 26 : 60;
  const baseLucioles = new Float32Array(NL * 4);
  const geoLucioles = new THREE.BufferGeometry();
  geoLucioles.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NL * 3), 3));
  {
    let n = 0, essais = 0;
    while (n < NL && essais < 4000) {
      essais++;
      const x = (alea() - 0.5) * R * 1.8, z = (alea() - 0.5) * R * 1.8, h = hauteur(x, z);
      if (h < 2 || h > 12 || Math.hypot(x - VOLCAN.x, z - VOLCAN.z) < VOLCAN.r * 0.55) continue;
      baseLucioles.set([x, h, z, alea() * 9], n * 4);
      n++;
    }
  }
  const lucioles = new THREE.Points(geoLucioles, new THREE.PointsMaterial({ map: lueur("rgba(220,255,140,1)", 48), color: new THREE.Color(1.6, 2.1, 0.7), size: 0.9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  lucioles.frustumCulled = false;
  lucioles.visible = !reduit;
  scene.add(lucioles);
  // des îles au loin, dans la brume
  {
    const matLoin = new THREE.MeshBasicMaterial({ color: C(0x4a3558), fog: false });
    for (const [a, d, r, h] of [[0.5, 760, 110, 30], [1.35, 900, 170, 42], [2.7, 820, 90, 52], [3.9, 860, 150, 28], [5.2, 780, 100, 38], [5.75, 940, 190, 46]]) {
      const geo = new THREE.ConeGeometry(r, h, 11, 3);
      const q = geo.attributes.position;
      for (let i = 0; i < q.count; i++) {
        const k = 0.72 + 0.56 * fbm(q.getX(i) * 0.02 + a * 7, q.getZ(i) * 0.02 + a * 3, 3);
        q.setXYZ(i, q.getX(i) * k, q.getY(i) * (0.8 + 0.4 * k), q.getZ(i) * k);
      }
      const m = new THREE.Mesh(geo, matLoin);
      m.position.set(Math.cos(a) * d, h / 2 - 4, Math.sin(a) * d);
      m.rotation.y = a * 3;
      scene.add(m);
    }
  }

  // ---------- les lumières ----------
  // (une lumière d'appoint suit la caméra : le premier plan n'est jamais dans le noir, quel que soit le côté de l'île)
  const appoint = new THREE.DirectionalLight(C(0xc6d4ff), 0.7);
  appoint.position.set(0, 0, 0);
  appoint.target.position.set(0, -0.25, -1);
  camera.add(appoint, appoint.target);
  scene.add(camera);
  const soleil = new THREE.DirectionalLight(C(0xffb070), 3.0);
  soleil.position.copy(SOLEIL).multiplyScalar(300).setY(120);
  scene.add(soleil);
  scene.add(new THREE.HemisphereLight(C(0x5a78c0), C(0x201814), 0.85));
  const lune = new THREE.DirectionalLight(C(0x8aa0ff), 0.5);
  lune.position.set(-120, 160, 120);
  scene.add(lune);
  scene.fog = new THREE.FogExp2(C(0xff9a4a).multiplyScalar(0.45).lerp(C(0x2a3f86), 0.5), 0.0026);

  // ---------- les pirates ----------
  const pirates = new Map(); // k → { groupe, affiche, tex, c, d, pos, ... }
  const matPiquet = new THREE.MeshStandardMaterial({ color: C(0x4a3020), roughness: 0.9 });
  const geoPiquet = new THREE.CylinderGeometry(0.16, 0.2, 3.2, 6);
  const geoAffiche = new THREE.PlaneGeometry(3.4, 4.76);
  const texCouronne = texture((() => {
    const c = toile(128, 96);
    const g = c.getContext("2d");
    g.fillStyle = "#ffd23f"; g.strokeStyle = "#8a5a00"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(10, 86); g.lineTo(14, 26); g.lineTo(40, 56); g.lineTo(64, 12); g.lineTo(88, 56); g.lineTo(114, 26); g.lineTo(118, 86); g.closePath();
    g.fill(); g.stroke();
    for (const [x, y] of [[14, 26], [64, 12], [114, 26]]) { g.fillStyle = "#ff4f9a"; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); }
    return c;
  })());
  const texTombe = texture((() => {
    const c = toile(96, 96);
    const g = c.getContext("2d");
    g.fillStyle = "rgba(20,10,14,0.85)"; g.beginPath(); g.arc(48, 48, 44, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,90,90,0.9)"; g.lineWidth = 5; g.stroke();
    g.fillStyle = "#f2e6d8"; g.beginPath(); g.arc(48, 42, 22, 0, Math.PI * 2); g.fill();
    g.fillRect(36, 56, 24, 14);
    g.fillStyle = "#140a0e"; g.beginPath(); g.arc(40, 42, 6, 0, Math.PI * 2); g.arc(56, 42, 6, 0, Math.PI * 2); g.fill();
    g.fillRect(42, 60, 3, 9); g.fillRect(51, 60, 3, 9);
    return c;
  })());
  const texHaloBleu = lueur("rgba(90,150,255,1)"), texHaloRouge = lueur("rgba(255,70,60,1)"), texHaloOr = lueur("rgba(255,200,70,1)");
  const sol = (x, z) => Math.max(hauteur(x, z), niveau + 0.3);
  const lisse = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const adresse = (d) => (d.avatar ? photo(d.avatar) : d.portrait != null ? `/img/battle/portraits/${String(d.portrait).padStart(2, "0")}.png` : "");
  function creerPirate(d) {
    const c = toile(160, 224);
    const tex = texture(c);
    const groupe = new THREE.Group();
    const piquet = new THREE.Mesh(geoPiquet, matPiquet);
    piquet.position.y = 1.6;
    groupe.add(piquet);
    const tete = new THREE.Group(); // l'affiche (elle se tourne vers la caméra)
    tete.position.y = 3.6;
    const affiche = new THREE.Mesh(geoAffiche, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide, emissive: C(0xffffff), emissiveMap: tex, emissiveIntensity: 0.22 }));
    affiche.position.y = 2.38;
    tete.add(affiche);
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHaloOr, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    aura.position.set(0, 2.38, -0.5); // derrière l'affiche : on ne voit que la lueur autour
    aura.scale.set(9, 11, 1);
    tete.add(aura);
    const couronne = new THREE.Sprite(new THREE.SpriteMaterial({ map: texCouronne, transparent: true, depthWrite: false }));
    couronne.position.y = 5.5;
    couronne.scale.set(2.4, 1.8, 1);
    couronne.visible = false;
    tete.add(couronne);
    groupe.add(tete);
    const tombe = new THREE.Sprite(new THREE.SpriteMaterial({ map: texTombe, transparent: true, depthWrite: false }));
    tombe.scale.set(2.2, 2.2, 1);
    tombe.position.y = 1.2;
    tombe.visible = false;
    groupe.add(tombe);
    scene.add(groupe);
    const p = {
      k: d.k, d, c, tex, groupe, tete, affiche, aura, couronne, tombe, image: null, photo: null, pos: { x: 0, z: 0 }, cible: { x: 0, z: 0 },
      etat: "debout", anim: null, phase: Math.random() * 9, echelle: 1,
      // aTomber : il est éliminé, mais il reste debout jusqu'à ce que son événement soit joué ; fige : il ne bouge plus (tombé)
      // saut, elan, trajet : un petit saut, une charge vers quelqu'un, le bond quand il change de place ; arene : sa place de duel
      aTomber: null, fige: false, saut: null, elan: null, arene: null, trajet: 0, vite: 0,
    };
    const m = versMonde(d.x, d.y);
    p.pos = { ...m }; p.cible = { ...m };
    redessiner(p);
    chargerPhoto(p);
    return p;
  }
  // la photo du pirate (rechargée si ce numéro devient quelqu'un d'autre : une autre battle, la rediff)
  function chargerPhoto(p) {
    const u = adresse(p.d);
    if (u === p.photo) return;
    p.photo = u;
    p.image = null;
    chargerImage(u).then((img) => { if (p.photo === u) { p.image = img; redessiner(p); } }).catch(() => {});
  }
  function redessiner(p) {
    dessinerAffichette(p.c, { nom: p.d.nom, prime: p.d.prime, image: p.image, top: p.d.top && p.d.vivant, mort: !p.d.vivant && !p.aTomber, vies: p.d.vivant ? p.d.vies : 0 });
    p.tex.needsUpdate = true;
  }

  // ---------- ce qui s'envole (les gains, « +1 VIE ») et les étiquettes ----------
  const flottants = [];
  function flotter(texte, monde, classe = "") {
    if (!couche) return;
    const e = document.createElement("div");
    e.className = `br3-flotte ${classe}`;
    e.textContent = texte;
    couche.append(e);
    flottants.push({ e, monde: monde.clone(), t0: horloge });
  }
  const etiquettes = new Map(); // k → div (le nom des pirates qu'on montre)
  function etiquette(k, texte, classe) {
    if (!couche) return null;
    let e = etiquettes.get(k);
    if (!e) { e = document.createElement("div"); couche.append(e); etiquettes.set(k, e); }
    e.className = `br3-nom ${classe || ""}`;
    if (e.textContent !== texte) e.textContent = texte;
    return e;
  }
  // les éclats (le sabre, la mer, la poussière, les feux d'artifice)
  const eclats = [];
  const texEclat = lueur("rgba(255,255,255,1)", 64);
  function gerbe(pos, couleur, n = 26, force = 9, gravite = 18, vie = 1, taille = 1) {
    if (reduit) n = Math.min(n, 8);
    for (let k = 0; k < n; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEclat, color: couleur, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.copy(pos);
      const a = Math.random() * Math.PI * 2, b = Math.random() * 0.9 + 0.2;
      s.userData = { v: new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b) * 1.4, Math.sin(a) * Math.cos(b)).multiplyScalar(force * (0.4 + Math.random() * 0.8)), vie: 0, max: (0.7 + Math.random() * 0.6) * vie, g: gravite, s: (0.5 + Math.random() * 0.7) * taille };
      s.scale.setScalar(s.userData.s);
      scene.add(s);
      eclats.push(s);
    }
  }
  // les effets : des choses qui ne vivent qu'un moment (maj(u) de 0 à 1, puis fin())
  const effets = [];
  function effet(duree, maj, fin = null) { effets.push({ t0: horloge, duree, maj, fin }); }
  const geoAnneau = new THREE.RingGeometry(0.8, 1, 48);
  const hautZ = new THREE.Vector3(0, 0, 1), nrmSol = new THREE.Vector3();
  const geoArene = new THREE.CylinderGeometry(1, 1, 1, 56, 1, true).translate(0, 0.5, 0);
  const texArene = texture((() => {
    const c = toile(8, 64);
    const g = c.getContext("2d");
    const d = g.createLinearGradient(0, 0, 0, 64);
    d.addColorStop(0, "rgba(255,255,255,0)"); d.addColorStop(0.55, "rgba(255,255,255,0.22)"); d.addColorStop(1, "rgba(255,255,255,1)");
    g.fillStyle = d; g.fillRect(0, 0, 8, 64);
    return c;
  })());
  // (une chose plate posée sur le sol suit sa pente)
  function coucherAuSol(m, x, z) {
    const e = 0.5;
    nrmSol.set(sol(x - e, z) - sol(x + e, z), 2 * e, sol(x, z - e) - sol(x, z + e)).normalize();
    m.quaternion.setFromUnitVectors(hautZ, nrmSol);
  }
  // une onde qui s'élargit sur le sol (le choc d'un duel, quelqu'un qui tient bon, la marée)
  function anneau(x, z, couleur, rayon, duree = 0.8, y = null) {
    const m = new THREE.Mesh(geoAnneau, new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    if (y === null) { coucherAuSol(m, x, z); m.position.set(x, sol(x, z) + 0.7, z); } else { m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); }
    scene.add(m);
    effet(duree, (u) => { m.scale.setScalar(rayon * (0.12 + 0.88 * (1 - (1 - u) ** 3))); m.material.opacity = 1 - u; }, () => { scene.remove(m); m.material.dispose(); });
  }
  // un signal là où il se passe quelque chose (on le voit même de loin) : une onde au sol et un trait de lumière
  const geoTrait = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 1, true).translate(0, 0.5, 0);
  function signal(x, z, couleur) {
    anneau(x, z, couleur, 7, 0.9);
    if (reduit) return;
    const m = new THREE.Mesh(geoTrait, new THREE.MeshBasicMaterial({ map: texArene, color: couleur, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    m.position.set(x, sol(x, z), z);
    scene.add(m);
    effet(1.1, (u) => { m.scale.set(1 + u * 1.5, 38 * Math.min(1, u * 5), 1 + u * 1.5); m.material.opacity = 0.75 * Math.min(1, u * 8) * (1 - u); }, () => { scene.remove(m); m.material.dispose(); });
  }
  const BLANC = new THREE.Color(1, 0.96, 0.84), OR = new THREE.Color(1, 0.8, 0.28), BLEU = new THREE.Color(0.5, 0.75, 1), ROUGE = new THREE.Color(1, 0.3, 0.22), TERRE = new THREE.Color(0.85, 0.7, 0.5);
  // un point au-dessus de l'affiche d'un pirate (marge : de combien au-dessus de son bord), ou devant son milieu
  const auDessus = (p, marge = 1.5) => new THREE.Vector3(p.groupe.position.x, p.groupe.position.y + 8.4 * p.echelle + marge, p.groupe.position.z);
  const auMilieu = (p) => new THREE.Vector3(p.groupe.position.x, p.groupe.position.y + 6 * p.echelle, p.groupe.position.z);

  // ---------- les événements du round : chacun son animation ----------
  // le tonneau de rhum : il descend du ciel en parachute, à côté du pirate
  const matTonneau = new THREE.MeshStandardMaterial({ color: C(0x8a5a2c), roughness: 0.8 });
  const matCercle = new THREE.MeshStandardMaterial({ color: C(0x2a2018), roughness: 0.6 });
  const matParachute = new THREE.MeshStandardMaterial({ color: C(0xf2e6d0), roughness: 0.9, side: THREE.DoubleSide, emissive: C(0x403020), emissiveIntensity: 0.5 });
  const geoTonneau = new THREE.CylinderGeometry(0.62, 0.62, 1.3, 10);
  const geoCercle = new THREE.TorusGeometry(0.64, 0.06, 5, 12).rotateX(Math.PI / 2);
  const geoParachute = new THREE.SphereGeometry(2.1, 12, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const geoSuspentes = new THREE.BufferGeometry().setFromPoints([[1.5, 1.5], [-1.5, 1.5], [1.5, -1.5], [-1.5, -1.5]].flatMap(([x, z]) => [new THREE.Vector3(x, 2.7, z), new THREE.Vector3(0, 0.65, 0)]));
  const matSuspentes = new THREE.LineBasicMaterial({ color: C(0xd8c8a8) });
  function evtRhum(p) {
    const g = new THREE.Group();
    const c1 = new THREE.Mesh(geoCercle, matCercle), c2 = new THREE.Mesh(geoCercle, matCercle);
    c1.position.y = 0.38; c2.position.y = -0.38;
    const para = new THREE.Mesh(geoParachute, matParachute);
    para.position.y = 2.6;
    const fils = new THREE.LineSegments(geoSuspentes, matSuspentes);
    g.add(new THREE.Mesh(geoTonneau, matTonneau), c1, c2, para, fils);
    scene.add(g);
    const ph = Math.random() * 6;
    let pose = false;
    effet(2.3, (u) => {
      const bx = p.groupe.position.x + 3.2, bz = p.groupe.position.z + 1.1;
      const ys = sol(bx, bz) + 1.25;
      const k = Math.min(1, u / 0.8), e = 1 - (1 - k) ** 2;
      g.position.set(bx + Math.sin(u * 8 + ph) * 1.5 * (1 - k), ys + 32 * (1 - e), bz);
      g.rotation.z = Math.sin(u * 8 + ph) * 0.25 * (1 - k);
      para.scale.set(1, 0.75 * (k < 1 ? 1 : Math.max(0.04, 1 - (u - 0.8) * 10)), 1); // la toile retombe
      fils.visible = k < 1;
      g.scale.setScalar(1.9 * (u > 0.9 ? Math.max(0.001, 1 - (u - 0.9) / 0.1) : 1));
      if (k >= 1 && !pose) {
        pose = true;
        gerbe(new THREE.Vector3(bx, ys, bz), new THREE.Color(1, 0.75, 0.35), 18, 6, 14);
        if (p.etat === "debout") { flotter("🍺 +1 VIE", auDessus(p, 2), "vert"); p.saut = horloge; }
        son("rhum");
      }
    }, () => scene.remove(g));
  }
  // le coffre : il sort du sol, s'ouvre, l'or jaillit
  const matCoffre = new THREE.MeshStandardMaterial({ color: C(0x6a4022), roughness: 0.8 });
  const matOr = new THREE.MeshStandardMaterial({ color: C(0xffc83d), roughness: 0.35, metalness: 0.3, emissive: C(0x6a4a00), emissiveIntensity: 0.7 });
  const geoCaisse = new THREE.BoxGeometry(1.7, 0.95, 1.15), geoFerrure = new THREE.BoxGeometry(0.22, 1.0, 1.2);
  const geoCouvercle = new THREE.BoxGeometry(1.7, 0.36, 1.15), geoFerrure2 = new THREE.BoxGeometry(0.22, 0.4, 1.2);
  function evtCoffre(p, tag) {
    const g = new THREE.Group();
    const caisse = new THREE.Mesh(geoCaisse, matCoffre), ferrure = new THREE.Mesh(geoFerrure, matOr);
    caisse.position.y = ferrure.position.y = 0.48;
    const charniere = new THREE.Group();
    charniere.position.set(0, 0.95, -0.575);
    const couvercle = new THREE.Mesh(geoCouvercle, matCoffre), ferrure2 = new THREE.Mesh(geoFerrure2, matOr);
    couvercle.position.set(0, 0.18, 0.575); ferrure2.position.set(0, 0.18, 0.575);
    charniere.add(couvercle, ferrure2);
    const eclat = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHaloOr, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    eclat.position.y = 1.5;
    g.add(caisse, ferrure, charniere, eclat);
    g.scale.setScalar(0.001);
    scene.add(g);
    let ouvert = false;
    effet(2.6, (u) => {
      const bx = p.groupe.position.x - 3.4, bz = p.groupe.position.z + 1.2;
      const ys = sol(bx, bz);
      g.position.set(bx, ys, bz);
      g.rotation.y = Math.atan2(camera.position.x - bx, camera.position.z - bz);
      const k = Math.min(1, u / 0.14) + Math.sin(Math.min(1, u / 0.3) * Math.PI) * 0.25;
      g.scale.setScalar(Math.max(0.001, 2.4 * k * (u > 0.88 ? Math.max(0, 1 - (u - 0.88) / 0.12) : 1)));
      const o = lisse(0.22, 0.4, u);
      charniere.rotation.x = -o * 1.9;
      eclat.material.opacity = o * (1 - lisse(0.75, 0.95, u)) * 0.95;
      eclat.scale.setScalar(2 + o * 5 + Math.sin(horloge * 9) * 0.4);
      if (o > 0.5 && !ouvert) {
        ouvert = true;
        gerbe(new THREE.Vector3(bx, ys + 1.5, bz), OR, 26, 8, 16);
        if (tag && p.etat === "debout") { flotter(`💰 ${tag}`, auDessus(p, 2), "or"); p.saut = horloge; }
        son("coffre");
      }
    }, () => { scene.remove(g); eclat.material.dispose(); });
  }
  // l'alliance : un lien de lumière entre les deux pirates, quelques secondes
  const geoLien = new THREE.CylinderGeometry(0.24, 0.24, 1, 6).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  function evtAlliance(pa, pb) {
    const m = new THREE.Mesh(geoLien, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.6, 2.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    scene.add(m);
    const A = new THREE.Vector3(), B = new THREE.Vector3();
    let dit = false;
    effet(6.5, (u) => {
      A.copy(auMilieu(pa));
      B.copy(auMilieu(pb));
      m.position.copy(A);
      m.lookAt(B);
      const gros = 1 + Math.sin(horloge * 6) * 0.3;
      m.scale.set(gros, gros, Math.max(0.01, A.distanceTo(B)));
      const ensemble = pa.etat === "debout" && pb.etat === "debout";
      m.material.opacity = ensemble ? Math.min(1, u * 10) * (1 - lisse(0.82, 1, u)) * (0.55 + 0.3 * Math.sin(horloge * 5)) : 0;
      if (!dit) { dit = true; flotter("🤝 ALLIANCE", A.clone().lerp(B, 0.5).setY(Math.max(A.y, B.y) + 4), "bleu"); son("alliance"); }
    }, () => { scene.remove(m); m.material.dispose(); });
  }
  // la créature : trois tentacules sortent autour du pirate (il esquive, ou elles l'emportent)
  const geoTentacule = (() => {
    const g = new THREE.CylinderGeometry(0.1, 0.55, 8, 7, 8).translate(0, 4, 0);
    const q = g.attributes.position;
    for (let i = 0; i < q.count; i++) { const y = q.getY(i); q.setX(i, q.getX(i) + Math.sin(y * 0.55) * 0.75 * (y / 8)); }
    g.computeVertexNormals();
    return g;
  })();
  const matTentacule = new THREE.MeshStandardMaterial({ color: C(0x6a3a8a), roughness: 0.45, emissive: C(0x2a0f3a), emissiveIntensity: 0.9 });
  function evtBete(p, tag) {
    const meurt = Boolean(p.aTomber);
    const g = new THREE.Group();
    const bras = [0, 2.1, 4.2].map((a) => {
      const m = new THREE.Mesh(geoTentacule, matTentacule);
      m.position.set(Math.cos(a) * 3, 0, Math.sin(a) * 3);
      m.rotation.y = Math.PI - a; // elle se courbe vers le pirate
      m.scale.set(1.5, 0.001, 1.5);
      g.add(m);
      return m;
    });
    const bx = p.groupe.position.x, bz = p.groupe.position.z, ys = sol(bx, bz);
    g.position.set(bx, ys - 0.4, bz);
    scene.add(g);
    gerbe(new THREE.Vector3(bx, ys + 0.5, bz), new THREE.Color(0.6, 0.45, 0.9), 22, 7, 14);
    son("bete");
    let fait = false;
    effet(meurt ? 2.2 : 1.8, (u) => {
      const sort = lisse(0, 0.28, u) * (1 - lisse(0.6, 0.98, u));
      bras.forEach((m, k) => {
        m.scale.set(1.5, Math.max(0.001, 1.5 * sort * (0.9 + 0.15 * Math.sin(horloge * 5 + k * 2))), 1.5);
        m.rotation.z = Math.sin(horloge * 6 + k * 2.1) * 0.22 + (meurt ? lisse(0.3, 0.5, u) * 0.35 : 0);
      });
      if (u > 0.42 && !fait) {
        fait = true;
        if (meurt) tomber(p, "bete");
        else if (p.etat === "debout") { p.saut = horloge; flotter(tag || "ESQUIVE", auDessus(p, 2), "bleu"); }
      }
    }, () => scene.remove(g));
  }
  // le piège : le sol s'ouvre sous le pirate
  const geoTrou = new THREE.CircleGeometry(1, 22);
  function evtPiege(p) {
    const bx = p.groupe.position.x, bz = p.groupe.position.z;
    const m = new THREE.Mesh(geoTrou, new THREE.MeshBasicMaterial({ color: C(0x050304), transparent: true, opacity: 0, depthWrite: false, fog: false }));
    coucherAuSol(m, bx, bz);
    m.position.set(bx, sol(bx, bz) + 0.25, bz);
    m.scale.setScalar(3.2);
    scene.add(m);
    son("piege");
    let fait = false;
    effet(2, (u) => {
      m.material.opacity = lisse(0, 0.12, u) * (1 - lisse(0.7, 1, u)) * 0.92;
      if (u > 0.1 && !fait) { fait = true; if (p.aTomber) tomber(p, "piege"); }
    }, () => { scene.remove(m); m.material.dispose(); });
  }
  function evtMaree(p) {
    anneau(p.groupe.position.x, p.groupe.position.z, BLEU, 9, 1, niveau + 0.6);
    if (p.aTomber) tomber(p, "maree");
  }
  function evtAbsurde(p) {
    const ou = auDessus(p, 26);
    if (p.aTomber) tomber(p, "absurde");
    effet(1.5, () => {}, () => { flotter("✨", ou, "or"); gerbe(ou, BLANC, 10, 4, 2); });
  }
  // un duel (ou une trahison) qui n'est pas celui du round : le gagnant charge, les étincelles, le perdant tombe ou tient bon
  function evtDuel(pa, pb, tag, trahison = false) {
    pa.elan = { x: pb.groupe.position.x, z: pb.groupe.position.z, t0: horloge };
    let fait = false;
    effet(0.6, (u) => {
      if (u < 0.42 || fait) return;
      fait = true;
      gerbe(auMilieu(pb), trahison ? ROUGE : BLANC, 26, 10);
      son("epee");
      if (pb.aTomber) {
        tomber(pb, trahison ? "trahison" : "duel");
        if (tag) flotter(/฿/.test(tag) ? tag : `🗡️ ${tag}`, auDessus(pa, 2), /฿/.test(tag) ? "or" : "rouge");
        if (pa.etat === "debout") pa.saut = horloge + 0.15;
      } else if (pb.etat === "debout") {
        flotter(tag || "TIENT BON", auDessus(pb, 2), "bleu");
        anneau(pb.groupe.position.x, pb.groupe.position.z, BLEU, 5, 0.6);
      }
    });
  }
  function evtEsquive(p) {
    gerbe(new THREE.Vector3(p.groupe.position.x, p.groupe.position.y + 1, p.groupe.position.z), TERRE, 10, 4, 8);
    p.saut = horloge;
    flotter("💨", auDessus(p, 1.5), "bleu");
  }
  function jouer(l) {
    const pa = l.a != null ? pirates.get(l.a) : null, pb = l.b != null ? pirates.get(l.b) : null;
    const ou = (l.type === "rhum" || l.type === "coffre" || l.type === "esquive" || l.type === "alliance" ? pa : pb) || pa || pb;
    if (ou) signal(ou.groupe.position.x, ou.groupe.position.z, { rhum: new THREE.Color(0.5, 1, 0.6), coffre: OR, alliance: BLEU, esquive: BLEU, bete: new THREE.Color(0.75, 0.5, 1), maree: BLEU, trahison: ROUGE }[l.type] || BLANC);
    if (l.type === "rhum" && pa) evtRhum(pa);
    else if (l.type === "duel" && pa && pb) evtDuel(pa, pb, l.tag);
    else if (l.type === "trahison" && pa && pb) evtDuel(pa, pb, l.tag || "TRAHISON", true);
    else if (l.type === "maree" && pb) evtMaree(pb);
    else if (l.type === "bete" && pb) evtBete(pb, l.tag);
    else if (l.type === "piege" && pb) evtPiege(pb);
    else if (l.type === "absurde" && pb) evtAbsurde(pb);
    else if (l.type === "coffre" && pa) evtCoffre(pa, l.tag);
    else if (l.type === "alliance" && pa && pb) evtAlliance(pa, pb);
    else if (l.type === "esquive" && pa) evtEsquive(pa);
  }
  // la file des événements du round (ils se jouent l'un après l'autre)
  const file = [];
  function programmer(dr, vedette, rythme = 7) {
    const lignes = (dr.fil || []).filter((l) => !(vedette && l.type === "duel" && l.a === dr.duel.gagnant && l.b === dr.duel.perdant));
    const rhums = lignes.filter((l) => l.type === "rhum"), autres = lignes.filter((l) => l.type !== "rhum");
    rhums.forEach((l, i) => file.push({ t0: horloge + 0.2 + i * 0.45, l }));
    const debut = vedette ? 3 : 0.5;
    const pas = Math.min(1.3, Math.max(0.45, (rythme - debut) / Math.max(1, autres.length)));
    autres.forEach((l, i) => file.push({ t0: horloge + debut + i * pas, l }));
    file.sort((a, b) => a.t0 - b.t0);
  }
  // tout ce qui attendait est réglé tout de suite (un nouveau round arrive, on quitte la page)
  function solder() {
    file.length = 0;
    for (const p of pirates.values()) if (p.aTomber) { p.aTomber = null; p.etat = "tombe"; p.fige = true; p.anim = null; redessiner(p); poserTombe(p); }
  }

  // ---------- le duel du round : face à face pendant le suspense, puis le choc ----------
  let combat = null; // { a, b, mx, mz, axe, sep, phase: "face" | "choc", t0, res, tag, cercle }
  let tremblement = 0;
  function commencerCombat(pa, pb) {
    finirCombat();
    let mx = (pa.cible.x + pb.cible.x) / 2, mz = (pa.cible.z + pb.cible.z) / 2;
    // l'arène reste au sec (la marée monte), sur le flanc du volcan s'il le faut
    for (let k = 0; k < 40 && hauteur(mx, mz) < niveauCible + 1.2; k++) { mx += (VOLCAN.x - mx) * 0.1; mz += (VOLCAN.z - mz) * 0.1; }
    let ax = pb.cible.x - pa.cible.x, az = pb.cible.z - pa.cible.z;
    // côte à côte autour du volcan (à la même hauteur), chacun du côté d'où il vient
    const vx = mx - VOLCAN.x, vz = mz - VOLCAN.z, lv = Math.hypot(vx, vz);
    if (lv > 5) {
      const tx = -vz / lv, tz = vx / lv, sens = tx * ax + tz * az < 0 ? -1 : 1;
      ax = tx * sens; az = tz * sens;
    } else {
      const la = Math.hypot(ax, az);
      if (la > 0.01) { ax /= la; az /= la; } else { ax = 1; az = 0; }
    }
    const sep = 5.4;
    pa.arene = { x: mx - ax * sep, z: mz - az * sep };
    pb.arene = { x: mx + ax * sep, z: mz + az * sep };
    for (const p of [pa, pb]) p.trajet = Math.hypot(p.arene.x - p.pos.x, p.arene.z - p.pos.z);
    // l'arène : un mur de lumière autour des deux pirates (il dépasse de la jungle)
    const cercle = new THREE.Mesh(geoArene, new THREE.MeshBasicMaterial({ map: texArene, color: new THREE.Color(1.7, 1.15, 0.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    cercle.position.set(mx, Math.min(sol(pa.arene.x, pa.arene.z), sol(pb.arene.x, pb.arene.z), sol(mx, mz)) - 0.5, mz);
    cercle.scale.set(10.5, 4.6, 10.5);
    scene.add(cercle);
    combat = { a: pa, b: pb, mx, mz, axe: { x: ax, z: az }, sep, phase: "face", t0: horloge, res: null, tag: "", cercle, prochaine: 0, etapes: 0 };
    focusCible = viser(pa, pb);
    focusJusqua = Infinity;
  }
  function finirCombat() {
    if (!combat) return;
    scene.remove(combat.cercle);
    combat.cercle.material.dispose();
    for (const p of [combat.a, combat.b]) {
      p.arene = null;
      if (p.etat === "debout") p.trajet = Math.hypot(p.cible.x - p.pos.x, p.cible.z - p.pos.z);
    }
    combat = null;
  }
  const decal = { x: 0, y: 0, z: 0 };
  // où est un duelliste par rapport à sa place, pendant le choc : il charge, puis le perdant recule
  function decalageCombat(p) {
    decal.x = decal.y = decal.z = 0;
    const c = combat;
    if (c.phase !== "choc" || p.etat !== "debout") return decal;
    const u = horloge - c.t0, moi = p === c.a ? -1 : 1;
    const ax = c.axe.x * moi, az = c.axe.z * moi, course = c.sep - 1.7;
    if (u < 0.28) { const k = (u / 0.28) ** 2; decal.x = -ax * course * k; decal.z = -az * course * k; return decal; }
    const v = Math.min(1, (u - 0.28) / 0.55), e = 1 - (1 - v) ** 3;
    const perdant = p.k === c.res.perdant;
    const recul = perdant ? 2.4 * (1 - lisse(1.5, 2.4, u)) : 0;
    decal.x = -ax * course * (1 - e) + ax * recul * e;
    decal.z = -az * course * (1 - e) + az * recul * e;
    decal.y = perdant ? Math.sin(v * Math.PI) * 0.9 : 0;
    return decal;
  }
  function animerCombat() {
    const c = combat;
    const u = horloge - c.t0;
    if (c.phase === "face") {
      c.cercle.material.opacity = Math.min(0.8, u * 1.2) * (0.62 + 0.38 * Math.sin(horloge * 5));
      c.cercle.rotation.y = horloge * 0.4;
      // la tension monte : des étincelles entre les deux, de plus en plus souvent
      if (!reduit && u > 1 && horloge >= c.prochaine) {
        c.prochaine = horloge + Math.max(0.16, 0.8 - u * 0.06) * (0.6 + Math.random() * 0.8);
        gerbe(new THREE.Vector3(c.mx, sol(c.mx, c.mz) + 6 + Math.random() * 3, c.mz), BLANC, 5, 5, 10);
      }
      return;
    }
    c.cercle.material.opacity = Math.max(0, 0.8 * (1 - u / 0.6));
    c.cercle.scale.set(10.5 + u * 9, 4.6 * Math.max(0.1, 1 - u), 10.5 + u * 9);
    const G = pirates.get(c.res.gagnant), P = pirates.get(c.res.perdant);
    if (u >= 0.28 && c.etapes < 1) {
      // le choc
      c.etapes = 1;
      const M = new THREE.Vector3(c.mx, sol(c.mx, c.mz) + 6, c.mz);
      gerbe(M, BLANC, 54, 17, 16);
      gerbe(M, OR, 20, 9, 10);
      anneau(c.mx, c.mz, OR, 17, 0.7);
      const eclair = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEclat, color: BLANC, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      eclair.position.copy(M);
      scene.add(eclair);
      effet(0.3, (v) => { eclair.scale.setScalar(12 + v * 26); eclair.material.opacity = 1 - v; }, () => { scene.remove(eclair); eclair.material.dispose(); });
      if (!reduit) tremblement = 0.55;
      son("choc");
    }
    if (u >= 0.34 && c.etapes < 2) {
      c.etapes = 2;
      if (P && c.res.mort && P.aTomber) {
        // il vole en arrière et tombe là où il atterrit
        const moi = P === c.a ? -1 : 1;
        P.pos = { x: P.groupe.position.x, z: P.groupe.position.z };
        P.arene = null;
        P.cible = { x: c.mx + c.axe.x * moi * (c.sep + 4.5), z: c.mz + c.axe.z * moi * (c.sep + 4.5) };
        P.vite = 6;
        P.saut = horloge;
        tomber(P, "duel");
      } else if (P && P.etat === "debout") {
        flotter("TIENT BON", auDessus(P, 2), "bleu");
        anneau(P.arene?.x ?? P.pos.x, P.arene?.z ?? P.pos.z, BLEU, 6, 0.7);
      }
    }
    if (u >= 0.62 && c.etapes < 3) {
      c.etapes = 3;
      if (G && G.etat === "debout") {
        G.saut = horloge;
        if (c.res.mort) gerbe(auDessus(G, 0), OR, 30, 9, 15);
        if (c.tag && /฿/.test(c.tag)) flotter(c.tag, auDessus(G, 2.5), "or");
      }
    }
    if (u >= 1.1 && c.etapes < 4) { c.etapes = 4; if (G && G.etat === "debout") G.saut = horloge; }
    if (u > 2.7) finirCombat();
  }

  // ---------- la fête du survivant : les feux d'artifice, un faisceau de lumière sur son affiche ----------
  let fete = null; // { p, prochain }
  const faisceau = new THREE.Mesh(new THREE.CylinderGeometry(5, 0.7, 80, 18, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.1, 0.4), transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  faisceau.visible = false;
  scene.add(faisceau);
  const FEUX = [new THREE.Color(1, 0.35, 0.6), new THREE.Color(1, 0.8, 0.3), new THREE.Color(0.45, 0.8, 1), new THREE.Color(0.6, 1, 0.5), new THREE.Color(0.8, 0.55, 1), BLANC];
  function feu() {
    const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 30;
    const c = fete ? fete.p.groupe.position : new THREE.Vector3(0, 10, 0);
    const ou = new THREE.Vector3(c.x + Math.cos(a) * d, c.y + 20 + Math.random() * 26, c.z + Math.sin(a) * d);
    const couleur = FEUX[Math.floor(Math.random() * FEUX.length)];
    // la fusée monte, puis éclate
    const fusee = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEclat, color: couleur, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    fusee.scale.setScalar(1.1);
    scene.add(fusee);
    effet(0.55, (u) => { fusee.position.set(ou.x, niveau + 4 + (ou.y - niveau - 4) * (1 - (1 - u) ** 2), ou.z); fusee.material.opacity = 0.9; }, () => {
      scene.remove(fusee); fusee.material.dispose();
      gerbe(ou, couleur.clone().multiplyScalar(1.8), petit ? 30 : 58, 17, 7, 1.6, 2.3);
      gerbe(ou, BLANC, 10, 7, 5, 1.2, 1.6);
      son("feu");
    });
  }

  // ---------- l'état reçu du bot ----------
  let mode = "attente";
  let suspense = null; // { a, b }
  let dernierRound = -1;
  let dernierNiveau = 0;
  let focusCible = null; // { x, y, z, distance }
  let focusJusqua = 0;
  function etat(d) {
    const modeAvant = mode;
    mode = d.mode || "attente";
    if (mode !== modeAvant) { solder(); finirCombat(); dernierRound = -1; }
    niveauCible = NIVEAUX[Math.max(0, Math.min(4, d.maree || 0))];
    const dr = d.dernier;
    const nouveau = Boolean(dr && dr.round !== dernierRound);
    // on n'anime le résultat d'un round que si on l'a vu arriver (pas en rouvrant l'onglet, pas en en rattrapant plusieurs)
    const anime = nouveau && dernierRound >= 0 && dr.round === dernierRound + 1 && !enPause && mode === "direct";
    if (nouveau || (dr == null && dernierRound >= 0)) solder();
    if (dr == null) dernierRound = d.round === 0 && mode === "direct" ? 0 : -1; // avant le premier round : on verra arriver le round 1
    const vus = new Set();
    for (const x of d.pirates || []) {
      vus.add(x.k);
      let p = pirates.get(x.k);
      if (!p) { p = creerPirate(x); pirates.set(x.k, p); }
      const avant = p.d;
      p.d = x;
      if (x.vivant && p.etat !== "debout") relever(p); // une autre battle, une rediff qui recommence
      if (!p.fige) {
        const m = versMonde(x.x, x.y);
        if (Math.hypot(m.x - p.cible.x, m.z - p.cible.z) > 2) p.trajet = Math.hypot(m.x - p.pos.x, m.z - p.pos.z);
        p.cible = m;
      }
      if (!x.vivant && p.etat === "debout" && !p.aTomber) {
        if (anime && avant.vivant) p.aTomber = x.mort?.cause || "duel"; // il tombera quand son événement sera joué
        else { p.etat = "tombe"; p.fige = true; poserTombe(p); }
      }
      if (avant.avatar !== x.avatar || avant.portrait !== x.portrait) chargerPhoto(p);
      if (avant.top !== x.top || avant.prime !== x.prime || avant.vivant !== x.vivant || avant.nom !== x.nom || avant.vies !== x.vies) redessiner(p);
      p.couronne.visible = Boolean(x.top && x.vivant);
    }
    for (const [k, p] of pirates) if (!vus.has(k)) {
      if (combat && (combat.a === p || combat.b === p)) finirCombat();
      if (fete?.p === p) fete = null;
      scene.remove(p.groupe); p.tex.dispose(); pirates.delete(k); etiquettes.get(k)?.remove(); etiquettes.delete(k);
    }
    // la marée monte : une grande vague part de l'île
    if (niveauCible > dernierNiveau && anime) { anneau(0, 0, new THREE.Color(0.55, 0.8, 1), R * 1.9, 2.6, niveauCible + 0.5); son("maree"); }
    dernierNiveau = niveauCible;
    // le suspense du duel : les deux pirates se font face, la caméra va vers eux
    const s = mode === "direct" && d.suspense && pirates.get(d.suspense.a) && pirates.get(d.suspense.b) ? d.suspense : null;
    if (s && (!suspense || suspense.a !== s.a || suspense.b !== s.b)) {
      commencerCombat(pirates.get(s.a), pirates.get(s.b));
      son("suspense");
    }
    let vedette = false;
    if (!s && suspense) {
      // le résultat : le choc, si c'est bien ce duel-là qu'on attendait
      const du = dr?.duel;
      if (combat && anime && !reduit && du && ((du.a === combat.a.k && du.b === combat.b.k) || (du.a === combat.b.k && du.b === combat.a.k))) {
        vedette = true;
        combat.phase = "choc";
        combat.t0 = horloge;
        combat.res = du;
        combat.tag = (dr.fil || []).find((l) => l.type === "duel" && l.a === du.gagnant && l.b === du.perdant)?.tag || "";
      } else finirCombat();
      focusJusqua = horloge + 5.5; // on garde le résultat à l'écran quelques secondes
    }
    suspense = s;
    if (nouveau) {
      if (anime && !reduit) programmer(dr, vedette, d.rythme || 7);
      else solder();
      dernierRound = dr.round;
    }
    // la fête du survivant
    const f = d.fete != null ? pirates.get(d.fete) : null;
    if (f && fete?.p !== f) {
      fete = { p: f, prochain: horloge + 0.4 };
      focusCible = viser(f);
      focusCible.distance = 74;
      focusCible.angle = 0.1; // presque à sa hauteur : le ciel et les feux d'artifice derrière lui
      focusCible.haut = 15;
      focusJusqua = Infinity;
      son("victoire");
    }
    if (!f && fete) { fete = null; faisceau.visible = false; focusJusqua = horloge + 1; }
  }
  function poserTombe(p) {
    p.tete.visible = false;
    p.groupe.children[0].visible = false;
    p.tombe.visible = true;
  }
  function relever(p) {
    p.etat = "debout"; p.fige = false; p.anim = null; p.aTomber = null; p.vite = 0; p.arene = null;
    p.tete.visible = true;
    p.groupe.children[0].visible = true;
    p.tombe.visible = false;
    p.groupe.rotation.set(0, 0, 0);
    p.tete.rotation.set(0, 0, 0);
    const m = versMonde(p.d.x, p.d.y);
    p.pos = { ...m }; p.cible = { ...m };
  }
  // chacun tombe à sa façon
  function tomber(p, cause) {
    if (p.etat !== "debout") return;
    p.etat = "tombe";
    p.aTomber = null;
    p.fige = true;
    p.anim = { cause, t0: horloge };
    redessiner(p); // l'affiche devient grise et barrée
    p.couronne.visible = false;
    const pos = new THREE.Vector3(p.groupe.position.x, sol(p.pos.x, p.pos.z) + 5, p.groupe.position.z);
    if (cause === "duel" || cause === "trahison") gerbe(pos, new THREE.Color(1, 0.95, 0.8), 30, 11);
    else if (cause === "bete" || cause === "maree") gerbe(pos.setY(niveau + 1), new THREE.Color(0.55, 0.85, 1), 40, 13, 22);
    else if (cause === "piege") gerbe(pos.setY(sol(p.pos.x, p.pos.z) + 1), TERRE, 30, 7, 10);
    else gerbe(pos, new THREE.Color(0.8, 0.6, 1), 22, 8);
    son(cause === "bete" || cause === "maree" ? "plouf" : cause === "absurde" ? "envol" : "tombe");
  }

  // ---------- la caméra : elle tourne doucement autour de l'île ; on peut la faire tourner en glissant ----------
  let azimut = -0.9, azimutCible = -0.9, glisse = null;
  const vise = new THREE.Vector3(0, 6, 0), visee = new THREE.Vector3(0, 6, 0);
  let distance = 100, distanceCible = 100, angleCam = 0.3;
  canvas.addEventListener("pointerdown", (e) => { glisse = { x: e.clientX, a: azimutCible, bouge: false }; canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => {
    if (!glisse) return;
    const dx = e.clientX - glisse.x;
    if (Math.abs(dx) > 4) glisse.bouge = true;
    azimutCible = glisse.a - dx * 0.006;
  });
  const raycaster = new THREE.Raycaster();
  canvas.addEventListener("pointerup", (e) => {
    const clic = glisse && !glisse.bouge;
    glisse = null;
    if (!clic) return;
    // un clic sur une affiche : on choisit ce pirate (pour le tonneau de rhum)
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const cibles = [...pirates.values()].filter((p) => p.etat === "debout").map((p) => p.affiche);
    const t = raycaster.intersectObjects(cibles)[0];
    if (t) {
      const p = [...pirates.values()].find((x) => x.affiche === t.object);
      if (p) surPirate(p.k);
    }
  });
  canvas.addEventListener("pointercancel", () => { glisse = null; });
  // vers où regarder un ou deux pirates : de côté (les deux affiches côte à côte), depuis la mer
  function viser(a, b) {
    const A = a.arene || a.cible, B = b ? b.arene || b.cible : null;
    const x = B ? (A.x + B.x) / 2 : A.x, z = B ? (A.z + B.z) / 2 : A.z;
    let ox = x - VOLCAN.x, oz = z - VOLCAN.z;
    const lo = Math.hypot(ox, oz) || 1; ox /= lo; oz /= lo;
    let dx = ox, dz = oz, ecart = 0;
    if (B) {
      const ax = B.x - A.x, az = B.z - A.z;
      ecart = Math.hypot(ax, az);
      if (ecart > 0.5) { dx = -az / ecart; dz = ax / ecart; if (dx * ox + dz * oz < 0) { dx = -dx; dz = -dz; } }
      // un peu de la direction « depuis la mer » pour garder le volcan derrière
      dx = dx * 0.7 + ox * 0.3; dz = dz * 0.7 + oz * 0.3;
    }
    const voulu = Math.atan2(dz, dx);
    let ecartAngle = voulu - azimutCible;
    ecartAngle = Math.atan2(Math.sin(ecartAngle), Math.cos(ecartAngle));
    azimutCible += ecartAngle;
    return { x, z, distance: Math.max(38, Math.min(72, ecart * 1.3 + 32)) };
  }
  function focus(k) {
    const p = pirates.get(k);
    if (!p || fete || combat) return;
    focusCible = viser(p);
    focusJusqua = horloge + 6;
  }

  // ---------- l'animation ----------
  let horloge = 0, raf = 0, enPause = true, arrete = false, l = 1, h = 1, hauteurLisse = 30;
  const v3 = new THREE.Vector3();
  function placerMouettes(t) {
    for (const m of mouettes) {
      const a = m.ph + t * m.v, sens = m.v < 0 ? -1 : 1;
      m.g.position.set(m.cx + Math.cos(a) * m.r, Math.max(m.h, niveau + 16) + Math.sin(t * 0.7 + m.ph) * 2.2, m.cz + Math.sin(a) * m.r);
      m.g.rotation.set(0, Math.atan2(-Math.sin(a) * sens, Math.cos(a) * sens), -sens * 0.22, "YXZ");
      const bat = Math.sin(t * 6.5 + m.ph) * (0.22 + 0.36 * (0.5 + 0.5 * Math.sin(t * 0.37 + m.ph * 3)));
      m.ad.rotation.z = bat;
      m.ag.rotation.z = -bat;
      m.g.visible = m.g.position.distanceToSquared(camera.position) > 34 * 34;
    }
  }
  placerMouettes(0);
  function animer(dt) {
    const t = horloge;
    uCiel.uT.value = t;
    // les éclairs au loin, de temps en temps
    uCiel.uEclair.value = Math.max(0, uCiel.uEclair.value - dt * 3);
    if (!reduit && Math.random() < dt * 0.08) uCiel.uEclair.value = 0.6 + Math.random() * 0.4;
    // la marée monte doucement jusqu'à son niveau
    niveau += (niveauCible - niveau) * Math.min(1, dt * 0.6);
    uMer.uNiveau.value = niveau;
    // les palmiers et les bosquets sous l'eau disparaissent
    for (const p of palmiers) {
      p.groupe.visible = p.y > niveau + 0.3;
      if (!reduit) p.palmes.rotation.z = Math.sin(t * 1.3 + p.phase) * 0.05;
    }
    // la fumée monte, les braises jaillissent
    for (const s of fumees) {
      const u = s.userData;
      const tt = (u.t + t * u.v) % 1;
      const dx = tt * tt * 95 + u.ox * (0.3 + tt);
      s.position.set(VOLCAN.x + dx, sommet + tt * 62, VOLCAN.z - tt * 22 + u.oz);
      const k2 = 5 + tt * 26;
      s.scale.set(k2, k2, 1);
      s.material.opacity = (0.22 - tt * 0.14) * Math.min(1, tt * 8);
    }
    for (let k = 0; k < NBR; k++) {
      const a = vieBraises[k * 4], b = vieBraises[k * 4 + 1], c = vieBraises[k * 4 + 2], v = vieBraises[k * 4 + 3];
      const tt = (a + t * 0.12 * v) % 1;
      posBraises[k * 3] = VOLCAN.x + (b - 0.5) * (6 + tt * 60) + tt * 20;
      posBraises[k * 3 + 1] = sommet + tt * 55 - tt * tt * 12;
      posBraises[k * 3 + 2] = VOLCAN.z + (c - 0.5) * (6 + tt * 30);
    }
    geoBraises.attributes.position.needsUpdate = true;
    lueurVolcan.intensity = 900 * (0.85 + 0.15 * Math.sin(t * 3.7) * Math.sin(t * 1.3));
    if (!reduit) { texLave.offset.x = -t * 0.18; matLac.map.offset.set(Math.sin(t * 0.21) * 0.3, t * 0.04); }
    halo.material.opacity = 0.75 + 0.15 * Math.sin(t * 2.2);
    // la vie autour : les mouettes, les navires qui tanguent, les torches, les lucioles
    if (!reduit) placerMouettes(t);
    for (const n of navires) {
      n.g.position.y = niveau - 0.9 * n.taille + (reduit ? 0 : Math.sin(t * 0.9 + n.ph) * 0.25);
      if (!reduit) { n.g.rotation.z = Math.sin(t * 0.7 + n.ph) * 0.04; n.g.rotation.x = Math.sin(t * 0.5 + n.ph * 2) * 0.03; }
      n.lanterne.scale.setScalar(3.4 * (0.9 + (reduit ? 0 : 0.12 * Math.sin(t * 9 + n.ph))));
    }
    for (const tr of torches) {
      const allumee = tr.y > niveau + 0.5;
      tr.flamme.visible = tr.lueurSol.visible = allumee;
      tr.poteau.visible = tr.y > niveau - 1.6;
      if (!allumee) continue;
      const f = reduit ? 1 : 0.85 + 0.2 * Math.sin(t * 11 + tr.ph) * Math.sin(t * 7.3 + tr.ph * 2);
      tr.flamme.scale.set(1.5 * f, 2.2 * f, 1);
      tr.lueurSol.material.opacity = 0.5 * f;
    }
    if (!reduit) {
      const pl = geoLucioles.attributes.position.array;
      for (let k = 0; k < NL; k++) {
        const bx = baseLucioles[k * 4], by = baseLucioles[k * 4 + 1], bz = baseLucioles[k * 4 + 2], ph = baseLucioles[k * 4 + 3];
        const noyee = by < niveau + 0.5;
        pl[k * 3] = bx + Math.sin(t * 0.6 + ph) * 1.3;
        pl[k * 3 + 1] = noyee ? -50 : by + 2 + Math.sin(t * 0.9 + ph * 2) * 0.9;
        pl[k * 3 + 2] = bz + Math.cos(t * 0.5 + ph * 1.7) * 1.3;
      }
      geoLucioles.attributes.position.needsUpdate = true;
      lucioles.material.opacity = 0.7 + 0.3 * Math.sin(t * 3.1);
    }
    // les événements du round, l'un après l'autre ; puis ceux qui devaient tomber sans événement à eux
    while (file.length && file[0].t0 <= horloge) jouer(file.shift().l);
    if (!file.length && !(combat && combat.phase === "choc" && combat.etapes < 2)) {
      for (const p of pirates.values()) if (p.aTomber && p.etat === "debout") tomber(p, p.aTomber);
    }
    for (let k = effets.length - 1; k >= 0; k--) {
      const e = effets[k];
      const u = (horloge - e.t0) / e.duree;
      if (u < 0) continue;
      e.maj(Math.min(1, u));
      if (u >= 1) { e.fin?.(); effets.splice(k, 1); }
    }
    if (combat) animerCombat();
    // la fête
    if (fete) {
      const p = fete.p;
      if (!reduit && horloge >= fete.prochain) { fete.prochain = horloge + 0.45 + Math.random() * 0.75; feu(); }
      faisceau.visible = p.etat === "debout";
      faisceau.position.set(p.groupe.position.x, p.groupe.position.y + 42, p.groupe.position.z);
      faisceau.material.opacity = 0.13 + 0.05 * Math.sin(t * 2.4);
      faisceau.rotation.y = t * 0.3;
    }
    // la caméra
    const enFocus = focusCible && horloge < focusJusqua;
    if (!glisse && !reduit && (!enFocus || fete)) azimutCible += dt * (fete ? 0.09 : 0.045);
    azimut += (azimutCible - azimut) * Math.min(1, dt * 3);
    if (!enFocus && focusCible && horloge >= focusJusqua) focusCible = null;
    const cx = enFocus ? focusCible.x : 0, cz = enFocus ? focusCible.z : 0;
    // en portrait (téléphone) on recule pour garder l'île entière
    const recul = l / h < 1.2 ? Math.min(1.8, Math.pow(1.25 / Math.max(0.45, l / h), 0.9)) : 1;
    distanceCible = (enFocus ? focusCible.distance : 100) * recul;
    distance += (distanceCible - distance) * Math.min(1, dt * 1.6);
    vise.set(cx, enFocus ? sol(cx, cz) + (focusCible.haut ?? 10) : 10, cz);
    visee.lerp(vise, Math.min(1, dt * 1.8));
    angleCam += ((enFocus ? focusCible.angle ?? 0.5 : 0.3) - angleCam) * Math.min(1, dt * 2);
    camera.position.set(visee.x + Math.cos(azimut) * distance, visee.y + angleCam * distance, visee.z + Math.sin(azimut) * distance);
    // la caméra ne passe jamais à travers l'île : on la remonte si la vue est bouchée
    {
      let y = Math.max(camera.position.y, hauteur(camera.position.x, camera.position.z) + 6, niveau + 4);
      if (enFocus) for (let k = 1; k < 7; k++) {
        const f = k / 8;
        const hx = camera.position.x + (visee.x - camera.position.x) * f, hz = camera.position.z + (visee.z - camera.position.z) * f;
        const besoin = (hauteur(hx, hz) + 3.5 - visee.y * f) / (1 - f);
        if (besoin > y) y = besoin;
      }
      hauteurLisse += (y - hauteurLisse) * Math.min(1, dt * 4);
      camera.position.y = Math.max(y - 0.001, hauteurLisse);
    }
    // le choc d'un duel secoue la caméra
    if (tremblement > 0) {
      camera.position.x += (Math.random() - 0.5) * tremblement * 2.2;
      camera.position.y += (Math.random() - 0.5) * tremblement * 2.2;
      tremblement = Math.max(0, tremblement - dt * 1.3);
    }
    camera.lookAt(visee);
    ciel.position.copy(camera.position);
    uMer.uCam.value.copy(camera.position);
    // les pirates : ils vont vers leur place (en sautant), l'affiche regarde la caméra, ceux du duel grandissent
    const r = canvas.getBoundingClientRect();
    for (const p of pirates.values()) {
      const but = p.arene || p.cible;
      const vitesse = Math.min(1, dt * (p.vite || (p.arene ? 3.2 : 2)));
      p.pos.x += (but.x - p.pos.x) * vitesse;
      p.pos.z += (but.z - p.pos.z) * vitesse;
      const y = sol(p.pos.x, p.pos.z);
      let ox = 0, oy = 0, oz = 0;
      if (p.saut !== null) {
        const sv = (horloge - p.saut) / 0.45;
        if (sv >= 1) p.saut = null;
        else if (sv > 0) oy += Math.sin(sv * Math.PI) * 1.6;
      }
      if (p.trajet > 0) {
        const reste = Math.hypot(but.x - p.pos.x, but.z - p.pos.z);
        if (reste < 0.3) p.trajet = 0;
        else if (!reduit) oy += Math.sin(Math.PI * Math.min(1, reste / p.trajet)) * Math.min(4, p.trajet * 0.18);
      }
      if (p.elan) {
        const se = (horloge - p.elan.t0) / 0.5;
        if (se >= 1) p.elan = null;
        else { const ke = Math.sin(se * Math.PI) * 0.6; ox += (p.elan.x - p.pos.x) * ke; oz += (p.elan.z - p.pos.z) * ke; }
      }
      const enDuel = Boolean(combat && (combat.a === p || combat.b === p));
      if (enDuel) { const o = decalageCombat(p); ox += o.x; oy += o.y; oz += o.z; }
      p.groupe.position.set(p.pos.x + ox, y + oy, p.pos.z + oz);
      p.tete.rotation.y = Math.atan2(camera.position.x - p.groupe.position.x, camera.position.z - p.groupe.position.z);
      const enFete = fete?.p === p;
      const cible = (enFete ? 2.1 : enDuel ? 1.7 : p.d.top && p.d.vivant ? 1.3 : 1) * 1.35;
      p.echelle += (cible - p.echelle) * Math.min(1, dt * 4);
      if (p.etat === "debout") {
        p.groupe.scale.setScalar(p.echelle);
        // pendant le suspense, les deux affiches tremblent et se penchent l'une vers l'autre
        const tension = enDuel && combat.phase === "face" ? Math.min(1, (horloge - combat.t0) / 6) : 0;
        const penche = enDuel ? (combat.a === p ? -1 : 1) * 0.07 : 0;
        p.tete.rotation.z = reduit ? 0 : Math.sin(t * 1.8 + p.phase) * 0.04 * (enDuel ? 2.2 : 1) + penche + Math.sin(t * 37 + p.phase) * 0.03 * tension;
        p.aura.material.map = enDuel ? (combat.a === p ? texHaloBleu : texHaloRouge) : texHaloOr;
        p.aura.material.opacity += ((enDuel || enFete ? 0.95 : p.d.top ? 0.6 : 0) - p.aura.material.opacity) * Math.min(1, dt * 4);
      }
      // la chute
      if (p.anim) {
        const u = (horloge - p.anim.t0) / 1.4;
        const c = p.anim.cause;
        if (u >= 1) { p.anim = null; p.vite = 0; poserTombe(p); p.groupe.rotation.set(0, 0, 0); p.tete.rotation.set(0, 0, 0); p.groupe.position.y = y; p.groupe.scale.setScalar(1); }
        else if (c === "absurde") { p.groupe.position.y = y + u * u * 30; p.groupe.rotation.y = u * 20; p.groupe.scale.setScalar(p.echelle * (1 - u)); }
        else if (c === "bete" || c === "maree" || c === "piege") { p.groupe.position.y = y - u * u * 9; p.groupe.rotation.z = u * 0.6; }
        else {
          // il tombe en arrière, à l'opposé de la caméra (jamais sur elle)
          const k = Math.min(1, u * 1.6) ** 2;
          p.groupe.rotation.order = "YXZ";
          p.groupe.rotation.y = p.tete.rotation.y;
          p.tete.rotation.y = 0;
          p.groupe.rotation.x = -k * 1.45;
          p.groupe.rotation.z = Math.sin(u * 14) * 0.06 * (1 - u);
          if (k >= 1 && !p.anim.boum) { p.anim.boum = true; gerbe(new THREE.Vector3(p.groupe.position.x, y + 0.6, p.groupe.position.z), TERRE, 18, 6, 12); }
        }
      }
      if (p.etat === "tombe" && !p.anim) {
        // les tombes du bord partent avec la marée
        p.tombe.visible = hauteur(p.pos.x, p.pos.z) > niveau + 0.2;
      }
      // le nom : seulement pour la tête de liste et le survivant (pendant le duel, le face-à-face donne déjà les noms)
      const montrer = p.etat === "debout" && !enDuel && ((p.d.top && p.d.vivant) || enFete);
      const e = etiquettes.get(p.k);
      if (montrer) {
        v3.set(p.groupe.position.x, p.groupe.position.y + 9 * p.echelle, p.groupe.position.z).project(camera);
        const el = etiquette(p.k, `${p.d.nom} · ${court(p.d.prime)} ฿`, "or");
        if (el) { el.style.transform = `translate(${((v3.x + 1) / 2) * r.width}px, ${((1 - v3.y) / 2) * r.height}px) translate(-50%, -100%)`; el.hidden = v3.z > 1; }
      } else if (e) e.hidden = true;
    }
    // ce qui s'envole
    for (let k = flottants.length - 1; k >= 0; k--) {
      const f = flottants[k];
      const u = (horloge - f.t0) / 2.4;
      if (u >= 1) { f.e.remove(); flottants.splice(k, 1); continue; }
      v3.copy(f.monde).setY(f.monde.y + u * 7).project(camera);
      f.e.style.transform = `translate(${((v3.x + 1) / 2) * r.width}px, ${((1 - v3.y) / 2) * r.height}px) translate(-50%, -50%) scale(${0.8 + Math.min(1, u * 6) * 0.3})`;
      f.e.style.opacity = String(Math.min(1, (1 - u) * 3));
    }
    for (let k = eclats.length - 1; k >= 0; k--) {
      const s = eclats[k];
      const u = s.userData;
      u.vie += dt;
      u.v.y -= u.g * dt;
      s.position.addScaledVector(u.v, dt);
      s.material.opacity = Math.max(0, 1 - u.vie / u.max);
      if (u.vie > u.max) { scene.remove(s); s.material.dispose(); eclats.splice(k, 1); }
    }
  }
  let facteur = 1; // la vitesse du temps sur l'île (la rediff peut passer en ×2)
  function dessiner(dt) {
    dt *= facteur;
    horloge += dt;
    animer(Math.min(dt, 0.05 * facteur));
    rendreJuste(rendu, scene, camera);
  }
  let avant = performance.now();
  function image(maintenant) {
    const dt = Math.max(0, Math.min(0.1, (maintenant - avant) / 1000));
    avant = maintenant;
    dessiner(dt);
    raf = enPause ? 0 : requestAnimationFrame(image);
  }
  function pause(oui) {
    if (arrete) return;
    enPause = Boolean(oui);
    if (!enPause && !raf) { avant = performance.now(); raf = requestAnimationFrame(image); }
    if (enPause && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function redimensionner() {
    const r = canvas.getBoundingClientRect();
    l = Math.max(1, r.width); h = Math.max(1, r.height);
    rendu.setSize(l, h, false);
    camera.aspect = l / h;
    camera.updateProjectionMatrix();
    if (enPause) dessiner(0);
  }
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(redimensionner) : null;
  ro?.observe(canvas);
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); canvas.dispatchEvent(new CustomEvent("battle-perdu")); });
  redimensionner();
  return {
    etat, focus, pause, redimensionner,
    vitesse(v) { facteur = Math.max(0.25, Math.min(4, Number(v) || 1)); },
    avancer(dt, rendre = true) { horloge += dt; animer(Math.min(dt, 0.05)); if (rendre) rendreJuste(rendu, scene, camera); },
    arreter() {
      arrete = true;
      pause(true);
      ro?.disconnect();
      for (const e of etiquettes.values()) e.remove();
      for (const f of flottants) f.e.remove();
      file.length = 0;
      effets.length = 0;
      rendu.dispose();
    },
  };
}
