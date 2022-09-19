import { performance } from 'perf_hooks';
import { writeFile } from 'fs/promises';
import core from '@actions/core';
import exec from '@actions/exec';

const errorOut = (data: string, hideWarning = false, fail = true) => {
  if (
    data?.toLowerCase()?.includes('error') &&
    !data?.toLowerCase()?.includes('warn') &&
    !data?.includes('ESLint must be installed') &&
    !data?.startsWith('error Command failed.')
  ) {
    if (fail) {
      core.setFailed(data);
    } else {
      core.error(data);
    }
  } else if (!hideWarning && data?.toLowerCase()?.includes('warn')) {
    core.warning(data);
  } else {
    core.debug(data);
  }
};

(async () => {
  try {
    const op: string = core.getInput('cmd');
    const args: string[] = core.getInput('args')?.replace(/'/g, '').split(' ');
    const hideWarning: boolean = core.getInput('hide-warning') === 'true';
    const file: string = core.getInput('file');
    const fail: boolean = core.getInput('fail') === 'true';

    let output = '';
    let stdout = '';
    let stderr = '';

    const start = performance.now();

    core.debug('Running command: ' + op + ' ' + args.join(' '));
    const exitCode: number = await exec.exec(op, args, {
      listeners: {
        stdout: (data: Buffer) => {
          stdout += data.toString();
          output += data.toString();
          core.debug(data.toString());
        },
        stderr: (data: Buffer) => {
          stderr += data.toString();
          output += data.toString();
          errorOut(data.toString(), hideWarning, fail);
        }
      }
    });

    core.setOutput('exit-code', exitCode);

    const end = performance.now();
    core.setOutput('duration', ((end - start) / 1000).toFixed(2));

    output = output.trim();
    core.debug(`\n*************\nFinal output:\n*************\n${output}`);
    core.setOutput('output', output);

    core.setOutput('stdout', stdout);
    core.setOutput('stderr', stderr);

    if (file) {
      await writeFile(file, output);
    }
  } catch (err) {
    core.setFailed((<Error>err).message);
  }
})();
