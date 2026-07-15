<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = ['owner_user_id', 'title', 'author', 'journal', 'year', 'status', 'cited'];

    protected $casts = ['cited' => 'integer'];
}
