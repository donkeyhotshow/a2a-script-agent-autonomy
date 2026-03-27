/**
 * TaskFlow Message and Result Renderers
 */

(function (global) {
    'use strict';

    if (!global.TaskFlowRender) global.TaskFlowRender = {};
    const TFR = global.TaskFlowRender;
    const { escapeHtml, renderDialogErrorBanner, handleRenderError, requireRenderStore } = TFR;

    function isSystemErrorChatMessage(msg) {
        const role = msg.role || 'assistant';
        if (role !== 'system') return false;
        const m = msg.metadata || {};
        return m.type === 'error' || m.severity === 'error' || m.severity === 'warning';
    }

    function renderMessageHistory(contentEl, store) {
         const { store: sessionStore, error: storeError } = requireRenderStore('renderMessageHistory', store, { contentEl });
         if (!sessionStore) {
             return storeError;
         }

         const state = sessionStore.getState?.();
         if (!state || typeof state !== 'object') {
             return handleRenderError('renderMessageHistory', 'Session store state is invalid', {
                 store: sessionStore,
                 state
             });
         }

         const messagesSource = state.messages ?? sessionStore.messages;
         if (!Array.isArray(messagesSource)) {
             return handleRenderError('renderMessageHistory', 'Session history payload is malformed', {
                 state,
                 rawMessages: messagesSource
             });
         }

         const banner = renderDialogErrorBanner(state.lastError);
         const visible = messagesSource.filter((msg) => !isSystemErrorChatMessage(msg));

         if (!visible.length) {
             const empty = '<div class="task-flow-history-empty">No messages yet</div>';
             return banner ? `${banner}${empty}` : empty;
         }

         const historyHtml = visible.map((msg) => {
             const role = msg.role || 'assistant';
             const displayRole = role === 'system' ? 'System' : role;
             let content = msg.content || msg.message || msg.text;
             if (!content) content = '';
             const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';

             return `
                 <div class="task-flow-message ${escapeHtml(role)}">
                     <div class="task-flow-message-role">${escapeHtml(displayRole)}</div>
                     <div class="task-flow-message-content">${escapeHtml(String(content))}</div>
                     ${timestamp ? `<div class="task-flow-message-time">${escapeHtml(timestamp)}</div>` : ''}
                 </div>
             `;
         }).join('');

         return `${banner}<div class="task-flow-history">${historyHtml}</div>`;
    }

    function renderAttachmentsBlock(attachments) {
        if (!attachments || typeof attachments !== 'object') return '';
        const parts = [];
        
        const pendingAction = attachments.pendingClientAction;
        if (pendingAction) {
            parts.push(
                `<div class="task-flow-attachments-client-action" data-action="${escapeHtml(pendingAction)}">` +
                `<span class="task-flow-attachments-title">Client Action</span> ` +
                `<span class="task-flow-attachments-value">${escapeHtml(pendingAction)}</span>` +
                `</div>`
            );
        }

        const rf = attachments.readFiles;
        if (Array.isArray(rf) && rf.length) {
            const lines = rf
                .map((f) => {
                    const p = typeof f === 'string' ? f : f && f.path;
                    return p ? `<li><code>${escapeHtml(String(p))}</code></li>` : '';
                })
                .filter(Boolean);
            if (lines.length) {
                parts.push(
                    `<div class="task-flow-attachments-readfiles"><div class="task-flow-attachments-title">Read files</div><ul>${lines.join('')}</ul></div>`
                );
            }
        }
        if (typeof attachments.ragQuery === 'string' && attachments.ragQuery.trim()) {
            parts.push(
                `<div class="task-flow-attachments-rag"><span class="task-flow-attachments-title">Search</span> <code>${escapeHtml(attachments.ragQuery.trim())}</code></div>`
            );
        }
        const wf = attachments.writtenFiles;
        if (Array.isArray(wf) && wf.length) {
            const lines = wf
                .map((f) => (f && f.path ? `<li><code>${escapeHtml(String(f.path))}</code></li>` : ''))
                .filter(Boolean);
            if (lines.length) {
                parts.push(
                    `<div class="task-flow-attachments-written"><div class="task-flow-attachments-title">Written files</div><ul>${lines.join('')}</ul></div>`
                );
            }
        }
        if (typeof attachments.shellCommand === 'string' && attachments.shellCommand.trim()) {
            parts.push(
                `<div class="task-flow-attachments-cmd"><span class="task-flow-attachments-title">Command</span> <code>${escapeHtml(
                    attachments.shellCommand.trim()
                )}</code></div>`
            );
        }
        if (typeof attachments.listDirectoryPath === 'string' && attachments.listDirectoryPath.trim()) {
            parts.push(
                `<div class="task-flow-attachments-listdir"><span class="task-flow-attachments-title">Directory</span> <code>${escapeHtml(
                    attachments.listDirectoryPath.trim()
                )}</code></div>`
            );
        }
        if (typeof attachments.grepPattern === 'string' && attachments.grepPattern.trim()) {
            const gp = escapeHtml(attachments.grepPattern.trim());
            const gpath =
                typeof attachments.grepPath === 'string' && attachments.grepPath.trim()
                    ? ` <span class="task-flow-attachments-meta">in <code>${escapeHtml(
                          attachments.grepPath.trim()
                      )}</code></span>`
                    : '';
            const gglob =
                typeof attachments.grepGlob === 'string' && attachments.grepGlob.trim()
                    ? ` <span class="task-flow-attachments-meta">glob <code>${escapeHtml(
                          attachments.grepGlob.trim()
                      )}</code></span>`
                    : '';
            parts.push(
                `<div class="task-flow-attachments-grep"><span class="task-flow-attachments-title">Grep</span> <code>${gp}</code>${gpath}${gglob}</div>`
            );
        }
        if (typeof attachments.fileExistsPath === 'string' && attachments.fileExistsPath.trim()) {
            parts.push(
                `<div class="task-flow-attachments-fileexists"><span class="task-flow-attachments-title">Check path</span> <code>${escapeHtml(
                    attachments.fileExistsPath.trim()
                )}</code></div>`
            );
        }
        if (typeof attachments.editPatchPath === 'string' && attachments.editPatchPath.trim()) {
            parts.push(
                `<div class="task-flow-attachments-patch"><span class="task-flow-attachments-title">Patch target</span> <code>${escapeHtml(
                    attachments.editPatchPath.trim()
                )}</code></div>`
            );
        }
        if (typeof attachments.runScriptId === 'string' && attachments.runScriptId.trim()) {
            parts.push(
                `<div class="task-flow-attachments-runscript"><span class="task-flow-attachments-title">Script</span> <code>${escapeHtml(
                    attachments.runScriptId.trim()
                )}</code></div>`
            );
        }
        return parts.length ? `<div class="task-flow-attachments">${parts.join('')}</div>` : '';
    }

    function renderResultBlock(result) {
        if (!result || typeof result !== 'object') return '';

        const resultKeys = Object.keys(result);
        if (resultKeys.length === 0) return '';

        const actionType = resultKeys[0];
        const actionData = result[actionType];

        const typeLabels = {
            'read-file': 'Read File Result',
            'grep-search': 'Grep Search Results',
            'execute-command': 'Command Output',
            'script': 'Script Output',
            'list-directory': 'Directory Listing',
            'file-exists': 'File Exists Check',
            'write-file': 'Write File Result',
            'edit-patch': 'Edit Patch Result',
            'rag-search': 'RAG Search Results',
            'run-script': 'Run Script Output'
        };

        const typeIcons = {
            'read-file': '📄',
            'grep-search': '🔎',
            'execute-command': '▶',
            'script': '⚡',
            'list-directory': '📁',
            'file-exists': '❓',
            'write-file': '✏️',
            'edit-patch': '📋',
            'rag-search': '🔍',
            'run-script': '⚡'
        };

        const icon = typeIcons[actionType] || '⚙️';
        const label = typeLabels[actionType] || actionType;

        let contentHtml = '';

        switch (actionType) {
            case 'read-file':
                if (actionData && typeof actionData === 'object' && actionData.content !== undefined) {
                    contentHtml = `<pre class="result-content">${escapeHtml(String(actionData.content))}</pre>`;
                    if (actionData.path) {
                        contentHtml = `<div><strong>File:</strong> ${escapeHtml(String(actionData.path))}</div>${contentHtml}`;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'grep-search':
                if (actionData && typeof actionData === 'object' && Array.isArray(actionData.results)) {
                    const results = actionData.results;
                    if (results.length === 0) {
                        contentHtml = '<div>No matches found</div>';
                    } else {
                        const lines = results.map((match, index) => {
                            if (typeof match === 'string') {
                                return `<div class="grep-match">${escapeHtml(match)}</div>`;
                            } else if (match && typeof match === 'object') {
                                const lineNum = match.line !== undefined ? match.line : match.lineNumber !== undefined ? match.lineNumber : index + 1;
                                const content = match.content !== undefined ? match.content : match.match !== undefined ? match.match : '';
                                const file = match.file !== undefined ? match.file : '';
                                let matchHtml = `<div class="grep-match">`;
                                if (file) matchHtml += `<span class="grep-file">${escapeHtml(String(file))}</span>:`;
                                if (lineNum !== undefined) matchHtml += `<span class="grep-line">${escapeHtml(String(lineNum))}</span>:`;
                                matchHtml += `<span class="grep-content">${escapeHtml(String(content))}</span></div>`;
                                return matchHtml;
                            } else {
                                return `<div class="grep-match">${escapeHtml(String(match))}</div>`;
                            }
                        }).join('');
                        contentHtml = `
                            <div><strong>Pattern:</strong> ${escapeHtml(String(actionData.pattern || ''))}</div>
                            <div><strong>Matches:</strong> ${results.length}</div>
                            <div class="grep-results">${lines}</div>
                        `;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'execute-command':
                if (actionData && typeof actionData === 'object' && actionData.output !== undefined) {
                    contentHtml = `<pre class="result-output">${escapeHtml(String(actionData.output))}</pre>`;
                    if (actionData.command) {
                        contentHtml = `<div><strong>Command:</strong> ${escapeHtml(String(actionData.command))}</div>${contentHtml}`;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'script':
                if (actionData && typeof actionData === 'object' && actionData.output !== undefined) {
                    contentHtml = `<pre class="result-output">${escapeHtml(String(actionData.output))}</pre>`;
                    if (actionData.code) {
                        contentHtml = `<div><strong>Script:</strong></div><pre class="script-code">${escapeHtml(String(actionData.code))}</pre>${contentHtml}`;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'list-directory':
                if (actionData && typeof actionData === 'object' && Array.isArray(actionData.entries)) {
                    const entries = actionData.entries;
                    if (entries.length === 0) {
                        contentHtml = '<div>Directory is empty</div>';
                    } else {
                        const lines = entries.map((entry) => {
                            if (typeof entry === 'string') {
                                return `<div class="dir-entry">${escapeHtml(entry)}</div>`;
                            } else if (entry && typeof entry === 'object') {
                                const name = entry.name !== undefined ? entry.name : entry.path !== undefined ? entry.path : '';
                                const type = entry.type !== undefined ? entry.type : entry.isDirectory !== undefined ? (entry.isDirectory ? 'directory' : 'file') : 'unknown';
                                const size = entry.size !== undefined ? entry.size : '';
                                let entryHtml = `<div class="dir-entry">`;
                                entryHtml += type === 'directory' ? `<span class="dir-type">📁 </span>` : `<span class="dir-type">📄 </span>`;
                                entryHtml += `${escapeHtml(String(name))}`;
                                if (size !== '' && type !== 'directory') {
                                    entryHtml += ` <span class="dir-size">(${escapeHtml(String(size))} bytes)</span>`;
                                }
                                entryHtml += '</div>';
                                return entryHtml;
                            } else {
                                return `<div class="dir-entry">${escapeHtml(String(entry))}</div>`;
                            }
                        }).join('');
                        contentHtml = `<div class="dir-entries">${lines}</div>`;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'file-exists':
                if (actionData && typeof actionData === 'object' && actionData.exists !== undefined) {
                    const exists = actionData.exists;
                    contentHtml = `
                        <div><strong>Path:</strong> ${escapeHtml(String(actionData.path || ''))}</div>
                        <div><strong>Exists:</strong> <span class="exists-status">${exists ? 'Yes' : 'No'}</span></div>
                    `;
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'write-file':
                if (actionData && typeof actionData === 'object' && actionData.path !== undefined) {
                    contentHtml = `
                        <div><strong>Written to:</strong> ${escapeHtml(String(actionData.path))}</div>
                        ${actionData.bytes !== undefined ? `<div><strong>Bytes written:</strong> ${escapeHtml(String(actionData.bytes))}</div>` : ''}
                    `;
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'edit-patch':
                if (actionData && typeof actionData === 'object' && actionData.applied !== undefined) {
                    const applied = actionData.applied;
                    contentHtml = `
                        <div><strong>Patch applied:</strong> <span class="patch-status">${applied ? 'Yes' : 'No'}</span></div>
                        ${actionData.path ? `<div><strong>Target file:</strong> ${escapeHtml(String(actionData.path))}</div>` : ''}
                        ${actionData.rejectedCount !== undefined ? `<div><strong>Rejected chunks:</strong> ${escapeHtml(String(actionData.rejectedCount))}</div>` : ''}
                    `;
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'rag-search':
                if (actionData && typeof actionData === 'object' && Array.isArray(actionData.results)) {
                    const results = actionData.results;
                    if (results.length === 0) {
                        contentHtml = '<div>No RAG results found</div>';
                    } else {
                        const lines = results.map((result, index) => {
                            if (typeof result === 'string') {
                                return `<div class="rag-result">${escapeHtml(result)}</div>`;
                            } else if (result && typeof result === 'object') {
                                const content = result.content !== undefined ? result.content : result.text !== undefined ? result.text : '';
                                const score = result.score !== undefined ? result.score : result.relevance !== undefined ? result.relevance : '';
                                const source = result.source !== undefined ? result.source : result.file !== undefined ? result.file : '';
                                let resultHtml = `<div class="rag-result">`;
                                if (source) resultHtml += `<span class="rag-source">[${escapeHtml(String(source))}]</span> `;
                                if (score !== '') resultHtml += `<span class="rag-score">(score: ${escapeHtml(String(score))})</span> `;
                                resultHtml += `${escapeHtml(String(content))}</div>`;
                                return resultHtml;
                            } else {
                                return `<div class="rag-result">${escapeHtml(String(result))}</div>`;
                            }
                        }).join('');
                        contentHtml = `
                            <div><strong>Query:</strong> ${escapeHtml(String(actionData.query || ''))}</div>
                            <div><strong>Results:</strong> ${results.length}</div>
                            <div class="rag-results">${lines}</div>
                        `;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            case 'run-script':
                if (actionData && typeof actionData === 'object' && actionData.output !== undefined) {
                    contentHtml = `<pre class="result-output">${escapeHtml(String(actionData.output))}</pre>`;
                    if (actionData.scriptId) {
                        contentHtml = `<div><strong>Script ID:</strong> ${escapeHtml(String(actionData.scriptId))}</div>${contentHtml}`;
                    }
                } else {
                    contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                }
                break;

            default:
                contentHtml = `<pre>${escapeHtml(JSON.stringify(actionData, null, 2))}</pre>`;
                break;
        }

        return `
            <div class="task-flow-result-block">
                <div class="result-header">
                    <span class="result-type-icon">${icon}</span>
                    <span class="result-type-label">${escapeHtml(label)}</span>
                </div>
                <div class="result-content">${contentHtml}</div>
            </div>
        `;
    }

    TFR.renderMessageHistory = renderMessageHistory;
    TFR.renderAttachmentsBlock = renderAttachmentsBlock;
    TFR.renderResultBlock = renderResultBlock;

})(typeof window !== 'undefined' ? window : global);
