const { spawnSync } = require('child_process');

async function handleJestProxy(command, startTime, effectiveCwdArg, logger, errorHandler, fileUtils, pathUtils, commandExecutor, config, appendLog) {
  const jestPattern = /\b(jest|npx\s+jest|npm\s+run\s+test)\b/i;
  let result = null;

  if (jestPattern.test(command)) {
    await errorHandler.safeExecute(async () => {
      const proxyPath = pathUtils.join(process.cwd(), 'scripts', 'proxy-jest-runner.cjs');
      const proxyTimeoutMs = Number(process.env.JEST_PROXY_TIMEOUT_MS || config.jestProxyTimeoutMs || 2000);
      const logDir = pathUtils.join(process.cwd(), config.logDir || process.env.LOG_DIR || 'logs');
      await fileUtils.ensureDir(logDir);
      const proxyLog = pathUtils.join(logDir, 'jest-proxy.log');

      const env = Object.assign({}, process.env, { JEST_ORIGINAL_COMMAND: command, JEST_PROXY_LOG: proxyLog, JEST_PROXY_TIMEOUT_MS: String(proxyTimeoutMs) });
      const proxyCmd = process.env.JEST_PROXY_CMD ? process.env.JEST_PROXY_CMD : process.execPath + ' "' + proxyPath.replace(/"/g,'\\"') + '"';
      const exec = spawnSync(proxyCmd, { shell: true, cwd: effectiveCwdArg || process.cwd(), env, timeout: proxyTimeoutMs, encoding: 'utf8' });

      let proxyLogContent = '';
      proxyLogContent = await fileUtils.readFile(pathUtils.join(logDir, 'jest-proxy.log'));
      if (!proxyLogContent && await pathUtils.exists(proxyLog)) {
        logger.error('Reading proxy log file: ' + proxyLog);
        proxyLogContent = await fileUtils.readFile(proxyLog);
      }

      const hasStart = String(proxyLogContent).includes('PROXY JEST START');
      const hasEnd = String(proxyLogContent).includes('PROXY JEST END');

      result = {
        success: exec.status === 0,
        stdout: exec.stdout || proxyLogContent || '',
        stderr: exec.stderr || '',
        return_code: (typeof exec.status === 'number') ? exec.status : -1,
        duration: String(((Date.now() - startTime) / 1000).toFixed(3)),
        command,
        proxyLog: proxyLog,
        proxyMarkers: { hasStart, hasEnd }
      };

      logger.info('Proxied jest command to ' + proxyPath + ', exit=' + result.return_code + ', markers=disabled');

      await errorHandler.safeExecute(async () => {
        const markers = result.proxyMarkers || { hasStart: false, hasEnd: false };
        if (!result.success && markers.hasStart && !markers.hasEnd) {
          const retryTimeoutMs = Math.max(1000, proxyTimeoutMs * 2);
          await fileUtils.appendFile(proxyLog, 'PROXY JEST RETRY START ' + new Date().toISOString() + '\n', 'utf8');
          const retryEnv = Object.assign({}, env, { JEST_PROXY_RETRY: '1' });
          const retryExec = spawnSync(proxyCmd, { shell: true, cwd: effectiveCwdArg || process.cwd(), env: retryEnv, timeout: retryTimeoutMs, encoding: 'utf8' });
          if (retryExec.stdout) await fileUtils.appendFile(proxyLog, 'STDOUT:\n' + retryExec.stdout + '\n', 'utf8');
          if (retryExec.stderr) await fileUtils.appendFile(proxyLog, 'STDERR:\n' + retryExec.stderr + '\n', 'utf8');
          if (retryExec.error) await fileUtils.appendFile(proxyLog, 'RETRY_ERROR:' + String(retryExec.error && retryExec.error.message || retryExec.error) + '\n', 'utf8');
          await fileUtils.appendFile(proxyLog, 'PROXY JEST RETRY END ' + new Date().toISOString() + '\n', 'utf8');
          proxyLogContent = await fileUtils.readFile(proxyLog);
          const hasStart2 = String(proxyLogContent).includes('PROXY JEST START');
          const hasEnd2 = String(proxyLogContent).includes('PROXY JEST END');
          result.stdout = result.stdout || proxyLogContent;
          result.proxyMarkers = { hasStart: hasStart2, hasEnd: hasEnd2 };
          result.success = (retryExec.status === 0) || result.success;
          result.return_code = (typeof retryExec.status === 'number') ? retryExec.status : result.return_code;
        }

        if (!result.success) {
          logger.info('Proxy failed — выполняем fallback оригинальной команды через commandExecutor');
          const fallbackStart = Date.now();
          const fallbackTimeout = (typeof config.timeout === 'number') ? config.timeout : 120; // Using config.timeout from the main server config
          const fallbackResult = await commandExecutor.runCommand(command, fallbackTimeout, false, effectiveCwdArg);
          const fallbackDuration = ((Date.now() - fallbackStart) / 1000).toFixed(3);
          result = {
            success: !!fallbackResult.success,
            stdout: fallbackResult.stdout || '',
            stderr: fallbackResult.stderr || '',
            return_code: (typeof fallbackResult.return_code === 'number') ? fallbackResult.return_code : ((typeof fallbackResult.exitCode === 'number') ? fallbackResult.exitCode : -1),
            duration: fallbackDuration,
            command,
            fallback: true
          };
        }

        // Assume appendLog is a method available in the MCP server context or passed as an argument
        // For now, I'll add a placeholder. The actual implementation in mcp-server.cjs should provide it.
        if (appendLog) {
            appendLog({
                ts: new Date().toISOString(),
                event: 'proxy_analysis',
                command: command,
                proxyLog: proxyLog,
                proxyMarkers: result.proxyMarkers,
                success: result.success,
                fallback: !!result.fallback
            });
        } else {
            logger.debug('appendLog function not provided to handleJestProxy.');
        }

      }, 'analysisError');
    }, 'e');
  }
  return result; // Return the result of proxying (or null if not a jest command)
}

module.exports = {
  handleJestProxy
};
