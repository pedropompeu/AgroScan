<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Farm extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = ['id', 'name', 'user_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scoutings()
    {
        return $this->hasMany(FieldScouting::class);
    }
}
