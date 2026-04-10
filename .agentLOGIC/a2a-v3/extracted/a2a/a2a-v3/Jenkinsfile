// Jenkins Pipeline for Unified Documentation Workflow
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        WORKFLOW_PRIORITY = 'medium'
        WORKFLOW_TIMEOUT = '4h'
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 4, unit: 'HOURS')
        timestamps()
    }
    
    stages {
        stage('Setup') {
            steps {
                script {
                    echo "🔧 Setting up Jenkins environment..."
                    echo "Node.js version: ${env.NODE_VERSION}"
                    echo "Workflow priority: ${env.WORKFLOW_PRIORITY}"
                    echo "Workflow timeout: ${env.WORKFLOW_TIMEOUT}"
                }
                
                // Install Node.js
                sh '''
                    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                '''
                
                // Install dependencies
                sh 'npm ci'
            }
        }
        
        stage('Documentation Quality Check') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                script {
                    echo "🔍 Checking documentation quality..."
                    
                    // Run quality checks
                    sh 'node .clinerules/scripts/cli.js report'
                    sh 'node .clinerules/scripts/test-unified-workflow.js'
                    
                    // Capture test results
                    def testResults = readJSON file: '.clinerules/test-report.json'
                    echo "Test Results: ${testResults.success_rate}% success rate"
                    
                    if (testResults.success_rate < 80) {
                        error("Documentation quality check failed: ${testResults.success_rate}% success rate")
                    }
                }
            }
        }
        
        stage('Start Documentation Workflow') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                script {
                    echo "🚀 Starting documentation workflow..."
                    
                    // Start workflow
                    sh "node .clinerules/scripts/workflow-engine.js --start --priority ${env.WORKFLOW_PRIORITY}"
                    
                    // Wait for initialization
                    sleep(time: 5, unit: 'SECONDS')
                    
                    // Get session ID
                    def sessionId = sh(
                        script: 'node .clinerules/scripts/workflow-engine.js --status --json | jq -r .session_id',
                        returnStdout: true
                    ).trim()
                    
                    echo "Workflow started with session ID: ${sessionId}"
                    env.WORKFLOW_SESSION_ID = sessionId
                }
            }
        }
        
        stage('Monitor Workflow Progress') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                script {
                    echo "⏳ Monitoring workflow progress..."
                    
                    def maxMinutes = 240  // 4 hours
                    def checkInterval = 300  // 5 minutes
                    def completed = false
                    
                    for (int i = 1; i <= maxMinutes * 60 / checkInterval; i++) {
                        // Get current status
                        def statusJson = sh(
                            script: 'node .clinerules/scripts/workflow-engine.js --status --json',
                            returnStdout: true
                        ).trim()
                        
                        if (statusJson) {
                            def status = readJSON text: statusJson
                            def currentPhase = status.current_phase
                            def progress = status.progress_percentage
                            
                            echo "Progress: ${progress}% - Phase: ${currentPhase}"
                            
                            // Check if completed
                            if (currentPhase == 'completed') {
                                echo "✅ Workflow completed successfully!"
                                completed = true
                                break
                            }
                            
                            // Check for errors or stuck progress
                            if (progress < 100 && i > 20) {  // After 100 minutes
                                echo "⚠️  Warning: Workflow may be stuck at ${progress}%"
                                // Continue monitoring but log warning
                            }
                        } else {
                            echo "❌ Failed to get workflow status"
                            error("Failed to get workflow status")
                        }
                        
                        // Sleep before next check
                        sleep(time: checkInterval, unit: 'SECONDS')
                    }
                    
                    if (!completed) {
                        error("Workflow did not complete within ${maxMinutes} minutes")
                    }
                }
            }
        }
        
        stage('Generate Reports') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                script {
                    echo "📊 Generating documentation reports..."
                    
                    // Generate JSON report
                    sh 'node .clinerules/scripts/workflow-engine.js --report --format json > workflow-report.json'
                    
                    // Generate markdown report
                    sh 'node .clinerules/scripts/workflow-engine.js --report --format markdown > workflow-report.md'
                    
                    // Generate dashboard report
                    sh 'node .clinerules/scripts/dashboard.js --export --format markdown > dashboard-report.md'
                    
                    echo "📄 Reports generated successfully"
                }
            }
        }
        
        stage('Archive Artifacts') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                script {
                    echo "📦 Archiving workflow artifacts..."
                    
                    // Archive all relevant files
                    archiveArtifacts artifacts: '''
                        workflow-report.json
                        workflow-report.md
                        dashboard-report.md
                        .clinerules/test-report.json
                        .clinerules/workflow-state.json
                        .clinerules/workflow-progress.json
                        .clinerules/workflow-logs.json
                    ''', allowEmptyArchive: true
                    
                    // Publish test results
                    publishTestResults testResultsPattern: '.clinerules/test-report.json'
                    
                    echo "✅ Artifacts archived successfully"
                }
            }
        }
        
        stage('Notify Results') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest()
                }
            }
            steps {
                script {
                    echo "📢 Notifying workflow results..."
                    
                    // Read workflow report
                    def workflowReport = readFile 'workflow-report.md'
                    
                    // Send notification (example for Slack)
                    if (env.SLACK_WEBHOOK_URL) {
                        sh """
                            curl -X POST -H 'Content-type: application/json' \\
                                --data '{"text":"Documentation Workflow Completed\\n${workflowReport}"}' \\
                                ${env.SLACK_WEBHOOK_URL}
                        """
                    }
                    
                    // Send email notification
                    emailext (
                        subject: "Documentation Workflow Completed - ${env.BUILD_NUMBER}",
                        body: """
                            Documentation workflow has been completed successfully.
                            
                            Build: ${env.BUILD_URL}
                            Session ID: ${env.WORKFLOW_SESSION_ID}
                            Branch: ${env.BRANCH_NAME}
                            
                            Please check the archived artifacts for detailed reports.
                        """,
                        to: "${env.CHANGE_AUTHOR_EMAIL ?: env.GIT_AUTHOR_EMAIL}"
                    )
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo "🧹 Cleaning up workspace..."
                sh 'rm -f workflow-report.json workflow-report.md dashboard-report.md'
            }
        }
        
        success {
            echo "✅ Pipeline completed successfully"
        }
        
        failure {
            echo "❌ Pipeline failed"
            
            // Send failure notification
            if (env.SLACK_WEBHOOK_URL) {
                sh """
                    curl -X POST -H 'Content-type: application/json' \\
                        --data '{"text":"Documentation Workflow Failed\\nBuild: ${env.BUILD_URL}\\nBranch: ${env.BRANCH_NAME}"}' \\
                        ${env.SLACK_WEBHOOK_URL}
                """
            }
        }
        
        unstable {
            echo "⚠️ Pipeline unstable"
        }
    }
}

