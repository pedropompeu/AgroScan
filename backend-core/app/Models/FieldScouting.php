<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FieldScouting extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'user_id',
        'location',
        'disease_detected',
        'disease_code',
        'confidence_score',
        'image_path',
        'status',
        'farm_id'
    ];

    public function farm()
    {
        return $this->belongsTo(Farm::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
