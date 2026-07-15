<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $fillable = [
        'owner_user_id', 'project', 'title', 'abstract',
        'date', 'status', 'researcher',
    ];
}
