```context
{
  "version": "1.0",
  "project_path": "C:/workspace/example",
  "new_task": ["refactor model"],
  "architectural_features": ["Laravel"]
}
```

```file:app/Models/User.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Model
{
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }
}
```
