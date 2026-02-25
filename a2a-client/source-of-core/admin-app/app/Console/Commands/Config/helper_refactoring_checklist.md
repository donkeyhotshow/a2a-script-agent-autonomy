## Potential Helper Refactoring in app/Console/Commands/Config/

- [ ] Refactor `json_decode` and `json_encode` usages to use `App\Helpers\JsonHelper`.
    - FtpConfig.php
    - JsonOptions.php
- [ ] Refactor array manipulation functions (`array_merge`, `array_keys`, `array_filter`) to use `App\Helpers\ArrayHelper`.
    - FtpConfig.php
    - JsonOptions.php
- [ ] Refactor file operations (`File::get`, `File::exists`, `file_exists`, `mkdir`) to use `App\Helpers\FileHelper` and `App\Helpers\PathHelper`.
    - FtpConfig.php
    - JsonOptions.php
- [ ] Review `PathHelper::normalizePath` usage to ensure consistency with the new `App\Helpers\PathHelper`.
    - FtpConfig.php
