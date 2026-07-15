<?php

namespace App\Http\Controllers;

use App\Models\FileUpload;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FileController extends Controller
{
    public function index(Request $request)
    {
        $limit = max(1, min((int) $request->query('per_page', 100), 500));

        return FileUpload::with('owner')
            ->orderBy('id', 'desc')
            ->take($limit)
            ->get()
            ->map(fn (FileUpload $file) => $this->serialize($file, $request->user()));
    }

    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:51200',
        ]);

        $upload = $request->file('file');
        $path = $upload->store('uploads', 'public');

        $file = FileUpload::create([
            'owner_user_id' => $request->user()->id,
            'name'          => $upload->getClientOriginalName(),
            'original_name' => $upload->getClientOriginalName(),
            'mime_type'     => $upload->getClientMimeType() ?: 'application/octet-stream',
            'file_size'     => $upload->getSize() ?: 0,
            'disk'          => 'public',
            'path'          => $path,
        ])->load('owner');

        return response()->json($this->serialize($file, $request->user()), 201);
    }

    public function show(Request $request, FileUpload $file)
    {
        return response()->json($this->serialize($file, $request->user()));
    }

    public function download(Request $request, FileUpload $file)
    {
        abort_unless(Storage::disk($file->disk)->exists($file->path), 404);

        return Storage::disk($file->disk)->download($file->path, $file->original_name ?: $file->name);
    }

    public function destroy(Request $request, FileUpload $file)
    {
        abort_unless($this->canManage($request->user(), $file), 403, 'You can delete only your own files.');

        if (Storage::disk($file->disk)->exists($file->path)) {
            Storage::disk($file->disk)->delete($file->path);
        }

        $file->delete();

        return response()->json(null, 204);
    }

    private function canManage($user, FileUpload $file): bool
    {
        return ($user->role ?? 'user') === 'admin'
            || (string) $file->owner_user_id === (string) $user->id;
    }

    private function serialize(FileUpload $file, $user = null): array
    {
        $url = Storage::disk($file->disk)->url($file->path);

        return [
            'id'            => $file->id,
            'owner_user_id' => $file->owner_user_id,
            'is_owner'      => $user ? $this->canManage($user, $file) : false,
            'owner_name'    => $file->owner?->name ?? '',
            'owner'         => $file->owner ? [
                'id'    => $file->owner->id,
                'name'  => $file->owner->name,
                'email' => $file->owner->email,
            ] : null,
            'name'          => $file->name,
            'original_name' => $file->original_name,
            'mime'          => $file->mime_type,
            'mime_type'     => $file->mime_type,
            'size'          => $file->file_size,
            'file_size'     => $file->file_size,
            'date'          => optional($file->created_at)->toDateString(),
            'uri'           => $url,
            'url'           => $url,
            'download_url'  => url('/api/files/' . $file->id . '/download'),
            'created_at'    => $file->created_at,
            'updated_at'    => $file->updated_at,
        ];
    }
}
