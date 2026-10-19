import { once } from 'node:events';
import path from 'node:path';
import { createLogger, format, transports } from 'winston';

const LOG_LEVELS = Object.freeze(['DEBUG', 'INFO', 'WARN', 'ERROR']);
const MAX_SCENARIO_LOG_LINES = 500;
const configuredLevel = (process.env.LOG_LEVEL ?? 'INFO').trim().toUpperCase();

if (!LOG_LEVELS.includes(configuredLevel)) {
  throw new Error(`LOG_LEVEL must be one of: ${LOG_LEVELS.join(', ')}.`);
}

const fileLoggingValue = (process.env.LOG_TO_FILE ?? 'false').trim().toLowerCase();
if (!['true', 'false'].includes(fileLoggingValue)) {
  throw new Error('LOG_TO_FILE must be either true or false.');
}

const fileLoggingEnabled = fileLoggingValue === 'true';
const workerId = process.env.CUCUMBER_WORKER_ID || 'main';
const safeWorkerId = workerId.replace(/[^a-z0-9-_]/gi, '-');
const logFilePath = fileLoggingEnabled
  ? path.resolve('artifacts', 'logs', `cucumber-${safeWorkerId}-pid${process.pid}.log`)
  : undefined;

/** @type {string|undefined} */
let scenarioName;
/** @type {string[]} */
let scenarioLogLines = [];
let flushed = false;

/**
 * Redact common secret formats and email addresses from log text.
 *
 * @param {string} value
 * @returns {string}
 */
function redactText(value) {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(
      /\b(password|passwd|token|access[_-]?token|refresh[_-]?token|authorization|cookie|secret|api[_-]?key)\s*([=:])\s*("[^"]*"|'[^']*'|[^\s,;&]+)/gi,
      '$1$2[REDACTED]',
    )
    .replace(
      /([?&](?:email|password|token|access_token|refresh_token|api_key)=)[^&\s]+/gi,
      '$1[REDACTED]',
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]');
}

const sensitiveField =
  /password|token|authorization|cookie|secret|credential|body|headers|api[_-]?key/i;
const reservedFields = new Set([
  'level',
  'message',
  'timestamp',
  'scenario',
  'tags',
  'attempt',
  'workerId',
  'pid',
]);

const outputFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  format((info) => {
    info.message = redactText(String(info.message ?? ''));

    for (const [key, value] of Object.entries(info)) {
      if (reservedFields.has(key) || key === 'message') {
        continue;
      }

      if (sensitiveField.test(key)) {
        info[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        info[key] = redactText(value);
      } else if (Array.isArray(value)) {
        info[key] = value.map((item) =>
          typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
            ? redactText(String(item))
            : '[OMITTED]',
        );
      } else if (typeof value !== 'number' && typeof value !== 'boolean') {
        info[key] = '[OMITTED]';
      }
    }

    const scenario = info.scenario ? ` [scenario="${redactText(String(info.scenario))}"]` : '';
    const tags = info.tags ? ` [tags=${redactText(String(info.tags))}]` : '';
    const attempt = info.attempt === undefined ? '' : ` [attempt=${info.attempt}]`;
    const metadata = Object.entries(info)
      .filter(([key]) => !reservedFields.has(key))
      .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : value}`)
      .join(' ');
    const line = `${info.timestamp} ${String(info.level).toUpperCase()} [worker=${info.workerId} pid=${info.pid}]${scenario}${tags}${attempt} ${info.message}${metadata ? ` ${metadata}` : ''}`;

    info[Symbol.for('message')] = line;
    if (scenarioName) {
      scenarioLogLines.push(line);
      if (scenarioLogLines.length > MAX_SCENARIO_LOG_LINES) {
        scenarioLogLines = scenarioLogLines.slice(-MAX_SCENARIO_LOG_LINES);
      }
    }

    return info;
  })(),
);

const logTransports = [new transports.Console()];
if (logFilePath) {
  logTransports.push(new transports.File({ filename: logFilePath }));
}

const winstonLogger = createLogger({
  level: configuredLevel.toLowerCase(),
  format: outputFormat,
  transports: logTransports,
});

/**
 * Small Winston facade shared by hooks, Page Objects, and the API client.
 */
export const logger = Object.freeze({
  level: configuredLevel,
  fileLoggingEnabled,
  logFilePath,

  /**
   * Begin collecting a bounded log excerpt for one Cucumber scenario.
   *
   * @param {string} name
   * @param {string[]} tags
   * @param {number} attempt
   * @returns {void}
   */
  startScenario(name, tags, attempt) {
    scenarioName = name;
    scenarioLogLines = [];
    this.info('Scenario started', {
      scenario: name,
      tags: tags.join(', ') || 'none',
      attempt,
    });
  },

  /**
   * Return the current scenario's log excerpt for a Cucumber attachment.
   *
   * @returns {string}
   */
  getScenarioLogs() {
    return scenarioLogLines.join('\n') || 'No scenario log entries were captured.';
  },

  /**
   * Clear scenario metadata after the After hook has attached any failure logs.
   *
   * @returns {void}
   */
  endScenario() {
    scenarioName = undefined;
    scenarioLogLines = [];
  },

  /**
   * Flush Winston transports before the Cucumber worker exits.
   *
   * @returns {Promise<void>}
   */
  async flush() {
    if (flushed) {
      return;
    }

    flushed = true;
    const finished = once(winstonLogger, 'finish');
    winstonLogger.end();
    await finished;
  },

  /**
   * @param {'debug'|'info'|'warn'|'error'} level
   * @param {string} message
   * @param {Record<string, unknown>} [fields]
   * @returns {void}
   */
  log(level, message, fields = {}) {
    if (flushed) {
      throw new Error('Cannot write to the logger after its transports have been flushed.');
    }

    winstonLogger.log(level, message, {
      ...fields,
      workerId: safeWorkerId,
      pid: process.pid,
      // ...(scenarioName ? { scenario: scenarioName } : {}),
    });
  },

  /**
   * @param {string} message
   * @param {Record<string, unknown>} [fields]
   * @returns {void}
   */
  debug(message, fields) {
    this.log('debug', message, fields);
  },

  /**
   * @param {string} message
   * @param {Record<string, unknown>} [fields]
   * @returns {void}
   */
  info(message, fields) {
    this.log('info', message, fields);
  },

  /**
   * @param {string} message
   * @param {Record<string, unknown>} [fields]
   * @returns {void}
   */
  warn(message, fields) {
    this.log('warn', message, fields);
  },

  /**
   * @param {string} message
   * @param {Record<string, unknown>} [fields]
   * @returns {void}
   */
  error(message, fields) {
    this.log('error', message, fields);
  },
});
