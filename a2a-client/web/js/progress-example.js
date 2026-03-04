/**
 * Progress Indicators Usage Example
 * 
 * This file demonstrates how to use the Progress Indicators system
 * in the A2A Script Agent web interface.
 */

(function (global) {
    'use strict';

    /**
     * Example: Session Progress Tracking
     */
    function exampleSessionProgress() {
        console.log('=== Progress Indicators Example ===');
        
        // Example 1: Manual progress tracking
        const manualTracker = ProgressIndicators.create('manual-example', {
            showLabel: true,
            showMessage: true
        });

        // Render to a container
        const container = document.getElementById('example-container') || document.body;
        manualTracker.renderTo(container.id || 'example-container', {
            id: 'manual-example',
            showPercentage: true
        });

        // Simulate progress updates
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            manualTracker.setProgress(progress, `Processing step ${progress / 10}`);
            
            if (progress >= 100) {
                clearInterval(interval);
                manualTracker.complete('Manual example completed!');
            }
        }, 500);

        // Example 2: Session operation with promiseId
        const sessionId = 'example-session-123';
        
        // Simulate POST /api/sessions/:id/next response with promiseId
        const mockResponse = {
            promiseId: 'promise-abc-123',
            message: 'Starting long-running operation...'
        };

        // Handle the response
        SessionProgressManager.handleSessionNextResponse(sessionId, mockResponse)
            .then(progressId => {
                console.log('Session progress started:', progressId);
                
                // Simulate progress updates via SSE or polling
                setTimeout(() => {
                    ProgressIndicators.handleProgressEvent({
                        current: 25,
                        total: 100,
                        message: 'Analyzing project structure...',
                        progressId: progressId
                    });
                }, 1000);

                setTimeout(() => {
                    ProgressIndicators.handleProgressEvent({
                        current: 50,
                        total: 100,
                        message: 'Generating code changes...',
                        progressId: progressId
                    });
                }, 2000);

                setTimeout(() => {
                    ProgressIndicators.handleProgressEvent({
                        current: 75,
                        total: 100,
                        message: 'Applying changes...',
                        progressId: progressId
                    });
                }, 3000);

                setTimeout(() => {
                    ProgressIndicators.handleProgressEvent({
                        current: 100,
                        total: 100,
                        message: 'Operation completed successfully!',
                        progressId: progressId
                    });
                }, 4000);
            });

        // Example 3: Error handling
        setTimeout(() => {
            const errorTracker = ProgressIndicators.create('error-example');
            errorTracker.renderTo('example-container', { id: 'error-example' });
            errorTracker.error('Something went wrong during processing');
        }, 6000);

        // Example 4: Indeterminate progress
        setTimeout(() => {
            const indeterminateTracker = ProgressIndicators.create('indeterminate-example');
            indeterminateTracker.renderTo('example-container', { id: 'indeterminate-example' });
            indeterminateTracker.setIndeterminate('Waiting for server response...');
        }, 8000);
    }

    /**
     * Example: Integration with existing session manager
     */
    function exampleSessionManagerIntegration() {
        // This would typically be done automatically if SessionManager exists
        if (global.SessionManager) {
            console.log('SessionManager integration active');
            
            // The SessionProgressManager automatically integrates with SessionManager
            // when it's available, as shown in the progress-indicators.js file
        } else {
            console.log('SessionManager not available, manual integration required');
        }
    }

    /**
     * Example: Custom progress tracking for file operations
     */
    function exampleFileOperationProgress() {
        // Example for file upload/download operations
        const fileTracker = ProgressIndicators.create('file-operation', {
            showLabel: true,
            showMessage: true
        });

        fileTracker.renderTo('example-container', {
            id: 'file-operation',
            showPercentage: true
        });

        fileTracker.setLabel('File Upload Progress');
        fileTracker.setIndeterminate('Preparing upload...');

        // Simulate file upload progress
        let uploaded = 0;
        const totalSize = 1000000; // 1MB
        const chunkSize = 100000; // 100KB chunks

        const uploadInterval = setInterval(() => {
            uploaded += chunkSize;
            const percent = Math.round((uploaded / totalSize) * 100);
            const uploadedMB = (uploaded / 1000000).toFixed(1);
            const totalMB = (totalSize / 1000000).toFixed(1);

            fileTracker.setProgress(percent, `Uploading: ${uploadedMB}MB / ${totalMB}MB`);

            if (uploaded >= totalSize) {
                clearInterval(uploadInterval);
                fileTracker.complete('File upload completed!');
            }
        }, 200);
    }

    /**
     * Example: Batch operation progress
     */
    function exampleBatchOperationProgress() {
        const batchTracker = ProgressIndicators.create('batch-operation', {
            showLabel: true,
            showMessage: true
        });

        batchTracker.renderTo('example-container', {
            id: 'batch-operation',
            showPercentage: true
        });

        batchTracker.setLabel('Batch Processing');
        batchTracker.setIndeterminate('Processing batch...');

        // Simulate batch processing
        const items = ['item1', 'item2', 'item3', 'item4', 'item5'];
        let processed = 0;

        const processInterval = setInterval(() => {
            processed++;
            const percent = Math.round((processed / items.length) * 100);
            
            batchTracker.setProgress(percent, `Processing ${items[processed - 1]}...`);

            if (processed >= items.length) {
                clearInterval(processInterval);
                batchTracker.complete('Batch processing completed!');
            }
        }, 1000);
    }

    /**
     * Initialize examples when DOM is ready
     */
    function initExamples() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                exampleSessionProgress();
                exampleSessionManagerIntegration();
                exampleFileOperationProgress();
                exampleBatchOperationProgress();
            });
        } else {
            exampleSessionProgress();
            exampleSessionManagerIntegration();
            exampleFileOperationProgress();
            exampleBatchOperationProgress();
        }
    }

    // Export examples
    global.ProgressExamples = {
        sessionProgress: exampleSessionProgress,
        sessionManagerIntegration: exampleSessionManagerIntegration,
        fileOperationProgress: exampleFileOperationProgress,
        batchOperationProgress: exampleBatchOperationProgress,
        init: initExamples
    };

    // Auto-initialize if not in a module context
    if (typeof module === 'undefined' && global.document) {
        initExamples();
    }

})(typeof window !== 'undefined' ? window : globalThis);