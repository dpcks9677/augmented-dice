import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const projectRoot = process.cwd();
const vaultRoot = process.env.OBSIDIAN_VAULT_DIR || "C:/Users/dpcks/OneDrive/문서/obsidianMind";
const projectName = "Augmented Dice";
const event = process.argv[2] || "unknown";
const now = new Date();
const pad = (value) => String(value).padStart(2, "0");
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

async function readPayload() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  if (!input.trim()) return {};
  try { return JSON.parse(input); } catch { return { raw: input }; }
}

function clean(value, limit = 240) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

async function git(args) {
  try {
    const result = await exec("git", ["-C", projectRoot, ...args], { windowsHide: true });
    return result.stdout.trim();
  } catch { return "확인하지 못했음"; }
}

async function changedFiles() {
  const output = await git(["status", "--short"]);
  return output ? output.split(/\r?\n/).map((line) => line.slice(3)).filter(Boolean).slice(0, 20) : [];
}

async function append(section) {
  const path = join(vaultRoot, "work", "logs", date.slice(0, 4), `${date}.md`);
  await mkdir(dirname(path), { recursive: true });
  try { await readFile(path); } catch { await appendFile(path, `# ${projectName} 작업 로그 — ${date}\n\n`, "utf8"); }
  await appendFile(path, `${section}\n`, "utf8");
}

const payload = await readPayload();
let section = `## ${time} — ${event}\n\n- 프로젝트: ${projectName}\n`;

if (event === "prompt") {
  const prompt = clean(payload.prompt || payload.user_prompt || payload.message || payload.input || "요청 내용 확인 필요함");
  section += `- 요청: ${prompt}\n- 상태: 작업 시작함\n`;
} else if (event === "response") {
  const files = await changedFiles();
  section += `- 상태: 응답 완료함\n- 변경 파일: ${files.length ? files.join(", ") : "없음"}\n- 상세 작업·결정·검증: ObsidianMind record_work에 기록함\n`;
} else if (event === "compact") {
  const files = await changedFiles();
  const branch = await git(["branch", "--show-current"]);
  const snapshot = join(vaultRoot, "work", "compactions", date.slice(0, 4), `${date}-${pad(now.getHours())}${pad(now.getMinutes())}.md`);
  await mkdir(dirname(snapshot), { recursive: true });
  await appendFile(snapshot, `# Context Compact — ${date} ${time}\n\n- 프로젝트: ${projectName}\n- 브랜치: ${branch || "확인하지 못했음"}\n- 변경 파일: ${files.length ? files.join(", ") : "없음"}\n- 다음 작업: ObsidianMind에서 최근 record_work를 recall하여 이어서 진행함\n`, "utf8");
  section += `- 상태: compact snapshot 저장함\n- snapshot: ${snapshot}\n`;
}

try { await append(section); } catch (error) { process.stderr.write(`obsidian-log-hook: ${error.message}\n`); }
