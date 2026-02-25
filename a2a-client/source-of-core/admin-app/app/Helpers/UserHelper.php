<?php

namespace App\Helpers;

class UserHelper
{
    /**
     * Check if the user is an owner.
     *
     * @param array $user User data
     * @return bool
     */
    public static function isOwner(array $user): bool
    {
        return isset($user['role']) && $user['role'] === 'owner';
    }

    /**
     * Check if the user is an administrator.
     *
     * @param array $user User data
     * @return bool
     */
    public static function isAdministrator(array $user): bool
    {
        return isset($user['role']) && ($user['role'] === 'administrator' || $user['role'] === 'admin');
    }

    /**
     * Get the full name of the user.
     *
     * @param array $user User data
     * @return string
     */
    public static function getFullName(array $user): string
    {
        $firstName = $user['first_name'] ?? '';
        $lastName = $user['last_name'] ?? '';
        $name = $user['name'] ?? '';

        if (!empty($firstName) || !empty($lastName)) {
            return trim($firstName . ' ' . $lastName);
        }

        return $name;
    }

    /**
     * Get user role.
     *
     * @param array $user User data
     * @return string
     */
    public static function getRole(array $user): string
    {
        return $user['role'] ?? 'user';
    }

    /**
     * Check if user has permission.
     *
     * @param array $user User data
     * @param string $permission Permission to check
     * @return bool
     */
    public static function hasPermission(array $user, string $permission): bool
    {
        if (self::isOwner($user)) {
            return true;
        }

        $permissions = $user['permissions'] ?? [];
        return in_array($permission, $permissions);
    }

    /**
     * Check if user has any of the given permissions.
     *
     * @param array $user User data
     * @param array $permissions Permissions to check
     * @return bool
     */
    public static function hasAnyPermission(array $user, array $permissions): bool
    {
        if (self::isOwner($user)) {
            return true;
        }

        $userPermissions = $user['permissions'] ?? [];
        return !empty(array_intersect($permissions, $userPermissions));
    }

    /**
     * Check if user has all of the given permissions.
     *
     * @param array $user User data
     * @param array $permissions Permissions to check
     * @return bool
     */
    public static function hasAllPermissions(array $user, array $permissions): bool
    {
        if (self::isOwner($user)) {
            return true;
        }

        $userPermissions = $user['permissions'] ?? [];
        return empty(array_diff($permissions, $userPermissions));
    }

    /**
     * Get user email.
     *
     * @param array $user User data
     * @return string
     */
    public static function getEmail(array $user): string
    {
        return $user['email'] ?? '';
    }

    /**
     * Get user ID.
     *
     * @param array $user User data
     * @return int|string
     */
    public static function getId(array $user)
    {
        return $user['id'] ?? 0;
    }

    /**
     * Check if user is active.
     *
     * @param array $user User data
     * @return bool
     */
    public static function isActive(array $user): bool
    {
        return isset($user['status']) && $user['status'] === 'active';
    }

    /**
     * Check if user is verified.
     *
     * @param array $user User data
     * @return bool
     */
    public static function isVerified(array $user): bool
    {
        return isset($user['email_verified_at']) && !empty($user['email_verified_at']);
    }
}
