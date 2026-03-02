"use strict";
/**
 * @a2a/fs-utils - File system utilities for A2A
 */
Object.defineProperty(exports, "__esModule", {value: true});
exports.scanWithIgnore = exports.filterByIgnore = exports.FileScanner = exports.GlobMatcher = exports.IgnoreDetector = void 0;
exports.createIgnoreDetector = createIgnoreDetector;
exports.createGlobMatcher = createGlobMatcher;
exports.createFileScanner = createFileScanner;
exports.matchGlob = matchGlob;
exports.scanFiles = scanFiles;
const ignore_detector_1 = require("./ignore-detector");
Object.defineProperty(exports, "IgnoreDetector", {
    enumerable: true, get: function () {
        return ignore_detector_1.IgnoreDetector;
    }
});
const glob_matcher_1 = require("./glob-matcher");
Object.defineProperty(exports, "GlobMatcher", {
    enumerable: true, get: function () {
        return glob_matcher_1.GlobMatcher;
    }
});
const file_scanner_1 = require("./file-scanner");
Object.defineProperty(exports, "FileScanner", {
    enumerable: true, get: function () {
        return file_scanner_1.FileScanner;
    }
});
var file_scanner_ignore_1 = require("./file-scanner.ignore");
Object.defineProperty(exports, "filterByIgnore", {
    enumerable: true, get: function () {
        return file_scanner_ignore_1.filterByIgnore;
    }
});
Object.defineProperty(exports, "scanWithIgnore", {
    enumerable: true, get: function () {
        return file_scanner_ignore_1.scanWithIgnore;
    }
});

function createIgnoreDetector(config) {
    return new ignore_detector_1.IgnoreDetector(config);
}

function createGlobMatcher(patterns) {
    return new glob_matcher_1.GlobMatcher(patterns);
}

function createFileScanner(config) {
    return new file_scanner_1.FileScanner(config);
}

function matchGlob(pattern, path) {
    return glob_matcher_1.GlobMatcher.match(pattern, path);
}

async function scanFiles(dir, options) {
    return file_scanner_1.FileScanner.scan(dir, options ?? {});
}
