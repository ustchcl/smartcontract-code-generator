import { Command } from "commander";
import * as path from "path";
import * as fs from 'fs'
import { genByFile } from "./CodeGenerator";
import { baseTsContent } from "./base";

const program = new Command()

program.name('contract-gen')
  .description('CLI to generate typescript code by abi json')
  .version('0.1.0')
  .option('-i, --input [input]', 'input dir')
  .option('-o, --output [output]', 'output dir')

program.parse()

const options = program.opts()

function stepByDir(dir: string, func: (dir: string, file: fs.Dirent) => void) {
  fs.readdir(dir, { withFileTypes: true }, (err, files) => {
    if (err) {
      throw err;
    }
    files.filter(file => file.isFile()).forEach(f => func(dir, f));
    files.filter(file => file.isDirectory()).forEach((f) => {
      stepByDir(path.join(dir, f.name), func);
    })
  });
}

function exists(path: fs.PathLike): Promise<boolean> {
  return new Promise((resolve) => {
    fs.stat(path, (err, _) => {
      if (err) {
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}

function mkdir(path: fs.PathLike): Promise<void> {
  return new Promise((resolve, reject) => {
      fs.mkdir(path, { recursive: true }, err => {
          if (err) reject(err);
          resolve();
      });
  });
}

export async function write(file: fs.PathLike, ...content: string[]) {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(file, Buffer.from(content.join(''), "utf-8"), err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  })
}

export async function copyFile(src: fs.PathLike, dest: fs.PathLike) {
  return new Promise<void>((resolve, reject) => {
    fs.copyFile(src, dest, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  })
}

async function mkDirIfNotExist(path: fs.PathLike) {
  const isExist = await exists(path)
  if (!isExist) {
    await mkdir(path)
  }
}

async function main() {
  console.log(options.input, options.output)
  if (!options.input || !options.output) {
    help()
    process.exit(0)
  }
  await mkDirIfNotExist(options.output)
  await write(path.join(options.output, 'base.ts'), baseTsContent)

  const jsonDir = path.join(options.output, 'json')
  const contractsDir = path.join(options.output, 'contracts')
  await mkDirIfNotExist(jsonDir)
  await mkDirIfNotExist(contractsDir)
  stepByDir(options.input, async (dir, file) => {
    const src =  path.join(dir, file.name)
    const content = await genByFile(src)
    await write(path.join(options.output, 'contracts', file.name.replace('.json', '.ts')), content)
    await copyFile(src, path.join(options.output, 'json', file.name))
    console.log(`[成功]: ${file.name}`)
  })
}

function help() {
  console.log(
    `
Usage: contract-gen [options]

CLI to generate typescript code by abi json

Options:
  -V, --version          output the version number
  -i, --input [input]    input dir
  -o, --output [output]  output dir
  -h, --help             display help for command
`
  )
}

main()