// Additional pipeline for emergency workflows
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        WORKFLOW_PRIORITY = 'high'
        WORKFLOW_TIMEOUT = '2h'
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '5'))
        timeout(time: 2, unit: 'HOURS')
        timestamps()
    }
    
    triggers {
        // Trigger on manual execution only
        cron('H 2 * * *')  // Daily at 2 AM (can be overridden)
    }
    
    stages {
        stage('Emergency Documentation Workflow') {
            steps {
                script {
                    echo "🚨 Starting emergency documentation workflow..."
                    
                    // Start emergency workflow
                    sh "node .clinerules/scripts/workflow-engine.js --start --priority ${env.WORKFLOW_PRIORITY}"
                    
                    // Monitor for up to 2 hours
                    def maxMinutes = 120  // 2 hours
                    def checkInterval = 60  // 1 minute
                    
                    for (int i = 1; i <= maxMinutes * 60 / checkInterval; i++) {
                        def statusJson = sh(
                            script: 'node .clinerules/scripts/workflow-engine.js --status --json',
                            returnStdout: true
                        ).trim()
                        
                        if (statusJson) {
                            def status = readJSON text: statusJson
                            def currentPhase = status.current_phase
                            def progress = status.progress_percentage
                            
                            echo "Progress: ${progress}% - Phase: ${currentPhase}"
                            
                            if (currentPhase == 'completed') {
                                echo "✅ Emergency workflow completed successfully!"
                                break
                            }
                        }
                        
                        if (i == maxMinutes * 60 / checkInterval) {
                            error("Emergency workflow did not complete within ${maxMinutes} minutes")
                        }
                        
                        sleep(time: checkInterval, unit: 'SECONDS')
                    }
                }
            }
        }
    }
}