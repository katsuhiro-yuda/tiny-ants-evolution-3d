/**
 * このプロジェクトの開発サーバーを停止する。
 *
 * 動作確認のたびに別ポートで起動するとサーバーが残り続けるため、確認が
 * 終わったら必ずこれで止める。
 *
 * ポートを占有しているのが本当にこのリポジトリのプロセスかを確認してから
 * 停止する。5173 のようなVite既定ポートは他プロジェクトと衝突しやすく、
 * ポート番号だけで判断すると無関係なサーバーを落としてしまうため。
 *
 * 使い方: npm run dev:stop [ポート番号]
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ポートは vite.config.ts と共有する（dev-server.config.json が唯一の定義）
const devServerConfig = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'dev-server.config.json'), 'utf8'),
);
const port = Number(process.argv[2] ?? devServerConfig.port);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`ポート番号が不正です: ${process.argv[2]}`);
  process.exit(1);
}

/** PowerShell を実行し、標準出力を返す。 */
function powershell(command) {
  return execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8',
  }).trim();
}

/**
 * 指定ポートを待ち受けているプロセスを返す。
 *
 * netstat は使わない。Vite は IPv6（::1）で待ち受けるが `netstat -p TCP` は
 * IPv4 しか列挙せず、開発サーバーを取りこぼすため。
 */
function findListeners(targetPort) {
  // Windows PowerShell 5.1 には ConvertTo-Json の -AsArray がないため @() で配列化する
  const script = [
    `@(Get-NetTCPConnection -LocalPort ${targetPort} -State Listen -ErrorAction SilentlyContinue |`,
    `ForEach-Object {`,
    `$proc = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $_.OwningProcess) -ErrorAction SilentlyContinue;`,
    `[PSCustomObject]@{ ProcessId = $_.OwningProcess; CommandLine = $proc.CommandLine } } |`,
    `Sort-Object ProcessId -Unique) | ConvertTo-Json -Compress -Depth 3`,
  ].join(' ');

  const json = powershell(script);
  if (!json) {
    return [];
  }

  // 要素が1つならオブジェクト、複数なら配列で返る
  const parsed = JSON.parse(json);
  const entries = Array.isArray(parsed) ? parsed : [parsed];

  return entries.map((entry) => ({
    pid: String(entry.ProcessId),
    commandLine: entry.CommandLine ?? '',
  }));
}

const listeners = findListeners(port);

if (listeners.length === 0) {
  console.log(`ポート ${port} で待ち受けているプロセスはありません。`);
  process.exit(0);
}

let stopped = 0;

for (const { pid, commandLine } of listeners) {
  // このリポジトリ配下のプロセスでなければ触らない
  if (!commandLine.toLowerCase().includes(projectRoot.toLowerCase())) {
    console.warn(
      `ポート ${port} は別のプロセスが使用しています。停止しません。\n` +
        `  PID: ${pid}\n  コマンド: ${commandLine || '(取得できません)'}`,
    );
    continue;
  }

  execFileSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'inherit' });
  stopped += 1;
}

if (stopped === 0) {
  process.exitCode = 1;
} else {
  console.log(`ポート ${port} の開発サーバーを停止しました。`);
}
