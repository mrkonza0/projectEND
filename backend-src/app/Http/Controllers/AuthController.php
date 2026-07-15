<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'faculty'  => $request->faculty,
            'major'    => $request->major,
            'position' => $request->position,
            'phone'    => $request->phone,
            'role'     => 'user',
        ]);

        $token = $user->createToken('app-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $this->formatUser($user),
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'], 401);
        }

        $token = $user->createToken('app-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $this->formatUser($user),
        ]);
    }

    public function user(Request $request)
    {
        return response()->json($this->formatUser($request->user()));
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    private function formatUser(User $user): array
    {
        return [
            'id'       => $user->id,
            'name'     => $user->name,
            'email'    => $user->email,
            'faculty'  => $user->faculty,
            'major'    => $user->major,
            'position' => $user->position,
            'phone'    => $user->phone,
            'role'     => $user->role ?? 'user',
            'photo_url'=> $user->photo_url,
        ];
    }
}
