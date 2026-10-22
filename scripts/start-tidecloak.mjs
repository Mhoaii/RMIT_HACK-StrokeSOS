import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
const envFile = path.join(process.cwd(), '.env.local');
if (existsSync(envFile)) process.loadEnvFile(envFile);
if (!process.env.KC_BOOTSTRAP_ADMIN_PASSWORD || !process.env.TIDE_LICENSE_EMAIL || process.env.TIDE_TERMS_ACCEPTED !== 'yes') {
  console.error('Set a strong KC_BOOTSTRAP_ADMIN_PASSWORD, your own TIDE_LICENSE_EMAIL, and TIDE_TERMS_ACCEPTED=yes in .env.local after accepting https://tide.org/legal. No container was created.');
  process.exit(2);
}
const workspaceDocker = path.join(process.cwd(), 'tools/docker/resources/bin/docker.exe');
const docker = process.env.TIDECLOAK_DOCKER_EXE || (existsSync(workspaceDocker) ? workspaceDocker : 'docker');
// A custom Docker installation needs its credential helper on PATH too.
const childEnv = { ...process.env };
const pathKey = Object.keys(childEnv).find(key => key.toLowerCase() === 'path') || 'PATH';
if (path.isAbsolute(docker)) childEnv[pathKey] = `${path.dirname(docker)}${path.delimiter}${childEnv[pathKey] || ''}`;
const child = spawn(docker,['compose','--env-file',envFile,'-f','compose.tidecloak.yml','up','-d'],{stdio:'inherit',windowsHide:true,env:childEnv});
child.on('error',error=>{console.error(`Docker could not start: ${error.message}. Install/start Docker Desktop first.`);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code || 0;if(!code)console.log('TideCloak starting at http://localhost:8080. Finish the realm wizard and account enrollment, then export data/tidecloak.json.');});
