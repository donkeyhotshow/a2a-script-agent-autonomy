/**
 * @fileoverview Основная реализация системы управления историей для MCP Terminal.
 * Функциональность, связанная с HistoryManager, находится здесь, а не в libs/core/history-manager.
 * @author MCP Terminal Team
 * @version 1.0.0
 */
// Используем относительные пути для надежности
const path = require('path');
const fs = require('fs');

// Получаем путь к корневой директории libs
const libsPath = path.resolve(__dirname, '../../../libs');

const { ValidationUtils } = require(path.join(libsPath, 'validation/validation/index.cjs'));
const { fileSystemUtils } = require(path.join(libsPath, 'system/file-operations/index.cjs'));
const { errorUtils } = require(path.join(libsPath, 'error-management/error-handler/error-utils.cjs'));
const { consoleUtils } = require(path.join(libsPath, 'logging-monitoring/logging/console-utils.cjs'));
// PathUtils больше не используется в истории, используем прямые пути
const historyRootPath = path.join(libsPath, '..', '..', '..', 'apps', 'root', 'mcp', 'node-terminal', 'history');
const { getCurrentDir } = require(path.join(libsPath, 'system/workdir/index.cjs'));

function getHistoryRoot() {
	return historyRootPath;
}

const MAX_HISTORY_SIZE = 1000;
const MAX_OUTPUT_CHARS_DEFAULT = 1024 * 1024; // 1MB

// Модуль для работы с сессиями
class SessionManager {
	static getSessionsDir() {
		return path.join(getHistoryRoot(), 'sessions');
	}

	static getSessionDir(sessionId) {
		return path.join(this.getSessionsDir(), sessionId);
	}

	static getCurrentSessionFile() {
		return path.join(getHistoryRoot(), 'CURRENT');
	}

	static getByErrorDir(sessionId) {
		return path.join(this.getSessionDir(sessionId), 'by_error');
	}

	static getErrorIndexPath(sessionId, errorType) {
		return path.join(this.getByErrorDir(sessionId), `${String(errorType || 'unknown')}.jsonl`);
	}

	static ensureDir(dir) {
		try {
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
		} catch (error) {
			consoleUtils.error('Failed to create directory:', dir, error.message);
		}
	}

	static getCurrentSessionId() {
		try {
			const file = this.getCurrentSessionFile();
			if (fs.existsSync(file)) {
				return fs.readFileSync(file, 'utf8').trim();
			}
		} catch (error) {}
		return null;
	}

	static setCurrentSessionId(sessionId) {
		try {
			const file = this.getCurrentSessionFile();
			this.ensureDir(path.dirname(file));
			fs.writeFileSync(file, String(sessionId), 'utf8');
			return true;
		} catch (error) {
			consoleUtils.error('Failed to set current session ID:', error.message);
			return false;
		}
	}

	static createAndSwitchSession(sessionName = null) {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const random = Math.random().toString(36).substring(2, 10);
		const sessionId = `${timestamp}-${random}`;
		
		this.setCurrentSessionId(sessionId);
		this.ensureDir(this.getSessionDir(sessionId));
		
		return sessionId;
	}

	static getSessionForCwd(cwd) {
		// Простая реализация - можно улучшить
		return this.getCurrentSessionId() || this.createAndSwitchSession();
	}
}

// Модуль для работы с записями истории
class HistoryRecordManager {
	static commandHistory = [];

	static deriveErrorType(rec) {
		try {
			if (rec && rec.success) return 'success';
			const reason = String(rec && rec.reason || '').toLowerCase();
			if (reason === 'timeout') return 'timeout';
			if (reason === 'spawn-error') return 'spawn_error';
			if (reason === 'blocked_security') return 'blocked_security';
			if (reason === 'blocked_readonly') return 'blocked_readonly';
			const rc = Number(rec && rec.return_code);
			if (rc === 0) return 'success';
			if (rc === 126) return 'permission_denied';
			if (rc === 127) return 'command_not_found';
			if (Number.isFinite(rc)) return 'nonzero_exit';
		} catch (error) {}
		return 'error';
	}

	static buildOrderedRecord(sid, safeRecord) {
		const errorType = this.deriveErrorType(safeRecord);
		const reason = validationUtils.isString(safeRecord.reason ) ? safeRecord.reason : '';
		const errorTail = safeRecord.success ? '' : `err=${errorType}${reason ? `(${reason})` : ''}; rc=${safeRecord.return_code}`;

		const ordered = {};
		// Keep insertion order explicit
		ordered.timestamp = safeRecord.timestamp || new Date().toISOString();
		ordered.session_id = sid;
		if (safeRecord.consumer_id) ordered.consumer_id = safeRecord.consumer_id;
		if (safeRecord.platform) ordered.platform = safeRecord.platform;
		if (safeRecord.cwd) ordered.cwd = safeRecord.cwd;
		if (safeRecord.operation) ordered.operation = safeRecord.operation;
		if (safeRecord.command) ordered.command = safeRecord.command;
		ordered.success = !!safeRecord.success;
		if (typeof safeRecord.return_code !== 'undefined') ordered.return_code = safeRecord.return_code;
		if (validationUtils.isString(safeRecord.duration )) ordered.duration = safeRecord.duration;
		if (validationUtils.isString(safeRecord.stdout ) && safeRecord.stdout.length) ordered.stdout = safeRecord.stdout;
		if (validationUtils.isString(safeRecord.stderr ) && safeRecord.stderr.length) ordered.stderr = safeRecord.stderr;
		if (reason) ordered.reason = reason;
		ordered.error_type = errorType;
		if (!safeRecord.success) ordered.error_tail = errorTail;
		return ordered;
	}

