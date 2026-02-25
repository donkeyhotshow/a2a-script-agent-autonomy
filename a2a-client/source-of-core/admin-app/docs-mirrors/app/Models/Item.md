# Item Class Documentation

**Source Code:** `app/Models/Item.php`

## Overview

The `Item` class represents an item in the database and manages its attributes and actions.

### Verification

- **Attributes**: Verified, correctly defined, and match expected values.
- **Methods**: All methods verified and correctly perform their functions.
    - `getAddressAttribute()`: Verified, correctly returns the address.
    - `getContentAttribute()`: Verified, correctly returns the content.
    - `getTypeAttribute()`: Verified, correctly returns the type.
    - `getPropsAttribute()`: Verified, correctly returns properties.
    - `getLinkedComponentIdAttribute()`: Verified, correctly returns the linked component ID.
    - `hasAddress(string $address)`: Verified, correctly checks for the presence of an address.
    - `scopeByAddress($query, string $address)`: Verified, correctly filters queries by address.
    - `scopeByType($query, string $type)`: Verified, correctly filters queries by type.

## Properties

- **fillable**: Attributes that can be mass-assigned (`data`).
- **casts**: Attributes that should be cast to a specific type (`data` as array).

## Methods

### getAddressAttribute()

Returns the item's address.

### getContentAttribute()

Returns the item's content.

### getTypeAttribute()

Returns the item's type.

### getPropsAttribute()

Returns the item's properties.

### getLinkedComponentIdAttribute()

Returns the ID of the linked component.

### hasAddress(string $address): bool

Checks if the item has the specified address.

### scopeByAddress($query, string $address): \\Illuminate\\Database\\Eloquent\\Builder

Scope for finding items by address.

### scopeByType($query, string $type): \\Illuminate\\Database\\Eloquent\\Builder

Scope for finding items by type.

## Example Usage

```php
use App\\Models\\Item;

// Create a new item
$item = new Item();
$item->data = ['address' => '123 Main St', 'type' => 'example'];
$item->save();

// Find items by address
$foundItems = Item::byAddress('123 Main St')->get();
```

<!-- mirror-status: outdated -->
<!-- source-size: 2338 -->

