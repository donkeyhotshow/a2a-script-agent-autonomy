<?php

namespace App\AiRudeDepot\Modules;

// use Illuminate\Contracts\Auth\Authenticatable;
// use Illuminate\Support\Facades\Auth;

class LoginForm extends PageModule
{
    public $folder = 'login-form';

    /**
     * Attempt to authenticate the user using Laravel Auth.
     *
     * @param array $credentials ['login' => string, 'password' => string, 'remember' => bool|null]
     * @return Authenticatable|bool User object on success, false on failure.
     */
    // public function attemptLogin(array $credentials)
    // {
    //     // Determine if the login field is likely an email
    //     $loginField = filter_var($credentials['login'] ?? '', FILTER_VALIDATE_EMAIL) ? 'email' : 'login';

    //     $authCredentials = [
    //         $loginField => $credentials['login'] ?? null,
    //         'password' => $credentials['password'] ?? null,
    //     ];

    //     $remember = isset($credentials['remember']) && $credentials['remember'];

    //     if (Auth::attempt($authCredentials, $remember)) {
    //         // Authentication passed...
    //         return Auth::user(); // Return the authenticated user object
    //     } else {
    //         // Authentication failed...
    //         return false;
    //     }
    // }
}
