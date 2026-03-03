# Task: Production Deployment Preparation

## Goal
Подготовить клиентскую часть к production deployment

## Work to perform
1. **Performance Optimization**
   - Code splitting для web/js модулей
   - Lazy loading для RAG Search и Terminal
   - Bundle size analysis и оптимизация

2. **Security Hardening**
   - CSP (Content Security Policy) заголовки
   - Input sanitization
   - XSS protection

3. **Monitoring Setup**
   - Error tracking (Sentry или аналог)
   - Performance metrics
   - User analytics

## Acceptance criteria
- Bundle size < 500KB (gzipped)
- Lighthouse score > 90
- Security audit passed
