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
    print("Implementing Bootstrap begins")

    try:

        print("Try block of Bootstrap")
        subprocess.call(
            [
                "git",
                "clone",
                "https://github.com/MohammedTaherR/innatera_node_modules.git",
            ]
        )

        print("Cloning Successful")
        
    except subprocess.CalledProcessError as exc:
        print("File exist")  
    
    if not check_pip_installed():
      install_pip()    
    subprocess.call(["python", "-m", "pip", "install", "wheel"])
    subprocess.call(["python", "-m", "pip", "install", "click"])
    subprocess.call(["python", "-m", "pip", "install", "colorama"])
    subprocess.call(["python", "-m", "pip", "install", "idna"])
    subprocess.call(["python", "-m", "pip", "install", "requests"])
    subprocess.call(
        ["python", "-m", "pip", "install", "semantic_version"]
    )
    subprocess.call(["python", "-m", "pip", "install", "urllib3"])
    subprocess.call(["python", "-m", "pip", "install", "certifi"])
    subprocess.call(
        ["python", "-m", "pip ", "install", "charset_normalizer"]
    )
    import pioinstaller.__main__
    print("Main of Pio installer")

    pioinstaller.__main__.main()

    print("Installation Completed")

def main():
        
        print("Implementing Bootstrap")
        
        sys.path.insert(0, os.getcwd()+"/innatera_node_modules")
        print(sys.path)
        bootstrap()

if __name__ == "__main__":
    print("Installation Begins")
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
  console.log("scriptPath  ",scriptPath);
  return scriptPath;
}

export async function callInstallerScript(pythonExecutable, args) {
  const envClone = Object.assign({}, process.env);
  envClone.PLATFORMIO_CORE_DIR = core.getCoreDir();
  console.log("Python Executable from get-platform.js", pythonExecutable);
  console.log("COmmand output args", args, "   " );
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
