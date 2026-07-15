<?php

namespace App\Http\Controllers;

use App\Models\Report;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Report::query();

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

        return $query->orderBy('id', 'desc')->take($limit)->get()->map(function ($report) use ($user) {
            $report->setAttribute('is_owner', $this->isOwner($user, $report));

            return $report;
        });
    }

    public function store(Request $request)
    {
        $request->validate([
            'project' => 'required|string|max:255',
            'title'   => 'required|string|max:255',
        ]);

        $data = $request->only([
            'project', 'title', 'abstract', 'date', 'status', 'researcher',
        ]);

        if (($request->user()->role ?? 'user') !== 'admin') {
            $data['owner_user_id'] = $request->user()->id;
        } elseif ($request->filled('owner_user_id')) {
            $data['owner_user_id'] = $request->input('owner_user_id');
        }

        $report = Report::create($data);

        return response()->json($report, 201);
    }

    public function show(Request $request, Report $report)
    {
        $report->setAttribute('is_owner', $this->isOwner($request->user(), $report));

        return response()->json($report);
    }

    public function update(Request $request, Report $report)
    {
        abort_unless($this->canManage($request->user(), $report), 403, 'You can edit only your own records.');

        $data = $request->only([
            'project', 'title', 'abstract', 'date', 'status', 'researcher',
        ]);

        if (($request->user()->role ?? 'user') !== 'admin') {
            $data['owner_user_id'] = $request->user()->id;
        } elseif ($request->filled('owner_user_id')) {
            $data['owner_user_id'] = $request->input('owner_user_id');
        }

        $report->update($data);

        return response()->json($report);
    }

    public function destroy(Request $request, Report $report)
    {
        abort_unless($this->canManage($request->user(), $report), 403, 'You can delete only your own records.');

        $report->delete();

        return response()->json(null, 204);
    }

    private function canManage($user, Report $report): bool
    {
        return ($user->role ?? 'user') === 'admin' || $this->isOwner($user, $report);
    }

    private function isOwner($user, Report $report): bool
    {
        if ($report->owner_user_id) {
            return (string) $report->owner_user_id === (string) $user->id;
        }

        return trim((string) $report->researcher) === trim((string) $user->name);
    }
}