	static safeTruncate(text) {
		const limit = MAX_OUTPUT_CHARS_DEFAULT;
		if (typeof text !== 'string') return '';
		if (text.length <= limit) return text;
		return text.substring(0, limit) + `\n[truncated ${text.length - limit} chars]`;
	}

	static appendByError(sessionId, record) {
		const errorType = String(record && record.error_type || 'unknown');
		const dir = SessionManager.getByErrorDir(sessionId);
		const p = SessionManager.getErrorIndexPath(sessionId, errorType);
		try {
			SessionManager.ensureDir(dir);
			fs.appendFileSync(p, JSON.stringify(record) + '\n', 'utf8');
		} catch (error) {
			consoleUtils.error('Failed to append error record:', error.message);
		}
	}

	static persistHistoryRecord(record) {
		errorUtils.safeExecute(async () => {
			const currentDir = getCurrentDir();
			const sid = SessionManager.getSessionForCwd(record.cwd || currentDir);
			
			const safeRecord = {
				...record,
				stdout: this.safeTruncate(record.stdout || ''),
				stderr: this.safeTruncate(record.stderr || ''),
				consumer_id: record.consumer_id || currentDir
			};

			const orderedRecord = this.buildOrderedRecord(sid, safeRecord);
			const sessionDir = SessionManager.getSessionDir(sid);
			const logFile = path.join(sessionDir, 'session.log.jsonl');

			SessionManager.ensureDir(sessionDir);
			fs.appendFileSync(logFile, JSON.stringify(orderedRecord) + '\n', 'utf8');

			this.appendByError(sid, orderedRecord);
		});
	}

	static pushMemoryHistory(entry) {
		this.commandHistory.push(entry);
		if (this.commandHistory.length > MAX_HISTORY_SIZE) {
			this.commandHistory.shift();
		}
	}

	static listSessions() {
		SessionManager.ensureDir(SessionManager.getSessionsDir());
		const sessions = [];

		try {
			const entries = fs.readdirSync(SessionManager.getSessionsDir(), { withFileTypes: true });
			for (const e of entries) {
				if (!e.isDirectory()) continue;
				const dir = path.join(SessionManager.getSessionsDir(), e.name);
				let size = 0;
				let latest = 0;

				try {
					for (const f of fs.readdirSync(dir)) {
						// if (!/\.jsonl?$/.test(f)) continue;
						const st = fs.statSync(path.join(dir, f));
						size += st.size;
						if (st.mtimeMs > latest) latest = st.mtimeMs;
					}
				} catch (error) {}

				sessions.push({
					session_id: e.name,
					path: dir,
					size_bytes: size,
					modified: new Date(latest || Date.now()).toISOString(),
					format: 'dir'
				});
			}
		} catch (error) {}

		sessions.sort((a, b) => String(b.modified).localeCompare(String(a.modified)));
		return sessions;
	}

	static loadSessionRecords(sessionId, limit = null) {
		const dir = SessionManager.getSessionDir(sessionId);
		const records = [];
		const file = path.join(dir, 'session.log.jsonl');

		if (!fs.existsSync(file)) return records;

		try {
			const text = fs.readFileSync(file, 'utf8');
			let lines = text.split(/\r?\n/);
			lines = lines.filter((l) => l.trim().length > 0);

			if (typeof limit === 'number' && limit >= 0 && lines.length > limit) {
				lines = lines.slice(-limit);
			}

			for (const line of lines) {
				try {
					const record = JSON.parse(line);
					records.push(record);
				} catch (error) {}
			}
		} catch (error) {}

		return records;
	}
}

// Экспорт функций для обратной совместимости
function persistHistoryRecord(record) {
	return HistoryRecordManager.persistHistoryRecord(record);
}

function pushMemoryHistory(entry) {
	return HistoryRecordManager.pushMemoryHistory(entry);
}

function listSessions() {
	return HistoryRecordManager.listSessions();
}

function loadSessionRecords(sessionId, limit = null) {
	return HistoryRecordManager.loadSessionRecords(sessionId, limit);
}

function getCurrentSessionId() {
	return SessionManager.getCurrentSessionId();
}

function setCurrentSessionId(sessionId) {
	return SessionManager.setCurrentSessionId(sessionId);
}

function createAndSwitchSession(sessionName = null) {
	return SessionManager.createAndSwitchSession(sessionName);
}

function getSessionForCwd(cwd) {
	return SessionManager.getSessionForCwd(cwd);
}

;
module.exports = {
	persistHistoryRecord,
	pushMemoryHistory,
	listSessions,
	loadSessionRecords,
	getCurrentSessionId,
	setCurrentSessionId,
	createAndSwitchSession,
	getSessionForCwd,
	SessionManager,
	HistoryRecordManager
};


