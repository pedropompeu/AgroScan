<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class S3ConfigController extends Controller
{
    public function getPresignedUrl(Request $request)
    {
        $request->validate([
            'filename'     => 'required|string|max:200',
            'content_type' => 'required|string|max:100',
        ]);

        $path = 'scoutings/' . Str::uuid() . '-' . basename($request->input('filename'));

        // S3 real: requer AWS_BUCKET configurado
        if (config('filesystems.disks.s3.bucket')) {
            $expiry = now()->addMinutes(5);

            [$uploadUrl, $s3Headers] = Storage::disk('s3')->temporaryUploadUrl(
                $path,
                $expiry,
                ['ContentType' => $request->input('content_type')]
            );

            return response()->json([
                'upload_url' => $uploadUrl,
                'file_path'  => $path,
                'method'     => 'PUT',
                'headers'    => array_merge($s3Headers, ['Content-Type' => $request->input('content_type')]),
                'expires_at' => $expiry->toISOString(),
            ]);
        }

        // Fallback para desenvolvimento sem S3 configurado
        return response()->json([
            'upload_url' => url('/api/mock-upload'),
            'file_path'  => $path,
            'method'     => 'PUT',
            'headers'    => ['Content-Type' => $request->input('content_type')],
            'dev_mode'   => true,
        ]);
    }
}
