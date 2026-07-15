<?php

namespace App\Http\Controllers;

use App\Models\Researcher;
use Illuminate\Http\Request;

class ResearcherController extends Controller
{
    public function index()
    {
        return Researcher::orderBy('id', 'desc')->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'    => 'required|string|max:255',
            'faculty' => 'required|string|max:255',
        ]);

        $researcher = Researcher::create($request->only([
            'name', 'prefix', 'first_name', 'last_name',
            'work_type', 'faculty', 'program', 'position',
            'address', 'birthday', 'phone', 'email',
            'line_id', 'national_id', 'expertise',
            'education', 'expertise_detail',
        ]));
        return response()->json($researcher, 201);
    }

    public function show(Researcher $researcher)
    {
        return response()->json($researcher);
    }

    public function update(Request $request, Researcher $researcher)
    {
        $researcher->update($request->only([
            'name', 'prefix', 'first_name', 'last_name',
            'work_type', 'faculty', 'program', 'position',
            'address', 'birthday', 'phone', 'email',
            'line_id', 'national_id', 'expertise',
            'education', 'expertise_detail',
        ]));
        return response()->json($researcher);
    }

    public function destroy(Researcher $researcher)
    {
        $researcher->delete();
        return response()->json(null, 204);
    }
}
