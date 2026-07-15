<?php

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Article::query();

        if ($request->query('scope') === 'mine') {
            $query->where(function ($q) use ($user) {
                $q->where('owner_user_id', $user->id)
                    ->orWhere(function ($q) use ($user) {
                        $q->whereNull('owner_user_id')
                            ->where('author', $user->name);
                    });
            });
        }

        $limit = max(1, min((int) $request->query('per_page', 100), 500));

        return $query->orderBy('id', 'desc')->take($limit)->get()->map(function ($article) use ($user) {
            $article->setAttribute('is_owner', $this->isOwner($user, $article));

            return $article;
        });
    }

    public function store(Request $request)
    {
        $request->validate([
            'title'  => 'required|string|max:255',
            'author' => 'required|string|max:255',
        ]);

        $data = $request->only(['title', 'author', 'journal', 'year', 'status', 'cited']);

        if (($request->user()->role ?? 'user') !== 'admin') {
            $data['owner_user_id'] = $request->user()->id;
        } elseif ($request->filled('owner_user_id')) {
            $data['owner_user_id'] = $request->input('owner_user_id');
        }

        $article = Article::create($data);

        return response()->json($article, 201);
    }

    public function update(Request $request, Article $article)
    {
        abort_unless($this->canEdit($request->user(), $article), 403, 'Only the record owner or admin can edit this record.');

        $data = $request->only(['title', 'author', 'journal', 'year', 'status', 'cited']);

        if (($request->user()->role ?? 'user') !== 'admin') {
            $data['owner_user_id'] = $request->user()->id;
        } elseif ($request->filled('owner_user_id')) {
            $data['owner_user_id'] = $request->input('owner_user_id');
        }

        $article->update($data);

        return response()->json($article);
    }

    public function destroy(Request $request, Article $article)
    {
        abort_unless($this->canDelete($request->user(), $article), 403, 'Only the record owner or admin can delete this record.');

        $article->delete();

        return response()->json(null, 204);
    }

    private function canManage($user, Article $article): bool
    {
        return $this->canEdit($user, $article);
    }

    private function canEdit($user, Article $article): bool
    {
        return ($user->role ?? 'user') === 'admin'
            || ($article->owner_user_id && (string) $article->owner_user_id === (string) $user->id);
    }

    private function canDelete($user, Article $article): bool
    {
        return ($user->role ?? 'user') === 'admin'
            || ($article->owner_user_id && (string) $article->owner_user_id === (string) $user->id);
    }

    private function isOwner($user, Article $article): bool
    {
        if ($article->owner_user_id) {
            return (string) $article->owner_user_id === (string) $user->id;
        }

        return trim((string) $article->author) === trim((string) $user->name);
    }
}
