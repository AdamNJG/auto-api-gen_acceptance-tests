import { describe, test, expect, afterEach, beforeEach} from "vitest";
import { spawn } from 'node:child_process';
import * as fs from "node:fs";
import os from "os";
import path from "node:path";

const configName = 'autoapi.config.ts';
const defaultsFolder = './__tests__/defaults/';
describe('Cli tests', () => {

let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auto-api-gen-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  test('no config found, exit message advising to create one', async () => {
    const cli = spawn('npx auto-api-gen dev', { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    cli.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    cli.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const exitCode = await new Promise<number>((resolve, reject) => {
      cli.on('exit', (code) => resolve(code ?? 0));
      cli.on('error', reject);
    });

    expect(exitCode).toBe(1);
    expect(stderr).toContain('no config found, make one called autoapi.config.ts');
  });

  test('config found but no test files found', async () => {
    await copyFilesToRoot(path.join(defaultsFolder, configName), configName);

    const cli = spawn('npx auto-api-gen dev', { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stdout = '';
    let stderr = '';

    cli.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    cli.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const exitCode = await new Promise<number>((resolve, reject) => {
      cli.on('exit', (code) => resolve(code ?? 0));
      cli.on('error', reject);
    });

    expect(exitCode).toBe(1);
    expect(stderr).toContain('No endpoints found to map for ./api');
    expect(stderr).toContain('No valid api files able to be created from the config and file system, exiting creation');
  });

  test('config and folder found, site runs', async () => {
    await copyFilesToRoot(path.join(defaultsFolder, configName), configName);
    await copyFolderToRoot('./__tests__/defaults/api', 'api')

    const cli = spawn('npx auto-api-gen dev', { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stdout = '';
    let stderr = '';

    cli.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    cli.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    await new Promise(r => setTimeout(r, 2000));
    cli.kill();

    const exitCode = await new Promise<number>((resolve, reject) => {
      cli.on('exit', (code) => resolve(code ?? 0));
      cli.on('error', reject);
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('generated endpoints: generated\\api.js');
    expect(stdout).toContain('generated server entrypoint: ./generated/index.js');
    expect(stdout).toContain('Example app listening on port 4000');
  });

  test('config and folder found, site rebuilds on file change', async () => {
    await copyFilesToRoot(path.join(defaultsFolder, configName), configName);
    await copyFolderToRoot('./__tests__/defaults/api', 'api')

    const cli = spawn('npx auto-api-gen dev', { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stdout = '';
    let stderr = '';

    cli.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    cli.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    await new Promise(r => setTimeout(r, 1500));
    await fs.promises.copyFile('./api/index.js', './api/test.js');

    await new Promise(r => setTimeout(r, 3000));
    cli.kill();

    const exitCode = await new Promise<number>((resolve, reject) => {
      cli.on('exit', (code) => resolve(code ?? 0));
      cli.on('error', reject);
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain('generated endpoints: generated\\api.js');
    expect(stdout).toContain('generated server entrypoint: ./generated/index.js');
    expect(stdout).toContain('Example app listening on port 4000');
    expect(stdout).toContain('[DEV] Rebuilding server...');
  });

  test('config and folder found, api request matches', async () => {
    await copyFilesToRoot(path.join(defaultsFolder, configName), configName);
    await copyFolderToRoot('./__tests__/defaults/api', 'api')

    const cli = spawn('npx auto-api-gen dev', { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server never started')), 5000);
      cli.stdout.on('data', (chunk) => {
        if (chunk.toString().includes('Example app listening on port 4000')) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    const result = await fetch('http://localhost:4000');
    cli.kill();

    expect(result.status).toBe(200);
    const data = await result.json();
    expect(data.message).toBe("hello!");
  });
});

async function copyFilesToRoot(sourceDir: string, fileName: string) {
  await fs.promises.copyFile(sourceDir, `${process.cwd()}/${fileName}`);
}

async function copyFolderToRoot(sourceDir: string, folderName: string) {
  await fs.promises.cp(sourceDir, `${process.cwd()}/${folderName}`, {recursive: true});
}

async function deleteFileFromRoot(fileName: string){
  const filePath = path.join(process.cwd(), fileName);
  if (fs.existsSync(filePath)) {
    await fs.promises.rm(filePath);
  }
}

async function deleteFolderFromRoot(folderName: string) { 
  const folderPath = path.join(process.cwd(), folderName);
  if (fs.existsSync(folderPath)) {
    await fs.promises.rm(folderPath, {recursive: true, force: true})
  }
}