<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeAdmin($request);

        $limit = max(1, min((int) $request->query('per_page', 100), 500));

        return User::orderBy('id', 'desc')
            ->take($limit)
            ->get()
            ->map(fn (User $user) => $this->serialize($user));
    }

    public function updateRole(Request $request, User $user)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'role' => 'required|in:admin,user',
        ]);

        $user->update(['role' => $data['role']]);

        return response()->json($this->serialize($user));
    }

    public function destroy(Request $request, User $user)
    {
        $this->authorizeAdmin($request);
        abort_if((string) $request->user()->id === (string) $user->id, 422, 'You cannot delete your own account.');

        $user->tokens()->delete();
        $user->delete();

        return response()->json(null, 204);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless(($request->user()->role ?? 'user') === 'admin', 403, 'Admin only.');
    }

    private function serialize(User $user): array
    {
        return [
            'id'        => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
            'role'      => $user->role ?? 'user',
            'faculty'   => $user->faculty,
            'major'     => $user->major,
            'position'  => $user->position,
            'phone'     => $user->phone,
            'photo_url' => $user->photo_url,
            'created_at'=> $user->created_at,
        ];
    }
}
