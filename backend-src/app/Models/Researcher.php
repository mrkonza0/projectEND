<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Researcher extends Model
{
    protected $fillable = [
        'name', 'prefix', 'first_name', 'last_name',
        'work_type', 'faculty', 'program', 'position',
        'address', 'birthday', 'phone', 'email',
        'line_id', 'national_id', 'expertise',
        'education', 'expertise_detail',
    ];

    protected $casts = [
        'education'        => 'array',
        'expertise_detail' => 'array',
    ];
}
