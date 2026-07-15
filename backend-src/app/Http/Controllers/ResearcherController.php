<?php

namespace App\Http\Controllers;

use App\Models\Researcher;
use Illuminate\Http\Request;

class ResearcherController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return Researcher::orderBy('id', 'desc')->get()->map(function ($researcher) use ($user) {
            $researcher->setAttribute('is_owner', $this->isOwner($user, $researcher));

            return $researcher;
        });
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'    => 'required|string|max:255',
            'faculty' => 'required|string|max:255',
        ]);

        $data = $request->only([
            'name', 'prefix', 'first_name', 'last_name',
            'work_type', 'faculty', 'program', 'position',
            'address', 'birthday', 'phone', 'email',
            'line_id', 'national_id', 'expertise',
            'education', 'expertise_detail',
        ]);

        if (($request->user()->role ?? 'user') !== 'admin') {
            $data['owner_user_id'] = $request->user()->id;
        } elseif ($request->filled('owner_user_id')) {
            $data['owner_user_id'] = $request->input('owner_user_id');
        } else {
            $data['owner_user_id'] = $request->user()->id;
        }

        $researcher = Researcher::create($data);
        return response()->json($researcher, 201);
    }

    public function show(Request $request, Researcher $researcher)
    {
        $researcher->setAttribute('is_owner', $this->isOwner($request->user(), $researcher));

        return response()->json($researcher);
    }

    public function update(Request $request, Researcher $researcher)
    {
        abort_unless($this->canEdit($request->user(), $researcher), 403, 'Only the record owner or admin can edit this record.');

        $data = $request->only([
            'name', 'prefix', 'first_name', 'last_name',
            'work_type', 'faculty', 'program', 'position',
            'address', 'birthday', 'phone', 'email',
            'line_id', 'national_id', 'expertise',
            'education', 'expertise_detail',
        ]);

        if (($request->user()->role ?? 'user') !== 'admin') {
            $data['owner_user_id'] = $request->user()->id;
        } elseif ($request->filled('owner_user_id')) {
            $data['owner_user_id'] = $request->input('owner_user_id');
        }

        $researcher->update($data);
        return response()->json($researcher);
    }

    public function destroy(Request $request, Researcher $researcher)
    {
        abort_unless($this->canDelete($request->user(), $researcher), 403, 'Only the record owner or admin can delete this record.');

        $researcher->delete();
        return response()->json(null, 204);
    }

    private function canManage($user, Researcher $researcher): bool
    {
        return $this->canEdit($user, $researcher);
    }

    private function canEdit($user, Researcher $researcher): bool
    {
        return ($user->role ?? 'user') === 'admin'
            || ($researcher->owner_user_id && (string) $researcher->owner_user_id === (string) $user->id);
    }

    private function canDelete($user, Researcher $researcher): bool
    {
        return ($user->role ?? 'user') === 'admin'
            || ($researcher->owner_user_id && (string) $researcher->owner_user_id === (string) $user->id);
    }

    private function isOwner($user, Researcher $researcher): bool
    {
        if ($researcher->owner_user_id) {
            return (string) $researcher->owner_user_id === (string) $user->id;
        }

        return trim((string) $researcher->email) !== ''
            && trim(strtolower((string) $researcher->email)) === trim(strtolower((string) $user->email));
    }
}
