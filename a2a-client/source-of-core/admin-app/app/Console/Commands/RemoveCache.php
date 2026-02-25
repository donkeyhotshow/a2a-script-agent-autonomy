<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class RemoveCache extends Command
{
    public $signature = 'cache:remove';

    public function handle()
    {
        Artisan::call('cache:clear');
        Artisan::call('config:clear');
        Artisan::call('route:clear');
        Artisan::call('view:clear');
// compiled
        Artisan::call('event:clear');
        shell_exec('composer dump-autoload');
//        shell_exec('composer clear-cache');
    }
}
