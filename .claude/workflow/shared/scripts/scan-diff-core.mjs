/**
 * Motor agnóstico al stack para barrer patrones de riesgo SOLO en las líneas añadidas
 * del diff (árbol de trabajo vs merge-base con la rama base) y en los archivos nuevos
 * sin trackear. Lo usan los scripts scan-diff.mjs de angular-sec y express-sec, que
 * aportan sus propias reglas.
 *
 * El resultado es un punto de partida para la revisión manual, no un veredicto.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/**
 * @typedef {{ id: string, owasp: string, sev: string, re: RegExp, hint: string, files?: RegExp }} Rule
 * @typedef {{ file: string, line: number, text: string }} AddedLine
 * @typedef {{ rule: string, owasp: string, severity: string, file: string, line: number, code: string, hint: string }} Finding
 */

// Artefactos y tooling de agentes (.claude/: skills, scripts y fixtures de evals con vulnerabilidades a propósito).
const ALWAYS_IGNORED = /(^|\/)(node_modules|dist|\.angular|coverage)\/|package-lock\.json$|^\.claude\//;

function git(argv) {
  try {
    return execFileSync('git', argv, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    console.error(`git ${argv.join(' ')} falló: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
}

/** Lee `--base` y `--json` de argv. */
export function parseArgs(argv = process.argv.slice(2)) {
  const i = argv.indexOf('--base');
  return { base: i >= 0 && argv[i + 1] ? argv[i + 1] : 'main', asJson: argv.includes('--json') };
}

/**
 * Devuelve las líneas añadidas respecto de merge-base(HEAD, base), incluidos los
 * cambios sin commitear y los archivos nuevos sin trackear.
 * @returns {{ mergeBase: string, lines: AddedLine[] }}
 */
export function collectAddedLines(base) {
  const mergeBase = git(['merge-base', 'HEAD', base]).trim();
  /** @type {AddedLine[]} */
  const lines = [];
  let file = null;
  let lineNo = 0;
  for (const raw of git(['diff', '-U0', '--no-color', '--no-ext-diff', mergeBase]).split('\n')) {
    if (raw.startsWith('+++ ')) {
      file = raw === '+++ /dev/null' ? null : raw.replace(/^\+\+\+ b\//, '');
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      lineNo = Number(hunk[1]);
      continue;
    }
    if (file && raw.startsWith('+')) {
      lines.push({ file, line: lineNo, text: raw.slice(1) });
      lineNo += 1;
    }
  }
  for (const f of git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean)) {
    if (!existsSync(f)) continue;
    readFileSync(f, 'utf8')
      .split('\n')
      .forEach((text, i) => lines.push({ file: f, line: i + 1, text }));
  }
  return { mergeBase, lines };
}

/**
 * Ejecuta el barrido completo e imprime el resultado (Markdown o JSON).
 * @param {{ title: string, rules: Rule[], scanned: RegExp, ignored?: RegExp,
 *           extraChecks?: (lines: AddedLine[]) => Finding[] }} options
 */
export function runScan({ title, rules, scanned, ignored, extraChecks }) {
  const { base, asJson } = parseArgs();
  const { mergeBase, lines } = collectAddedLines(base);
  const inScope = lines.filter(
    (l) => scanned.test(l.file) && !ALWAYS_IGNORED.test(l.file) && !(ignored && ignored.test(l.file)),
  );
  const files = [...new Set(inScope.map((l) => l.file))].sort();

  /** @type {Finding[]} */
  const findings = [];
  for (const l of inScope) {
    for (const r of rules) {
      if ((!r.files || r.files.test(l.file)) && r.re.test(l.text)) {
        findings.push({ rule: r.id, owasp: r.owasp, severity: r.sev, file: l.file, line: l.line, code: l.text.trim().slice(0, 160), hint: r.hint });
      }
    }
  }
  if (extraChecks) findings.push(...extraChecks(inScope));

  if (asJson) {
    console.log(JSON.stringify({ base, mergeBase, filesInScope: files, addedLines: inScope.length, findings }, null, 2));
    return;
  }
  console.log(`# ${title}: base ${base} (merge-base ${mergeBase.slice(0, 7)})\n`);
  console.log(`Archivos en alcance (${files.length}):`);
  for (const f of files) console.log(`- ${f}`);
  console.log(`\nLíneas añadidas analizadas: ${inScope.length}\n`);
  if (findings.length === 0) {
    console.log('Sin coincidencias de patrones. La revisión manual sigue siendo obligatoria.');
    return;
  }
  console.log(`Coincidencias (${findings.length}). Confirmar o descartar cada una manualmente:\n`);
  console.log('| Severidad sugerida | OWASP | Regla | Ubicación | Código | Pista |');
  console.log('|---|---|---|---|---|---|');
  for (const f of findings) {
    console.log(`| ${f.severity} | ${f.owasp} | ${f.rule} | \`${f.file}:${f.line}\` | \`${f.code.replace(/\|/g, '\\|')}\` | ${f.hint} |`);
  }
}

/** Detecta dependencias añadidas o actualizadas en package.json (A03). */
export function newDependencyCheck(owasp, hint) {
  /** @param {AddedLine[]} lines */
  return (lines) =>
    lines
      .filter((l) => /(^|\/)package\.json$/.test(l.file) && /^\s*"(@?[\w./-]+)"\s*:\s*"[~^]?\d/.test(l.text))
      .map((l) => ({ rule: 'new-dependency', owasp, severity: 'informativa', file: l.file, line: l.line, code: l.text.trim(), hint }));
}
