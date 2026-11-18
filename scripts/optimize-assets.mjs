/**
 * Asset pipeline — turns the original WordPress media (assets/source/) into
 * optimised, consistently named WebP files in public/images/.
 *
 * Several of the original banner photos were exported from Elementor with a
 * ~75% white overlay baked into the pixels. `restore: true` mathematically
 * reverses that wash (x = (x' - (1 - a) * 255) / a) so the real photography
 * can be used again at full colour.
 *
 * Run:  npm run assets
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("assets/source");
const OUT = path.resolve("public/images");
const BRAND = path.resolve("public/brand");
const APP = path.resolve("src/app");

/**
 * inset: px trimmed from every edge — several 629×612 originals carry an 8–9px
 * red Elementor corner bracket baked into the image.
 * @type {Array<{ src: string; out: string; width: number; restore?: boolean; quality?: number; inset?: number }>}
 */
const images = [
  // Portrait / editorial photography (original quality)
  { src: "About-us-F-img-scaled.webp", out: "hero-caregiver-walker", width: 1800 },
  { inset: 12, src: "Layer-78.png", out: "caregiver-senior-smile", width: 900 },
  { inset: 12, src: "Layer-80.jpg", out: "home-health-walker", width: 900 },
  { inset: 12, src: "Who-We-are.jpg", out: "companion-laughter", width: 900 },
  { inset: 12, src: "Why-Ideal-Select-Care.jpg", out: "mobility-wheelchair", width: 900 },
  { inset: 12, src: "Why-Non-Licensed-Healthcare-Support_.jpg", out: "clinician-tablet", width: 900 },
  { src: "Layer-72.jpg", out: "hands-held", width: 900 },
  { src: "Layer-73.jpg", out: "veteran-visit", width: 900 },
  { src: "Layer-75.jpg", out: "respite-sunset", width: 900 },
  { inset: 12, src: "Layer-91.png", out: "quality-assurance", width: 900 },
  { inset: 12, src: "Layer-81.png", out: "core-values", width: 900 },
  { inset: 12, src: "Layer-80.png", out: "our-vision", width: 900 },
  { inset: 12, src: "Binding-Service-Agreement-Requirements.png", out: "legal-agreement", width: 900 },
  { inset: 12, src: "Privacy-Data-Security-Policies.png", out: "legal-privacy", width: 900 },
  { inset: 12, src: "Limitation-of-Liability.jpg", out: "legal-liability", width: 900 },

  // Banners with a baked-in white wash — restored
  { src: "Hero-Section.jpg", out: "team-healthcare-staff", width: 1600, restore: true },
  { src: "Layer-77.png", out: "team-clinicians", width: 1600, restore: true },
  { src: "Layer-76.jpg", out: "patient-recovery", width: 1600, restore: true },
  { src: "Get-Care.jpg", out: "hands-compassion", width: 1600, restore: true },
  { src: "Get-job.jpg", out: "careers-handshake", width: 1600, restore: true },
  { src: "Layer-77-1.png", out: "senior-companion", width: 1600, restore: true },
  { src: "Layer-79-1.png", out: "team-together", width: 1600, restore: true },
  { src: "Layer-86.jpg", out: "home-visit-tablet", width: 1600, restore: true },
  { src: "Layer-99.jpg", out: "office-team", width: 1600, restore: true },
  { src: "Section-background-image.png", out: "caregiver-greeting", width: 1600, restore: true },
  { src: "Your-Partner-of-Choice-for-Compassionate-Non-Licensed-Healthcare-Assistance.jpg", out: "supportive-hands", width: 1600, restore: true },
  { src: "Hero-Section-Background-image.jpg", out: "legal-justice", width: 1600, restore: true },
];

async function restoreWash(file) {
  const stats = await sharp(file).removeAlpha().stats();
  const min = Math.min(...stats.channels.map((c) => c.min));
  const a = Math.max((255 - min) / 255, 0.05);
  return sharp(file).removeAlpha().linear(1 / a, -((1 - a) * 255) / a);
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(BRAND, { recursive: true });
  const manifest = {};

  for (const img of images) {
    const file = path.join(SRC, img.src);
    let pipe = img.restore ? await restoreWash(file) : sharp(file).removeAlpha();
    if (img.inset) {
      const m = await sharp(file).metadata();
      const i = img.inset;
      pipe = pipe.extract({ left: i, top: i, width: m.width - 2 * i, height: m.height - 2 * i });
    }
    const target = path.join(OUT, `${img.out}.webp`);
    const info = await pipe
      .resize({ width: img.width, withoutEnlargement: true })
      .webp({ quality: img.quality ?? 80, effort: 5 })
      .toFile(target);
    manifest[img.out] = { width: info.width, height: info.height };
    console.log(`✓ ${img.out}.webp  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)}kB`);
  }

  // Brand: original badge logo (transparent PNG)
  const logo = path.join(SRC, "Ideal-Select-Care-and-Support-Service-Staff-logo-designn.png");
  await sharp(logo).resize(256).webp({ quality: 90 }).toFile(path.join(BRAND, "logo-badge.webp"));
  await sharp(logo).resize(256).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(path.join(BRAND, "logo-badge.png"));
  await sharp(logo).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(path.join(BRAND, "logo-badge-full.png"));
  // App icons (Next.js file conventions)
  await sharp(logo).resize(192, 192).png({ palette: true, quality: 85, compressionLevel: 9 }).toFile(path.join(APP, "icon.png"));
  await sharp(logo)
    .resize(160, 160)
    .extend({ top: 10, bottom: 10, left: 10, right: 10, background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .png({ palette: true, quality: 85, compressionLevel: 9 })
    .toFile(path.join(APP, "apple-icon.png"));

  // Open Graph image (1200×630): restored team photo + navy gradient + badge
  const team = await (await restoreWash(path.join(SRC, "Hero-Section.jpg")))
    .resize(1200, 630, { fit: "cover", position: "top" })
    .png()
    .toBuffer();
  const overlay = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#071a33" stop-opacity="0.96"/>
          <stop offset="0.55" stop-color="#0a2547" stop-opacity="0.82"/>
          <stop offset="1" stop-color="#0a2547" stop-opacity="0.15"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#g)"/>
      <text x="72" y="300" font-family="Georgia, serif" font-size="58" fill="#ffffff">Compassionate Care.</text>
      <text x="72" y="370" font-family="Georgia, serif" font-size="58" fill="#ffffff">Exceptional Professionals.</text>
      <text x="72" y="440" font-family="Georgia, serif" font-size="58" fill="#5eead4">Better Outcomes.</text>
      <text x="72" y="540" font-family="Arial, sans-serif" font-size="26" fill="#cbd5e1" letter-spacing="2">IDEAL SERVICE STAFF · (310) 462-1700</text>
    </svg>`);
  const badge = await sharp(logo).resize(150).png().toBuffer();
  await sharp(team)
    .composite([{ input: overlay }, { input: badge, left: 72, top: 70 }])
    .jpeg({ quality: 84 })
    .toFile(path.join(APP, "opengraph-image.jpg"));
  fs.copyFileSync(path.join(APP, "opengraph-image.jpg"), path.join(APP, "twitter-image.jpg"));

  fs.writeFileSync(path.resolve("src/content/generated/image-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("✓ brand, icons, OG image, manifest");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
