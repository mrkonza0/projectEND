<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Proposal extends Model
{
    protected $fillable = [
        'owner_user_id', 'title', 'researcher', 'type', 'budget',
        'year', 'status', 'contract_no', 'contract_date',
    ];
}
