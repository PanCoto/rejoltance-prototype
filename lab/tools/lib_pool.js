'use strict';
// lib_pool.js - minimal worker-thread pool. A tool file is both the main program and the worker script:
//   const P = require('./lib_pool');
//   if (!P.isMain) { P.serve(job => handle(job)); return; }          // worker side
//   const pool = P.create(__filename, args, nWorkers); const res = await pool.run(jobs); pool.close();   // main side
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
exports.isMain = isMainThread;
exports.workerArgs = () => workerData && workerData.args;
exports.serve = function (handler) { parentPort.on('message', async m => { try { parentPort.postMessage({ id: m.id, res: await handler(m.job) }); } catch (e) { parentPort.postMessage({ id: m.id, err: String(e && e.stack || e) }); } }); };
exports.create = function (file, args, n) {
  const ws = Array.from({ length: n }, () => new Worker(file, { workerData: { args } }));
  let failRun = null; // one persistent error handler per worker (a listener per run() call leaked and triggered MaxListeners warnings)
  ws.forEach(w => w.on('error', e => { if (failRun) failRun(e); }));
  return {
    n,
    run(jobs, onProgress) {
      return new Promise((resolve, reject) => {
        if (!jobs.length) return resolve([]);
        const out = new Array(jobs.length); let next = 0, done = 0, failed = false;
        failRun = e => { failed = true; reject(e); };
        const feed = w => {
          if (failed || next >= jobs.length) return;
          const id = next++;
          const onMsg = m => { w.off('message', onMsg); if (m.err) { failed = true; return reject(new Error(m.err)); } out[m.id] = m.res; done++; if (onProgress) onProgress(done, jobs.length); if (done === jobs.length) resolve(out); else feed(w); };
          w.on('message', onMsg); w.postMessage({ id, job: jobs[id] });
        };
        ws.forEach(feed);
      });
    },
    close() { ws.forEach(w => w.terminate()); }
  };
};
