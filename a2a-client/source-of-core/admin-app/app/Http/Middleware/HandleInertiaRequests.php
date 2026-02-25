<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Inertia\Middleware;


//use Illuminate\Support\Facades\Log;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Defines the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     */
    public function share(Request $request): array
    {
        $ret = parent::share($request);

        // Define shared data using closures to ensure they are evaluated only when needed.

        // Authentication status and user data
        $ret['auth'] = function () use ($request) {
            $user = $request->user();
            return [
                // Select only necessary fields for security/efficiency
                'user' => $user ? $user->only('id', 'login', 'email', 'name', 'owner', 'photo_path') : null,
                // You can add more auth-related flags here if needed, e.g., roles, permissions
            ];
        };

        // Session flash messages
        $ret['flash'] = function () use ($request) {
            return [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ];
        };

        // Validation errors shared from the session
        $ret['errors'] = function () use ($request) {
            // Return errors as an object (compatible with Inertia's error handling)
            return $request->session()->get('errors')
                ? $request->session()->get('errors')->getBag('default')->getMessages()
                : (object)[];
        };

        /*        if ($this->rootView == 'front') {
                    $ret['cart']=Cart::cart();
                    $ret['cart_url']= URL::route('checkout.cart');
        //            $ret['categories_menu']= fn() => Category::menu();
                }*/// Log shared data for debugging
//        Log::info('Shared data:', ['shared' => $ret]);

        return $ret;
    }

    public function handle(Request $request, Closure $next)
    {
        $rw = 'front';
        $ssr = true;
        if ($request->user()) {
            if (in_array($request->user()->owner, [1, 2])) {
                $rw = 'app';
                $ssr = false;
            }
        }
        if ($request->is('admin*')) {
            $this->rootView = 'app';
        } else {
            $this->rootView = 'front';
            Config::set('inertia.ssr.enabled', true);
        }

        ///// TEMP
        // $rw = 'app';
        $this->rootView = $rw;
        Config::set('inertia.ssr.enabled', $ssr);
        return parent::handle($request, $next);
    }
}
