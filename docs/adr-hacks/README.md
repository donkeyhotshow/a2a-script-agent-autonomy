# ADR Hacks — etalon-based

**Index:** [docs/README.md](../README.md) | **Etalon:** [etalon-neuron-activation.md](../etalon-neuron-activation.md) | **Analysis:** [HACK-RESULTS-ANALYSIS.md](HACK-RESULTS-ANALYSIS.md) | **Tasks:** [tasks/README.md](../../tasks/README.md)

Hacks aligned with θ (theta) neuron activation. new_task + codeBlocks/arch → neurons.

## Hacks

| # | Title | Status |
|---|-------|--------|
| [0001](0001-direct-api-bypass.md) | Direct API bypass — POST /requests | accepted |

## Etalon raw examples (MD protocol)

Format: ````context` + ````file:path`. See [requirements.md](../../a2a-client/docs/requirements.md) §5.2.

| Scenario | new_task | codeBlocks | arch | Neurons |
|---------|---------|------------|------|---------|
| **A** | "fix bug" | [] | [] | 0 (empty pool) |
| **B** | "add validation" | [] | [FormRequest] | validation (arch-triggered) |
| **D** | "refactor model" | [User.php] | [...] | eloquent, etc. (content-triggered) |
| **E** | "do something" | [] | [] | 0 (fallback needed) |

| # | Request | Response |
|---|----------|----------|
| A | [raw/etalon-A-request.md](raw/etalon-A-request.md) | [raw/etalon-A-response.md](raw/etalon-A-response.md) |
| B | [raw/etalon-B-request.md](raw/etalon-B-request.md) | [raw/etalon-B-response.md](raw/etalon-B-response.md) |
| D | [raw/etalon-D-request.md](raw/etalon-D-request.md) | [raw/etalon-D-response.md](raw/etalon-D-response.md) |
| E | [raw/etalon-E-request.md](raw/etalon-E-request.md) | [raw/etalon-E-response.md](raw/etalon-E-response.md) |

## process-input script

Local MD processing without API/DB:

```bash
# from repo root
npx tsx a2a-server/scripts/process-input.ts [input.md] [output.md]
# default: docs/adr-hacks/raw/etalon-D-request.md → output/etalon-D-result.md
```
