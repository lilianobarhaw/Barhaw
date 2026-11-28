// La Battle Royale de GRAND LINE sur le site : « L'Île sans retour » en 3D, en direct.
//   • l'île (inventée) : un volcan qui fume et crache des braises, la lave, la jungle, les palmiers, les épaves, la mer
//     qui monte à chaque marée (elle rétrécit l'île), le ciel d'orage au coucher du soleil
//   • les pirates : chacun est une petite affiche WANTED plantée sur un piquet, avec sa photo et sa prime, là où le bot
//     l'a placé (les mêmes places que sur l'image du Discord) ; la tête de liste a une couronne et un cadre doré
//   • le duel du round : la caméra va vers les deux pirates, leurs affiches grandissent et s'éclairent (bleu contre rouge)
//     pendant le suspense ; au résultat, le perdant tombe (le sabre, la mer, la créature, le piège : chacun sa façon),
//     le gagnant saute, « +425 000 ฿ » s'envole. Les tombés restent en petites tombes ; la marée emporte celles du bord
//   • avant la battle : l'île tourne doucement, avec les affiches des têtes d'affiche et celle du dernier survivant
// creerBattle3D(toile, { couche, petit, reduit, photo, surPirate }) → { etat(d), focus(k), pause(oui), redimensionner(), arreter() }
//   d : { mode: "attente" | "direct", maree, round, pirates: [{ k, nom, avatar, prime, x, y, vivant, top, vies, mort }],
//         suspense: { a, b } | null, dernier: { round, fil, duel } | null, survivant: { nom, avatar, prime } | null }
//   couche : un calque (div) au-dessus de la toile, pour les étiquettes (noms, gains qui s'envolent)
import * as THREE from "./three-r170.module.min.js";

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
function dessinerAffichette(c, { nom, prime, image, top, mort }) {
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
  if (mort) {
    g.globalCompositeOperation = "saturation";
    g.fillStyle = "#000"; g.fillRect(0, 0, L, H);
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = "rgba(196,30,34,0.9)"; g.lineWidth = L * 0.07; g.lineCap = "round";
    g.beginPath(); g.moveTo(L * 0.15, H * 0.2); g.lineTo(L * 0.85, H * 0.78); g.moveTo(L * 0.85, H * 0.2); g.lineTo(L * 0.15, H * 0.78); g.stroke();
  }
}

