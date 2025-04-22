// import { StrictMode } from 'react'
import { WebContainer } from '@webcontainer/api';
import { files } from './files.js';
import useStore from './lib/store.ts';
// import { initNetwork } from './lib/network.ts';

/** @type {import('@webcontainer/api').WebContainer}  */
let webcontainerInstance: WebContainer;

window.addEventListener('load', async () => {
  webcontainerInstance = await WebContainer.boot();
  await webcontainerInstance.mount(files);

  const exitCode = await installDependencies();
  
  if (exitCode !== 0) {
    throw new Error('Installation failed');
  };

  // installProcess.output.pipeTo(new WritableStream({
  //   write(data) {
  //     console.log(data);
  //   }
  // }));

  await startDevServer();
});

async function installDependencies() {
  const installProcess = await webcontainerInstance.spawn('npm', ['install']);
  return installProcess.exit;
}

async function startDevServer() {
  const startProcess = await webcontainerInstance.spawn('npm', ['run', 'start']);

  webcontainerInstance.on('server-ready', async (port, url) => {
    console.log(`Server ready at ${url}, port: ${port}`);
    (window as any).webContainerUrl = url;
    // useStore.getState().initializeSocket(url);
    const hsyncCon = await hsync.dynamicConnect();
    console.log(hsyncCon)

    // const peer = hsyncCon.getRPCPeer({ hostName: 'h5ebkzt8.hsync.tech' }); 
    // console.log(peer)
  });

  startProcess.output.pipeTo(new WritableStream({
    write(data) {
      console.log('[Server]', data);
    }
  }));

  return new Promise((resolve) => {
    startProcess.exit.then(resolve);
  });
}

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.js'

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <App />
  // </StrictMode>,
)
