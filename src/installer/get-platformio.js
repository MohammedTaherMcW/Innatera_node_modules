/**
 * Copyright (c) 2017-present PlatformIO <contact@platformio.org>
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import * as core from '../core';

import { promises as fs } from 'fs';
import { getCommandOutput } from '../proc';
import path from 'path';

export const INSTALLER_SCRIPT_VERSION = '1.2.2';

const PYTHON_SCRIPT_CODE = `
import os
import shutil
import subprocess
import sys
import tempfile
from base64 import b64decode

def check_pip_installed():
    try:
        subprocess.run([sys.executable, '-m', 'pip', '--version'], check=True)
        print("pip is already installed.")
        return True
    except subprocess.CalledProcessError:
        print("pip is not installed.")
        return False

def install_pip():
    try:
        subprocess.run([sys.executable, '-m', 'ensurepip'], check=True)
        print("pip has been installed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Failed to install pip: {e}")
        sys.exit(1)

def bootstrap():
    try:
        subprocess.call(
            [
                "git",
                "clone",
                "https://github.com/MohammedTaherMcW/Innatera_core_installer.git",
            ]
        )
    except subprocess.CalledProcessError as exc:
        print("File exist")  
        
    import pioinstaller.__main__

    pioinstaller.__main__.main()
    os.remove("/Innatera_core_installer")

def main():        
        sys.path.insert(0, os.getcwd()+"/Innatera_core_installer")        
        bootstrap()

if __name__ == "__main__":
    main()
`;

export async function getInstallerScript() {
  const scriptPath = path.join(
    core.getTmpDir(),
    `get-platformio-${INSTALLER_SCRIPT_VERSION}.py`,
  );
  try {
    await fs.access(scriptPath);
    const cachedContents = await fs.readFile(scriptPath, { encoding: 'utf-8' });
    if (cachedContents.trim() !== PYTHON_SCRIPT_CODE.trim()) {
      throw Error('Broken script');
    }
  } catch (err) {
    await fs.writeFile(scriptPath, PYTHON_SCRIPT_CODE, { encoding: 'utf-8' });
  }
  return scriptPath;
}

export async function callInstallerScript(pythonExecutable, args) {
  const envClone = Object.assign({}, process.env);
  envClone.PLATFORMIO_CORE_DIR = core.getCoreDir();
  return await getCommandOutput(
    pythonExecutable,
    [await getInstallerScript(), ...args],
    {
      spawnOptions: {
        cwd: core.getCacheDir(),
        env: envClone,
      },
    },
  );
}