export function creerBattle3D(canvas, { couche = null, petit = false, reduit = false, photo = (u) => u, surPirate = () => {} } = {}) {
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
    uSoleil: { value: SOLEIL }, uZenith: { value: new THREE.Color(0x081a44) }, uMilieu: { value: new THREE.Color(0x2a3f86) },
    uHorizon: { value: new THREE.Color(0xff9a4a) }, uSoleilC: { value: new THREE.Color(0xffb060) },
    uNuageSombre: { value: new THREE.Color(0x2a2a5a) }, uNuageBord: { value: new THREE.Color(0xffc070) },
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
    const sable = new THREE.Color(0xd9b27a), sableMouille = new THREE.Color(0x8a6a48), herbe = new THREE.Color(0x3c7a3a), jungle = new THREE.Color(0x1f4a2a);
    const roche = new THREE.Color(0x4a4048), rocheSombre = new THREE.Color(0x231c22), cendre = new THREE.Color(0x1a1418), braise = new THREE.Color(0x5a1a0e);
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
  const matLave = new THREE.MeshBasicMaterial({ color: 0xffffff, map: texLave, toneMapped: false, fog: false });
  const matLac = new THREE.MeshBasicMaterial({ color: 0xffffff, map: texLave.clone(), toneMapped: false });
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
  const lueurVolcan = new THREE.PointLight(0xff5a1a, 900, 120, 1.6);
  lueurVolcan.position.set(VOLCAN.x, fondCratere + 6, VOLCAN.z);
  scene.add(lueurVolcan);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: lueur("rgba(255,120,40,1)"), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(VOLCAN.x, fondCratere + 5, VOLCAN.z);
  halo.scale.set(34, 26, 1);
  scene.add(halo);

  // ---------- la végétation ----------
  const matTronc = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });
  const matPalme = new THREE.MeshStandardMaterial({ color: 0x2f6a2e, roughness: 0.8, side: THREE.DoubleSide });
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
  const bosquets = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x1e4224, roughness: 0.95, flatShading: true }), NB);
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
        bosquetsInfo.push({ h, m: m.clone() });
        n++;
      }
    }
    bosquets.count = n;
    scene.add(bosquets);
  }
  // ---------- les rochers et les épaves ----------
  const matRoche = new THREE.MeshStandardMaterial({ color: 0x2c262c, roughness: 0.95, flatShading: true });
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
  const matBois = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.9 });
  const matVoile = new THREE.MeshStandardMaterial({ color: 0x6a1a1a, roughness: 0.9, side: THREE.DoubleSide });
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
  const uMer = { ...uCiel, uCam: { value: new THREE.Vector3() }, uH: { value: texH }, uTaille: { value: TAILLE }, uNiveau: { value: 0 }, uEau: { value: new THREE.Color(0x14506e) }, uEauProfonde: { value: new THREE.Color(0x062038) } };
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
    const col = new THREE.Color(0x2a2230).lerp(new THREE.Color(0x0e0a12), Math.min(1, t * 1.4)).add(new THREE.Color(0.7 * lum, 0.16 * lum, 0.03 * lum));
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

  // ---------- les lumières ----------
  const soleil = new THREE.DirectionalLight(0xffb070, 3.0);
  soleil.position.copy(SOLEIL).multiplyScalar(300).setY(120);
  scene.add(soleil);
  scene.add(new THREE.HemisphereLight(0x5a78c0, 0x201814, 0.85));
  const lune = new THREE.DirectionalLight(0x8aa0ff, 0.5);
  lune.position.set(-120, 160, 120);
  scene.add(lune);
  scene.fog = new THREE.FogExp2(new THREE.Color(0xff9a4a).multiplyScalar(0.45).lerp(new THREE.Color(0x2a3f86), 0.5), 0.0026);

  // ---------- les pirates ----------
  const pirates = new Map(); // k → { groupe, affiche, tex, c, d, pos, ... }
  const matPiquet = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 });
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
  function creerPirate(d) {
    const c = toile(160, 224);
    const tex = texture(c);
    const groupe = new THREE.Group();
    const piquet = new THREE.Mesh(geoPiquet, matPiquet);
    piquet.position.y = 1.6;
    groupe.add(piquet);
    const tete = new THREE.Group(); // l'affiche (elle se tourne vers la caméra)
    tete.position.y = 3.6;
    const affiche = new THREE.Mesh(geoAffiche, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.22 }));
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
    const p = { k: d.k, d, c, tex, groupe, tete, affiche, aura, couronne, tombe, image: null, pos: { x: 0, z: 0 }, cible: { x: 0, z: 0 }, etat: "debout", anim: null, phase: Math.random() * 9, echelle: 1 };
    const m = versMonde(d.x, d.y);
    p.pos = { ...m }; p.cible = { ...m };
    redessiner(p);
    chargerImage(d.avatar ? photo(d.avatar) : d.portrait != null ? `/img/battle/portraits/${String(d.portrait).padStart(2, "0")}.png` : "")
      .then((img) => { p.image = img; redessiner(p); })
      .catch(() => {});
    return p;
  }
  function redessiner(p) {
    dessinerAffichette(p.c, { nom: p.d.nom, prime: p.d.prime, image: p.image, top: p.d.top && p.d.vivant, mort: !p.d.vivant });
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
  // les éclats (le sabre, la mer, la poussière)
  const eclats = [];
  const texEclat = lueur("rgba(255,255,255,1)", 64);
  function gerbe(pos, couleur, n = 26, force = 9, gravite = 18) {
    for (let k = 0; k < n; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEclat, color: couleur, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.position.copy(pos);
      const a = Math.random() * Math.PI * 2, b = Math.random() * 0.9 + 0.2;
      s.userData = { v: new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b) * 1.4, Math.sin(a) * Math.cos(b)).multiplyScalar(force * (0.4 + Math.random() * 0.8)), vie: 0, max: 0.7 + Math.random() * 0.6, g: gravite, s: 0.5 + Math.random() * 0.7 };
      s.scale.setScalar(s.userData.s);
      scene.add(s);
      eclats.push(s);
    }
  }

  // ---------- l'état reçu du bot ----------
  let mode = "attente";
  let suspense = null; // { a, b }
  let dernierRound = -1;
  let focusCible = null; // { x, y, z, distance }
  let focusJusqua = 0;
  function etat(d) {
    mode = d.mode || "attente";
    niveauCible = NIVEAUX[Math.max(0, Math.min(4, d.maree || 0))];
    const vus = new Set();
    for (const x of d.pirates || []) {
      vus.add(x.k);
      let p = pirates.get(x.k);
      if (!p) { p = creerPirate(x); pirates.set(x.k, p); }
      const avant = p.d;
      p.d = x;
      const m = versMonde(x.x, x.y);
      p.cible = m;
      if (avant.vivant && !x.vivant && p.etat === "debout") tomber(p, x.mort?.cause || "duel");
      else if (!x.vivant && p.etat === "debout") { p.etat = "tombe"; poserTombe(p); }
      if (avant.top !== x.top || avant.prime !== x.prime || avant.vivant !== x.vivant || avant.nom !== x.nom) redessiner(p);
      p.couronne.visible = Boolean(x.top && x.vivant);
    }
    for (const [k, p] of pirates) if (!vus.has(k)) { scene.remove(p.groupe); p.tex.dispose(); pirates.delete(k); etiquettes.get(k)?.remove(); etiquettes.delete(k); }
    // le suspense du duel : la caméra va vers les deux pirates
    const s = d.suspense && pirates.get(d.suspense.a) && pirates.get(d.suspense.b) ? d.suspense : null;
    if (s && (!suspense || suspense.a !== s.a || suspense.b !== s.b)) {
      focusCible = viser(pirates.get(s.a), pirates.get(s.b));
      focusJusqua = Infinity;
    }
    if (!s && suspense) focusJusqua = horloge + 5; // on garde le résultat à l'écran quelques secondes
    suspense = s;
    // le résultat du round : ce qui s'envole au-dessus des pirates
    const dr = d.dernier;
    if (dr && dr.round !== dernierRound) {
      if (dernierRound >= 0) for (const l of dr.fil || []) {
        const qui = pirates.get(l.type === "rhum" ? l.a : l.a ?? l.b);
        if (!qui || !l.tag) continue;
        const pos = new THREE.Vector3(qui.pos.x, sol(qui.pos.x, qui.pos.z) + 9, qui.pos.z);
        if (/฿/.test(l.tag) && l.a != null) flotter(l.tag, pos, "or");
        else if (l.tag === "+1 VIE") flotter("🍺 +1 VIE", pos, "vert");
        else if (l.tag === "+1 FORCE") flotter("💰 +1 FORCE", pos, "or");
        else if (l.tag === "TIENT BON" || l.tag === "ESQUIVE") flotter(l.tag, new THREE.Vector3(pirates.get(l.b)?.pos.x ?? qui.pos.x, pos.y, pirates.get(l.b)?.pos.z ?? qui.pos.z), "bleu");
      }
      if (dr.duel && dernierRound >= 0 && !focusCible) {
        const a = pirates.get(dr.duel.a), b = pirates.get(dr.duel.b);
        if (a && b) { focusCible = viser(a, b); focusJusqua = horloge + 6; }
      }
      dernierRound = dr.round;
    }
    if (mode !== "direct") { suspense = null; }
  }
  function poserTombe(p) {
    p.tete.visible = false;
    p.groupe.children[0].visible = false;
    p.tombe.visible = true;
  }
  // chacun tombe à sa façon
  function tomber(p, cause) {
    p.etat = "tombe";
    p.anim = { cause, t0: horloge };
    const pos = new THREE.Vector3(p.pos.x, sol(p.pos.x, p.pos.z) + 5, p.pos.z);
    if (cause === "duel" || cause === "trahison") gerbe(pos, new THREE.Color(1, 0.95, 0.8), 30, 11);
    else if (cause === "bete" || cause === "maree") gerbe(pos.setY(niveau + 1), new THREE.Color(0.55, 0.85, 1), 40, 13, 22);
    else if (cause === "piege") gerbe(pos.setY(sol(p.pos.x, p.pos.z) + 1), new THREE.Color(0.85, 0.7, 0.5), 30, 7, 10);
    else gerbe(pos, new THREE.Color(0.8, 0.6, 1), 22, 8);
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
  // vers où regarder un ou deux pirates : de côté (les deux affiches côte à côte), depuis la mer
  function viser(a, b) {
    const x = b ? (a.cible.x + b.cible.x) / 2 : a.cible.x, z = b ? (a.cible.z + b.cible.z) / 2 : a.cible.z;
    let ox = x - VOLCAN.x, oz = z - VOLCAN.z;
    const lo = Math.hypot(ox, oz) || 1; ox /= lo; oz /= lo;
    let dx = ox, dz = oz, ecart = 0;
    if (b) {
      const ax = b.cible.x - a.cible.x, az = b.cible.z - a.cible.z;
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
    if (!p) return;
    focusCible = viser(p);
    focusJusqua = horloge + 6;
  }

  // ---------- l'animation ----------
  let horloge = 0, raf = 0, enPause = true, arrete = false, l = 1, h = 1, hauteurLisse = 30;
  const v3 = new THREE.Vector3();
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
    // la caméra
    if (!glisse && !reduit && !(focusCible && horloge < focusJusqua)) azimutCible += dt * 0.045;
    azimut += (azimutCible - azimut) * Math.min(1, dt * 3);
    const enFocus = focusCible && horloge < focusJusqua;
    if (!enFocus && focusCible && horloge >= focusJusqua) focusCible = null;
    const cx = enFocus ? focusCible.x : 0, cz = enFocus ? focusCible.z : 0;
    // en portrait (téléphone) on recule pour garder l'île entière
    const recul = l / h < 1.2 ? Math.min(1.8, Math.pow(1.25 / Math.max(0.45, l / h), 0.9)) : 1;
    distanceCible = (enFocus ? focusCible.distance : 100) * recul;
    distance += (distanceCible - distance) * Math.min(1, dt * 1.6);
    vise.set(cx, enFocus ? sol(cx, cz) + 10 : 10, cz);
    visee.lerp(vise, Math.min(1, dt * 1.8));
    angleCam += ((enFocus ? 0.5 : 0.3) - angleCam) * Math.min(1, dt * 2);
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
    camera.lookAt(visee);
    ciel.position.copy(camera.position);
    uMer.uCam.value.copy(camera.position);
    // les pirates : ils glissent vers leur place, l'affiche regarde la caméra, ceux du duel grandissent
    const r = canvas.getBoundingClientRect();
    for (const p of pirates.values()) {
      p.pos.x += (p.cible.x - p.pos.x) * Math.min(1, dt * 2);
      p.pos.z += (p.cible.z - p.pos.z) * Math.min(1, dt * 2);
      const y = sol(p.pos.x, p.pos.z);
      p.groupe.position.set(p.pos.x, y, p.pos.z);
      p.tete.rotation.y = Math.atan2(camera.position.x - p.pos.x, camera.position.z - p.pos.z);
      const enDuel = suspense && (suspense.a === p.k || suspense.b === p.k);
      const cible = (enDuel ? 1.7 : p.d.top && p.d.vivant ? 1.3 : 1) * 1.35;
      p.echelle += (cible - p.echelle) * Math.min(1, dt * 4);
      if (p.etat === "debout") {
        p.groupe.scale.setScalar(p.echelle);
        p.tete.rotation.z = reduit ? 0 : Math.sin(t * 1.8 + p.phase) * 0.04 * (enDuel ? 2.5 : 1);
        p.aura.material.map = enDuel ? (suspense.a === p.k ? texHaloBleu : texHaloRouge) : texHaloOr;
        p.aura.material.opacity += ((enDuel ? 0.95 : p.d.top ? 0.6 : 0) - p.aura.material.opacity) * Math.min(1, dt * 4);
      }
      // la chute
      if (p.anim) {
        const u = (horloge - p.anim.t0) / 1.4;
        const c = p.anim.cause;
        if (u >= 1) { p.anim = null; poserTombe(p); p.groupe.rotation.set(0, 0, 0); p.groupe.position.y = y; p.groupe.scale.setScalar(1); }
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
          if (k >= 1 && !p.anim.boum) { p.anim.boum = true; gerbe(new THREE.Vector3(p.pos.x, y + 0.6, p.pos.z), new THREE.Color(0.85, 0.72, 0.55), 18, 6, 12); }
        }
      }
      if (p.etat === "tombe" && !p.anim) {
        // les tombes du bord partent avec la marée
        p.tombe.visible = hauteur(p.pos.x, p.pos.z) > niveau + 0.2;
      }
      // le nom : seulement pour la tête de liste, ceux du duel et ceux qu'on montre
      // (pendant le duel, les cartes du face-à-face donnent déjà les noms)
      const montrer = p.etat === "debout" && !enDuel && p.d.top && p.d.vivant;
      const e = etiquettes.get(p.k);
      if (montrer) {
        v3.set(p.pos.x, y + 3.6 * p.echelle + 5.4 * p.echelle, p.pos.z).project(camera);
        const el = etiquette(p.k, `${p.d.nom} · ${court(p.d.prime)} ฿`, enDuel ? (suspense.a === p.k ? "bleu" : "rouge") : "or");
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
  function dessiner(dt) {
    horloge += dt;
    animer(Math.min(dt, 0.05));
    rendu.render(scene, camera);
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
    avancer(dt, rendre = true) { horloge += dt; animer(Math.min(dt, 0.05)); if (rendre) rendu.render(scene, camera); },
    arreter() {
      arrete = true;
      pause(true);
      ro?.disconnect();
      for (const e of etiquettes.values()) e.remove();
      for (const f of flottants) f.e.remove();
      rendu.dispose();
    },
  };
}
