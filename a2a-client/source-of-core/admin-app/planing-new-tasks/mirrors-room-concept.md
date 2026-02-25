# хочу и уже дано начало системе.

система где под одним адресом можно получить различные файлы которые связаны с одним файлом "исходников" кода. тоесть,
имея адрес какого php файла, можно запросить на него ->original, ->md, ->indexingData, ->validationSchema, ->
feautureTest, ->moreOtherThingsWhitchFileCanBeRelated.

# ббольше всего хочу

indexingData - это нужно, потому что текущий индексатор немножко неоптимален, а будет супер оптимально, когда данные
будут гдето в системе, а скрипт,через запуск php скриптов, которые сейчас спокойно принимают json строку, нужно только
грамотно инструктировать ИИ что консольные команды нужно применять сетом через && и ;

причем, я успел потерять файлик. тем не всегда работает через ; когда ошибка в первом, то второй блокирует ошибку и надо
запускать через && но всеравно, через ; надежней.

еще вспомнил. QTU можно переделать на работу с системой зеркал.
на каждый файл можно иметь отдельные вопросы, хранить полный @memories контекс создания файла или документа, чтоб по
етим промтам можно было воссоздать код.


------

Mirror Rooms в конце должна разрабатыватся система, но не сейчас. единственная проблема сейчас с текущей реализацией
Mirror Rooms , это то что еще нигде не оглашено что вся документация что была - мигрировала на текущую реализацию Mirror
Rooms и документы хранятся там отдельно от основной документации , а в основной документации только гайды и тому
подобная информация




 ------

комната зеркал должна будет , дополнительно, иметь файл с записью промта для генерации етого файла. типа карточка года
файла на примере

 ```json:implement-modules/primary-form/v1/programs/story/codePlanTdemplatePreview.json
улучшить етот файл. испытания показали что небыла описана логика которая очень сложная для описания, но почему же нельзя было попытатся?
[
    {
        "path": "<path to php file>",
        "trait": {
            "namespace": "<namespace>",
            "functions": [
                {
                    "name": "<functionName>",
                    "args": [
                        "<arg1>",
                        "<arg2>"
                    ],
                    "context": "<context>"
                }
            ]
        }
    },
    {
        "path": "<path to php file>",
        "code": {
            "namespace": "<namespace>",
            "use": [
                "<useFile1>",
                "<useFile2>"
            ],
            "class": {
                "name": "<className>",
                "properties": [
                    {
                        "<property1>": {
                            "type": "<type>",
                            "value": "<value>"
                        }
                    },
                    {
                        "<property2>": {
                            "type": "<type>",
                            "value": "<value>"
                        }
                    }
                ],
                "methods": [
                    {
                        "<methodName1>": {
                            "args": [
                                "<arg1>",
                                "<arg2>"
                            ],
                            "static": true,
                            "source": "<source>",
                            "context": "<context>"
                        }
                    },
                    {
                        "<methodName1>": {
                            "args": [
                                "<arg1>",
                                "<arg2>"
                            ],
                            "trait": "<trait>",
                            "context": "<context>"
                        }
                    },
                    {
                        "<methodName1>": {
                            "args": [
                                "<arg1>",
                                "<arg2>"
                            ],
                            "context": "<context>"
                        }
                    },
                    {
                        "<methodName2>": {
                            "args": [
                                "<arg>"
                            ],
                            "context": "<context>"
                        }
                    }
                ]
            },
            "content": "<content>"
        }
    },
    {
        "path": "<path to vuefile>",
        "code": {
            "template": [
                "<$component1>",
                "<$component2>"
            ],
            "script": [
                "<$imports>",
                "<$props>",
                "<$data>",
                "<$methods>",
                "<$watch>",
                "<$computed>",
                "<$mounted>",
                "<$template>",
                "<$created>",
                "<$beforeDestroy>",
                "<$destroyed>",
                "<$methods>",
                "<$watch>",
                "<$computed>",
                "<$mounted>",
                "<$beforeMount>",
                "<$beforeUpdate>",
                "<$updated>",
                "<$activated>",
                "<$deactivated>",
                "<$errorCaptured>",
                "<$renderTracked>",
                "<$renderTriggered>"
            ],
            "style": [
                "<$style>",
                "<$style2>"
            ]
        }
    }
]
 ```

 ```json:implement-modules/primary-form/v1/programs/story/result/codePlans.json
 с етого файла небыло полного восстановления файла, поетому я вынес код инсталяции в хелперы.
[
    {
        "path": "app/Console/Commands/AiDepot/File.php",
        "code": {
            "namespace": "App\\Console\\Commands\\AiDepot",
            "use": [
                "App\\Console\\Commands\\Config\\Normal",
                "Illuminate\\Console\\Command",
                "Symfony\\Component\\Finder\\Finder"
            ],
            "class": {
                "name": "File",
                "properties": []
            },
            "content": "See the actual source code in app/Console/Commands/AiDepot/File.php",
            "methods": [
                {
                    "handle": {
                        "args": [],
                        "static": false,
                        "source": "Generates a JSON listing of project files, optionally filtered by {type}.",
                        "context": "Implements the logic to scan directories, exclude unwanted files/folders, categorize paths, and output JSON."
                    }
                },
                {
                    "categorizeFile": {
                        "args": [
                            "path"
                        ],
                        "context": "Maps a file path to a category based on a nested array of known directories."
                    }
                },
                {
                    "flattenMap": {
                        "args": [
                            "map",
                            "prefix"
                        ],
                        "context": "Recursively transforms a nested array of directories into a single-level associative array."
                    }
                },
                {
                    "buildNestedStructure": {
                        "args": [
                            "structure",
                            "pathParts",
                            "size"
                        ],
                        "context": "Recursively constructs a multi-level array reflecting directory structure and file sizes."
                    }
                },
                {
                    "exportStructuredList": {
                        "args": [],
                        "static": false,
                        "source": "Generates a more structured output, grouping files by category or by system modules.",
                        "context": "Reorganizes the flat list {category, path, size} into a nested structure. Next step: improve category logic to match real modules."
                    }
                },
                {
                    "buildModuleMap": {
                        "args": [],
                        "static": false,
                        "source": "Attempt to split the codebase into modules or systems based on file path segments.",
                        "context": "Further refine the category logic by searching for known 'module' or 'system' indicators, then group them in a sub-tree."
                    }
                },
                {
                    "createModulesFileIndex": {
                        "args": [],
                        "static": false,
                        "source": "Generate a user-defined JSON that maps modules to their respective file paths. This structure becomes the baseline for comparing actual vs. expected files.",
                        "context": "Allows the user to define which files belong to which module/system, acting as a central registry or linking map."
                    }
                },
                {
                    "verifyModuleFileMapping": {
                        "args": [],
                        "static": false,
                        "source": "Compare the existing file system to the user-defined module-file map, listing any mismatches or missing references.",
                        "context": "Identifies files that are not in the map (orphaned) and modules referencing files that do not exist on disk."
                    }
                }
            ],
            "newFeatures": {
                "moduleSeparation": [
                    "Add logic to detect 'modules' or 'systems' for grouping files, beyond 'category' alone.",
                    "Split large categories (e.g. 'ai') into submodules for smaller token usage."
                ],
                "treeOutput": [
                    "Optionally build a tree-like structure: {module: '...', children: [{path: '...'}, ...]}",
                    "Allow a 'compact' mode for minimal token usage."
                ]
            }
        }
    }
]


 ```
