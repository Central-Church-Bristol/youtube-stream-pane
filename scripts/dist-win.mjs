import { spawn } from "node:child_process"
import { cp, mkdir, readdir, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const releaseDir = path.join(root, "release")
const tempDir = path.join(os.tmpdir(), `live-pane-build-${process.pid}`)
const tempDirArg = tempDir.replaceAll("\\", "/")

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit", shell: true })
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} exited ${code}`))
    })
  })
}

await rm(tempDir, { recursive: true, force: true })
await run("npm.cmd", ["run", "build"])
await run("npx.cmd", ["electron-builder", "--win", `--config.directories.output=${tempDirArg}`])

await mkdir(releaseDir, { recursive: true })
const names = await readdir(tempDir)
for (const name of names) {
  if (!name.endsWith(".exe") && !name.endsWith(".blockmap") && !name.endsWith(".yml") && !name.endsWith(".yaml")) {
    continue
  }
  await cp(path.join(tempDir, name), path.join(releaseDir, name), { force: true })
}
await rm(tempDir, { recursive: true, force: true })

console.log(`\nInstaller is ready:\n  ${path.join(releaseDir, "LivePane-1.0.0-windows.exe")}\nRun that file to replace the installed app.`)
