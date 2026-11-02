import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const cvRoot = path.join(projectRoot, "CV");
const publicCvRoot = path.join(projectRoot, "public", "cvs");
const rawAssetsRoot = path.join(cvRoot, "asstes shamsa");

mkdirSync(publicCvRoot, { recursive: true });

for (const [source, target] of [
  ["index.html", "index.html"],
  ["index.html", "kaleem-durrani.html"],
  ["shamsa-durrani.html", "shamsa-durrani.html"],
  ["kaleem-durrani-cv.pdf", "kaleem-durrani-cv.pdf"],
  ["shamsa-durrani-cv.pdf", "shamsa-durrani-cv.pdf"],
]) {
  copyFileSync(path.join(cvRoot, source), path.join(publicCvRoot, target));
}

cpSync(
  path.join(cvRoot, "assets"),
  path.join(publicCvRoot, "assets"),
  { recursive: true, force: true }
);

for (const htmlFile of ["index.html", "shamsa-durrani.html"]) {
  const html = readFileSync(path.join(cvRoot, htmlFile), "utf8");
  const referencedAssets = new Set(
    [...html.matchAll(/\b(?:src|href|poster)=["']([^"']+)["']/g)]
      .map((match) => match[1])
      .filter((reference) => reference.startsWith("asstes%20shamsa/"))
  );

  for (const reference of referencedAssets) {
    const relativeAssetPath = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
    const sourcePath = path.resolve(cvRoot, relativeAssetPath);
    const sourceRelativePath = path.relative(rawAssetsRoot, sourcePath);

    if (
      sourceRelativePath.startsWith("..") ||
      path.isAbsolute(sourceRelativePath)
    ) {
      throw new Error(`CV asset path is outside the source directory: ${reference}`);
    }

    const destinationPath = path.join(publicCvRoot, relativeAssetPath);

    if (existsSync(sourcePath)) {
      mkdirSync(path.dirname(destinationPath), { recursive: true });
      copyFileSync(sourcePath, destinationPath);
    } else if (!existsSync(destinationPath)) {
      throw new Error(`CV asset is missing from source and public output: ${reference}`);
    }
  }
}
