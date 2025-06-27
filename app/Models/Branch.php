<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $fillable = ['sucursal', 'descripcion', 'raw_coordinates'];

    protected $casts = [
        'raw_coordinates' => 'array',
    ];

}

