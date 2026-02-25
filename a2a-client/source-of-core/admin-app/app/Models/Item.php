<?php

namespace App\Models;

// use App\Helpers\ItemHelper; // Будет удалено
use App\Helpers\ArrayHelper;
use App\Helpers\JsonHelper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory;

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'data' => 'array',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'data',
    ];

    /**
     * Check if the item's data has a specific attribute.
     * (Перенесено из ItemHelper::hasAttribute)
     *
     * @param string $attribute
     * @return bool
     */
    public function hasDataAttribute(string $attribute): bool
    {
        return ArrayHelper::has($this->data, $attribute);
    }

    /**
     * Get the address of the item.
     *
     * @return string|null
     */
    public function getAddressAttribute()
    {
        return ArrayHelper::get($this->data, 'address');
    }

    /**
     * Get the content of the item.
     *
     * @return mixed|null
     */
    public function getContentAttribute()
    {
        return ArrayHelper::get($this->data, 'content');
    }

    /**
     * Get the component type.
     *
     * @return string|null
     */
    public function getTypeAttribute()
    {
        return ArrayHelper::get($this->data, 'type');
    }

    /**
     * Get the component props.
     *
     * @return array|null
     */
    public function getPropsAttribute()
    {
        return ArrayHelper::get($this->data, 'props');
    }

    /**
     * Get the linked component ID.
     *
     * @return int|null
     */
    public function getLinkedComponentIdAttribute()
    {
        return ArrayHelper::get($this->data, 'linked_component_id');
    }

    public function hasAddress(string $address): bool
    {
        // Обновлено для использования внутреннего метода hasDataAttribute
        return $this->hasDataAttribute('address') && ArrayHelper::get($this->data, 'address') === $address;
    }

    /**
     * Scope a query to find items by address.
     *
     * @param Builder $query
     * @param string $address
     * @return Builder
     */
    public function scopeByAddress($query, string $address)
    {
        return $query->whereJsonContains('data->address', $address);
    }

    /**
     * Scope a query to find items by type.
     *
     * @param Builder $query
     * @param string $type
     * @return Builder
     */
    public function scopeByType($query, string $type)
    {
        return $query->whereJsonContains('data->type', $type);
    }

    /**
     * Filter items based on a specific attribute and value in their data.
     * (Перенесено из ItemHelper::filterItemsByAttribute)
     *
     * @param array $items An array of Item objects
     * @param string $attribute
     * @param mixed $value
     * @return array
     */
    public static function filterByDataAttribute(array $items, string $attribute, $value): array
    {
        return ArrayHelper::filter($items, function ($item) use ($attribute, $value) {
            // Убедимся, что $item это объект Item и у него есть свойство data (массив)
            return $item instanceof Item && ArrayHelper::get($item->data, $attribute) === $value;
        });
    }

    /**
     * Convert the model's data to JSON.
     *
     * @return string
     */
    public function toJson(): string
    {
        return JsonHelper::encode($this->toArray());
    }

    /**
     * Get the model's data as an array.
     *
     * @return array
     */
    public function toArray(): array
    {
        $array = parent::toArray();
        $array['data'] = JsonHelper::decode($this->data);
        return $array;
    }
}
