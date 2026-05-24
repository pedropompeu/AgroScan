<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FieldScouting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ScoutingController extends Controller
{
    public function index(Request $request)
    {
        $query = FieldScouting::select('*')
            ->selectRaw('ST_X(location::geometry) as longitude')
            ->selectRaw('ST_Y(location::geometry) as latitude');

        if ($request->has('disease_code')) {
            $query->where('disease_code', $request->disease_code);
        }

        return $query->get();
    }

    public function heatmap(Request $request)
    {
        $precision = $request->get('precision', 0.1);
        
        $results = DB::select("
            SELECT 
                grid_lng as lng,
                grid_lat as lat,
                COUNT(*) as intensity
            FROM (
                SELECT 
                    ST_X(ST_SnapToGrid(location::geometry, ?)) as grid_lng,
                    ST_Y(ST_SnapToGrid(location::geometry, ?)) as grid_lat
                FROM field_scoutings
                WHERE disease_code != 'healthy' OR disease_code IS NULL
            ) as grid
            GROUP BY grid_lng, grid_lat
        ", [$precision, $precision]);

        return response()->json($results);
    }

    public function sync(Request $request)
    {
        $request->validate([
            'data'               => 'required|array|min:1|max:200',
            'data.*.id'          => 'required|string|max:36',
            'data.*.latitude'    => 'required|numeric|between:-90,90',
            'data.*.longitude'   => 'required|numeric|between:-180,180',
            'data.*.imagePath'   => 'nullable|string|max:500',
            'data.*.farm_id'     => 'nullable|uuid|exists:farms,id',
        ]);

        $results = [];

        foreach ($request->input('data') as $item) {
            $lat = (float) $item['latitude'];
            $lng = (float) $item['longitude'];

            $scouting = FieldScouting::updateOrCreate(
                ['id' => $item['id']],
                [
                    'user_id'    => $request->user()->id,
                    'location'   => DB::raw("ST_SetSRID(ST_MakePoint($lng, $lat), 4326)"),
                    'image_path' => $item['imagePath'] ?? null,
                    'farm_id'    => $item['farm_id'] ?? null,
                    'status'     => 'synced',
                ]
            );

            $this->dispatchToAI($scouting);
            $results[] = $scouting;
        }

        return response()->json(['status' => 'success', 'synced_count' => count($results)]);
    }

    private function dispatchToAI(FieldScouting $scouting)
    {
        try {
            $aiServiceUrl = env('AI_ENGINE_URL', 'http://backend-ai:8001');
            Http::post($aiServiceUrl . '/analyze-async', [
                'scouting_id' => $scouting->id,
                'image_path' => $scouting->image_path,
                'callback_url' => 'http://app:8000/api/scoutings/ai-callback'
            ]);
        } catch (\Exception $e) {
            Log::error("Erro ao despachar para IA: " . $e->getMessage());
        }
    }

    public function aiCallback(Request $request)
    {
        $expectedSecret = env('AI_CALLBACK_SECRET', 'agroscan-internal-secret');
        if ($request->header('X-AI-Secret') !== $expectedSecret) {
            return response()->json(['status' => 'unauthorized'], 401);
        }

        $request->validate([
            'scouting_id'      => 'required|uuid',
            'disease_detected'  => 'required|string',
            'disease_code'      => 'required|string',
            'confidence_score'  => 'required|numeric',
        ]);

        $scouting = FieldScouting::find($request->scouting_id);
        if ($scouting) {
            $scouting->update([
                'disease_detected' => $request->disease_detected,
                'disease_code' => $request->disease_code,
                'confidence_score' => $request->confidence_score,
            ]);
            return response()->json(['status' => 'updated']);
        }

        return response()->json(['status' => 'not_found'], 404);
    }
}
