<?php

namespace App\Http\Controllers;

use App\Models\Proposal;
use Illuminate\Http\Request;

class ProposalController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Proposal::query();

        if ($request->query('scope') === 'mine') {
            $query->where(function ($q) use ($user) {
                $q->where('owner_user_id', $user->id)
                    ->orWhere(function ($q) use ($user) {
                        $q->whereNull('owner_user_id')
                            ->where('researcher', $user->name);
                    });
            });
        }

        $limit = max(1, min((int) $request->query('per_page', 100), 500));

        return $query->orderBy('id', 'desc')->take($limit)->get()->map(function ($proposal) use ($user) {
            $proposal->setAttribute('is_owner', $this->isOwner($user, $proposal));

            if (!$this->canManage($user, $proposal)) {
                $proposal->setAttribute('budget', null);
            }

            return $proposal;
        });
    }

    public function store(Request $request)
    {
        $request->validate([
            'title'      => 'required|string|max:255',
            'researcher' => 'required|string|max:255',
        ]);

        $data = $request->only([
            'title', 'researcher', 'type', 'budget',
            'year', 'status', 'contract_no', 'contract_date',
        ]);

        if (($request->user()->role ?? 'user') !== 'admin') {
            $data['researcher'] = $request->user()->name;
            $data['owner_user_id'] = $request->user()->id;
        } elseif ($request->filled('owner_user_id')) {
            $data['owner_user_id'] = $request->input('owner_user_id');
        }

        $proposal = Proposal::create($data);

        return response()->json($proposal, 201);
    }

    public function show(Request $request, Proposal $proposal)
    {
        $proposal->setAttribute('is_owner', $this->isOwner($request->user(), $proposal));

        if (!$this->canManage($request->user(), $proposal)) {
            $proposal->setAttribute('budget', null);
        }

        return response()->json($proposal);
    }

    public function update(Request $request, Proposal $proposal)
    {
        abort_unless($this->canManage($request->user(), $proposal), 403, 'You can edit only your own records.');

        $data = $request->only([
            'title', 'researcher', 'type', 'budget',
            'year', 'status', 'contract_no', 'contract_date',
        ]);

        if (($request->user()->role ?? 'user') !== 'admin') {
            $data['researcher'] = $request->user()->name;
            $data['owner_user_id'] = $request->user()->id;
            unset($data['status'], $data['contract_no'], $data['contract_date']);
        } elseif ($request->filled('owner_user_id')) {
            $data['owner_user_id'] = $request->input('owner_user_id');
        }

        $proposal->update($data);

        return response()->json($proposal);
    }

    public function destroy(Request $request, Proposal $proposal)
    {
        abort_unless($this->canManage($request->user(), $proposal), 403, 'You can delete only your own records.');

        $proposal->delete();

        return response()->json(null, 204);
    }

    private function canManage($user, Proposal $proposal): bool
    {
        return ($user->role ?? 'user') === 'admin' || $this->isOwner($user, $proposal);
    }

    private function isOwner($user, Proposal $proposal): bool
    {
        if ($proposal->owner_user_id) {
            return (string) $proposal->owner_user_id === (string) $user->id;
        }

        return trim((string) $proposal->researcher) === trim((string) $user->name);
    }
}
