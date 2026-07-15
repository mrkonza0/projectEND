<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'id'       => $user->id,
            'name'     => $user->name,
            'email'    => $user->email,
            'faculty'  => $user->faculty,
            'major'    => $user->major,
            'position' => $user->position,
            'phone'    => $user->phone,
            'role'     => $user->role ?? 'user',
            'photo_url'=> $user->photo_url,
            'avatar'   => $user->photo_url,
            'avatar_url'=> $user->photo_url,
            'created_at'=> $user->created_at,
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'faculty' => 'nullable|string|max:255',
            'major' => 'nullable|string|max:255',
            'position' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
        ]);
        $user->update($request->only(['name', 'email', 'faculty', 'major', 'position', 'phone']));
        return response()->json([
            'id'       => $user->id,
            'name'     => $user->name,
            'email'    => $user->email,
            'faculty'  => $user->faculty,
            'major'    => $user->major,
            'position' => $user->position,
            'phone'    => $user->phone,
            'role'     => $user->role ?? 'user',
            'photo_url'=> $user->photo_url,
            'avatar'   => $user->photo_url,
            'avatar_url'=> $user->photo_url,
            'created_at'=> $user->created_at,
        ]);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|min:6|confirmed',
        ]);

        abort_unless(Hash::check($request->current_password, $request->user()->password), 422, 'Current password is incorrect.');

        $request->user()->update(['password' => Hash::make($request->password)]);
        return response()->json(['success' => true]);
    }

    public function uploadPhoto(Request $request)
    {
        $request->validate([
            'photo' => 'required|image|max:5120',
        ]);

        $user = $request->user();

        if ($user->photo_url) {
            $oldPath = str_replace('/storage/', '', parse_url($user->photo_url, PHP_URL_PATH) ?: '');
            if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $path = $request->file('photo')->store('profile-photos', 'public');
        $url = Storage::disk('public')->url($path);

        $user->update(['photo_url' => $url]);

        return response()->json([
            'photo_url' => $url,
            'avatar_url'=> $url,
            'url'       => $url,
        ]);
    }

    public function deletePhoto(Request $request)
    {
        $user = $request->user();

        if ($user->photo_url) {
            $oldPath = str_replace('/storage/', '', parse_url($user->photo_url, PHP_URL_PATH) ?: '');
            if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $user->update(['photo_url' => null]);

        return response()->json(['success' => true]);
    }
}
