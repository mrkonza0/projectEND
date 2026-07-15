<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['owner_user_id', 'title', 'researcher', 'budget', 'year', 'status'];
}
