<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Project::query();

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

        return $query->orderBy('id', 'desc')->take($limit)->get()->map(function ($project) use ($user) {
            $project->setAttribute('is_owner', $this->isOwner($user, $project));

            if (!$this->canManage($user, $project)) {
                $project->setAttribute('budget', null);
            }

            return $project;
        });
    }

    public function store(Request $request)
    {
        $request->validate([
            'title'      => 'required|string|max:255',
            'researcher' => 'required|string|max:255',
        ]);

        $data = $request->only(['title', 'researcher', 'budget', 'year', 'status']);

        if (($request->user()->role ?? 'user') !== 'admin') {
            $data['owner_user_id'] = $request->user()->id;
        } elseif ($request->filled('owner_user_id')) {
            $data['owner_user_id'] = $request->input('owner_user_id');
        }

        $project = Project::create($data);

        return response()->json($project, 201);
    }

    public function update(Request $request, Project $project)
    {
        abort_unless($this->canManage($request->user(), $project), 403, 'You can edit only your own records.');

        $data = $request->only(['title', 'researcher', 'budget', 'year', 'status']);

        if (($request->user()->role ?? 'user') !== 'admin') {
            $data['owner_user_id'] = $request->user()->id;
        } elseif ($request->filled('owner_user_id')) {
            $data['owner_user_id'] = $request->input('owner_user_id');
        }

        $project->update($data);

        return response()->json($project);
    }

    public function destroy(Request $request, Project $project)
    {
        abort_unless($this->canDelete($request->user(), $project), 403, 'Only the record owner or admin can delete this record.');

        $project->delete();

        return response()->json(null, 204);
    }

    private function canManage($user, Project $project): bool
    {
        return ($user->role ?? 'user') === 'admin' || $this->isOwner($user, $project);
    }

    private function canDelete($user, Project $project): bool
    {
        return ($user->role ?? 'user') === 'admin'
            || ($project->owner_user_id && (string) $project->owner_user_id === (string) $user->id);
    }

    private function isOwner($user, Project $project): bool
    {
        if ($project->owner_user_id) {
            return (string) $project->owner_user_id === (string) $user->id;
        }

        return trim((string) $project->researcher) === trim((string) $user->name);
    }
}
