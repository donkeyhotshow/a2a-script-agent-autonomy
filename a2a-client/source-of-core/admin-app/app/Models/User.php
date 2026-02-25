<?php

namespace App\Models;

use App\Helpers\StringHelper;
use App\Helpers\UserHelper;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name', 'email', 'password', 'login', 'owner', 'account_id'
    ];

    protected $hidden = [
        'password', 'remember_token'
    ];

    public function isOwner(): bool
    {
        return UserHelper::isOwner($this);
    }

    public function isAdministrator(): bool
    {
        return UserHelper::isAdministrator($this);
    }

    public function setPasswordAttribute($password)
    {
        $this->attributes['password'] = Hash::needsRehash($password) ? Hash::make($password) : $password;
    }

    public function fullName(): string
    {
        return StringHelper::trim($this->first_name . ' ' . $this->last_name);
    }

    public function scopeOrderByName($query)
    {
        $query->orderBy('last_name')->orderBy('first_name');
    }

    protected function casts(): array
    {
        return [
            'owner' => 'integer',
        ];
    }
}
