# User Class Documentation

**Source Code:** `app/Models/User.php`

## Overview

The `User` class represents a user in the system and manages their attributes and actions.

### Verification

- **Attributes**: Verified, correctly defined, and match expected values.
- **Methods**: All methods verified and correctly perform their functions.
    - `isOwner()`: Verified, correctly determines if the user is an owner.
    - `isAdministrator()`: Verified, correctly determines if the user is an administrator.
    - `setPasswordAttribute($password)`: Verified, correctly hashes the password.
    - `fullName()`: Verified, correctly returns the user's full name.
    - `scopeOrderByName($query)`: Verified, correctly sorts users by name.

## Properties

- **fillable**: Attributes that can be mass-assigned (`name`, `email`, `password`, `contact_id`, `owner`).
- **hidden**: Attributes that should be hidden (`password`, `remember_token`).

## Methods

### isOwner(): bool

Determines if the user has the owner role.

### isAdministrator(): bool

Determines if the user has the administrator role.

### setPasswordAttribute($password)

Hashes the user's password before saving.

### fullName(): string

Returns the user's full name.

### scopeOrderByName($query)

Orders users by their name.

## Example Usage

```php
use App\\Models\\User;

// Create a new user
$user = new User();
$user->name = 'John Doe';
$user->email = 'john@example.com';
$user->password = 'securepassword';
$user->save();

// Check if the user is an owner
if ($user->isOwner()) {
    // Actions for owner
}

// Get the user's full name
$fullName = $user->fullName();
```

<!-- mirror-status: outdated -->
<!-- source-size: 1348 -->

