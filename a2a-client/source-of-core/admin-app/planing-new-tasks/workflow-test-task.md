# script engine with laravel on a board

files in dir ./ :
./main.ps1 - Центральный управляющий скрипт системы задач и модулей
main-work.ps1 - Основной скрипт для управления задачами и сценариями через AI Task System.

files in dir ./script/engine/scenarios :
EditTaskSourceFile.scenario.json
SCN-ActivateTask.scenario.json
SCN-ApplyRefactoringPattern.scenario.json
SCN-CloseTask.scenario.json
SCN-ConfirmAction.scenario.json
SCN-ConvertDocFormat.scenario.json
SCN-CreateQATasksFromModules.scenario.json
SCN-CreateTask.scenario.json
SCN-DefineNewTask.scenario.json
SCN-GetIndexStats.scenario.json
SCN-IdentifyRefactoringTarget.scenario.json
SCN-Indexing.scenario.json
SCN-JsonModuleConceptualImprovement.scenario.json
SCN-JsonModuleContinueTaskByValidator.scenario.json
SCN-ListIndexKeywords.scenario.json
SCN-ListIndexTypes.scenario.json
SCN-MergeModuleVersions.scenario.json
SCN-NextScenario.scenario.json
SCN-ProjectFilesStructureValidation.scenario.json
SCN-QueryIndex.scenario.json
SCN-QuestioningUser.scenario.json
SCN-RequestMissingContext.scenario.json

----------------
files in dir ./script/engine/task_types :
ClientServerIntegration
CodeGeneration
ConfigurationManagement
CoreSystemUpgrade
Debugging
DeploymentScripting
Documentation
FileMigration
FormatConversion
FullyCollectTaskData
Generic
IndexManagement
JsonModuleConceptualImprovement
JsonModuleDataImplementation
JsonModuleDesign
JsonModuleDocumentation
JsonModuleTesting
PhpModuleLogicImplementation
QaJsonModuleAndProposeImprovement
Refactoring
ScenarioDevelopment
SequenceManagement
Testing
VersionedOverlayMerge
WorkflowImprovement
SelectTaskToView.scenario.json
SearchPotentialTasks.scenario.json
SCN-SystemStatusSupervisor.scenario.json

other

script/engine/invoke-scenario-engine.php
main-index.ps1
script/engine/Show-Active-Task.ps1
script/engine/Show-Scenario.ps1
script/engine/partials/_context_utils.ps1
script/engine/partials/_helpers_core.ps1
script/engine/partials/_helpers_marker.ps1
script/engine/partials/_helpers_validation.ps1
script/engine/partials/_progress_marker.ps1
script/engine/partials/_signal_manager.ps1
script/engine/partials/_step_execution.ps1
script/engine/partials/_transition_logic.ps1
script/engine/actions/php/CreateFcTaskAction.php
script/engine/actions/php/CreateTaskFromTemplateAction.php
script/engine/actions/powershell/SetTaskStatusAction.ps1
script/engine/actions/FinalizeAnswerProcessing.ps1
script/engine/actions/GenerateQuestion.php
script/engine/actions/GetAnswerAndUpdateContext.php
script/engine/actions/ManageTaskCompletionAction.php
