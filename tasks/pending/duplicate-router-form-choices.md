# Code Duplication: Router Form Choices

The `execute.form.choices` array is copied across simulations with minor variations.

**Locations:**
- `simulations/sync/dialog/1/received.json` and `simulations/sync/fix-laravel-namespaces-and-uses/1/received.json` share identical choices
- Similar in `simulations/sync/script/1/received.json`

**Recommendation:** Extract common choice lists to shared configuration.