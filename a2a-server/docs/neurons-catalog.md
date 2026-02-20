# Neurons Catalog

Auto-generated. Run `npm run neurons:doc` to regenerate.

See [neurons.md](neurons.md) for CLI, types, request_files.

| id | category | triggers | actions | priority |
|----|----------|----------|---------|---------|
| neuron-validation | validation | 4 | inject | 5 |
| neuron-auth | auth | 4 | inject | 5 |
| neuron-eloquent | eloquent | 5 | inject, request_files | 5 |
| neuron-routing | routing | 4 | inject | 5 |
| neuron-views | views | 4 | inject | 5 |
| neuron-testing | testing | 5 | inject | 5 |
| neuron-project-detector | architecture | 3 | inject | 5 |

## Details
### neuron-validation
- **Category:** validation
- **Triggers:** FormRequest, rules(), validate(, Http\Requests
- **Mode:** any
- **Priority:** 5

### neuron-auth
- **Category:** auth
- **Triggers:** Policy, Guard, middleware('auth'), App\Policies
- **Mode:** any
- **Priority:** 5

### neuron-eloquent
- **Category:** eloquent
- **Triggers:** extends Model, belongsTo, hasMany, factory, App\Models
- **Mode:** any
- **Priority:** 5

### neuron-routing
- **Category:** routing
- **Triggers:** Route::, Controller, web.php, App\Http\Controllers
- **Mode:** any
- **Priority:** 5

### neuron-views
- **Category:** views
- **Triggers:** Inertia, .vue, resources/js, Inertia\
- **Mode:** any
- **Priority:** 5

### neuron-testing
- **Category:** testing
- **Triggers:** Pest, PHPUnit, TestCase, factory(, extends TestCase
- **Mode:** any
- **Priority:** 5

### neuron-project-detector
- **Category:** architecture
- **Triggers:** laravel/framework, laravel, composer
- **Mode:** any
- **Priority:** 5
