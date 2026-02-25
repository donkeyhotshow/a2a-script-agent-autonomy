<?php

namespace App\Http\Controllers\Common\Background;

use App\Http\Controllers\Common\Controller;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\Request;
use League\Glide\Responses\SymfonyResponseFactory;
use League\Glide\ServerFactory;


class ImagesController extends Controller
{
    public function show(Filesystem $filesystem, Request $request, $path)
    {
        ob_end_clean();

        $server = ServerFactory::create([
            'response' => new SymfonyResponseFactory($request),
            'source' => $filesystem->getDriver(),
            'cache' => $filesystem->getDriver(),
            'cache_path_prefix' => '.glide-cache',
        ]);

        return $server->getImageResponse($path, $request->all());
    }
}
