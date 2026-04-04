Write-Host "--- Z.ai ---"
try { (Invoke-RestMethod -Uri "https://api.z.ai/api/paas/v4/chat/completions" -Method POST -Headers @{"Authorization"="Bearer b97a7c5004e04c9b931e79a5efff859f.nrkEXF005xU4T9Br";"Content-Type"="application/json"} -Body '{"model":"glm-4.7-flash","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content } catch { Write-Host "Failed: $_" }

Write-Host "--- OpenRouter ---"
try { (Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/chat/completions" -Method POST -Headers @{"Authorization"="Bearer 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";"Content-Type"="application/json"} -Body '{"model":"deepseek/deepseek-r1:free","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content } catch { Write-Host "Failed: $_" }

Write-Host "--- Qwen ---"
try { (Invoke-RestMethod -Uri "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions" -Method POST -Headers @{"Authorization"="Bearer sk-71a6a894c1d04717a8cec0681752a164";"Content-Type"="application/json"} -Body '{"model":"qwen-turbo","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content } catch { Write-Host "Failed: $_" }

Write-Host "--- Groq ---"
try { (Invoke-RestMethod -Uri "https://api.groq.com/openai/v1/chat/completions" -Method POST -Headers @{"Authorization"="Bearer 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";"Content-Type"="application/json"} -Body '{"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content } catch { Write-Host "Failed: $_" }

Write-Host "--- Mistral ---"
try { (Invoke-RestMethod -Uri "https://codestral.mistral.ai/v1/chat/completions" -Method POST -Headers @{"Authorization"="Bearer PiesFLjffjwZofEftjgzLcVbNlgv94Tr";"Content-Type"="application/json"} -Body '{"model":"codestral-latest","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content } catch { Write-Host "Failed: $_" }

Write-Host "--- Together AI ---"
try { (Invoke-RestMethod -Uri "https://api.together.ai/v1/chat/completions" -Method POST -Headers @{"Authorization"="Bearer key_CZfYhdJjK9NXPBkQEynTe";"Content-Type"="application/json"} -Body '{"model":"deepseek-ai/DeepSeek-R1","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content } catch { Write-Host "Failed: $_" }

Write-Host "--- Cerebras ---"
try { (Invoke-RestMethod -Uri "https://api.cerebras.ai/v1/chat/completions" -Method POST -Headers @{"Authorization"="Bearer csk-dhfryj8rcdr656mvdkptdv29j5cmjpd5d9yh8yx8j8jcrknp";"Content-Type"="application/json"} -Body '{"model":"llama-3.3-70b","messages":[{"role":"user","content":"ping"}]}').choices[0].message.content } catch { Write-Host "Failed: $_" }

Write-Host "--- Cohere ---"
try { (Invoke-RestMethod -Uri "https://api.cohere.ai/v2/chat" -Method POST -Headers @{"Authorization"="Bearer WnFNt5UQK39iRBhjWNUdBTJZlhLM0HR3ifc0ESQa";"Content-Type"="application/json"} -Body '{"model":"command-a-03-2025","messages":[{"role":"user","content":"ping"}]}').message.content[0].text } catch { Write-Host "Failed: $_" }
