# Блокировка безопасности: Критическая команда заблокирована

## Основная информация
- **ID проблемы**: disabled
- **Категория**: Блокировка безопасности
- **Серьезность**: medium
- **Время возникновения**: 2025-12-08T00:34:38.987Z

## Заблокированная команда
```bash
Set-Location "C:\workspace\org-carior\domain-platform\services-carior"; Write-Host "Current location: $(Get-Location)"; Write-Host "Stopping dev server process (PID 20680)..."; try { Stop-Process -Id 20680 -Force -ErrorAction Stop; Write-Host "SUCCESS: Dev server stopped" } catch { Write-Host "WARNING: Could not stop process: $_" }; Start-Sleep -Seconds 2; Write-Host "`nRemoving .vite cache..."; if (Test-Path "node_modules\.vite") { Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction Stop; Write-Host "SUCCESS: .vite cache removed" } else { Write-Host "INFO: .vite cache already removed" }; Write-Host "`nReady for server restart."
```

## Причина блокировки
Критическая команда: \b(shutdown|reboot|restart)\b

## Анализ безопасности
Команда содержит критические паттерны, которые могут повредить систему

## Рекомендуемые альтернативы
Альтернативы не предложены

## Контекст
- **Рабочая директория**: `C:\apps\root\mcp\node-terminal`
- **Платформа**: win32
- **Политика безопасности**: Блокировка критических команд

---
*Сгенерировано автоматически системой дебага MCP Terminal*
