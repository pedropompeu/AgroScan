<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Farm;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FarmController extends Controller
{
    public function index(Request $request)
    {
        $farms = Farm::where('user_id', $request->user()->id)
            ->withCount('scoutings')
            ->get(['id', 'name', 'created_at', 'updated_at']);

        return response()->json($farms);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'                       => 'required|string|max:200',
            'boundary'                   => 'nullable|array',
            'boundary.type'              => 'required_with:boundary|string|in:Polygon',
            'boundary.coordinates'       => 'required_with:boundary|array',
        ]);

        $farm = Farm::create([
            'id'      => Str::uuid(),
            'name'    => $request->input('name'),
            'user_id' => $request->user()->id,
        ]);

        if ($request->has('boundary')) {
            $this->updateBoundary($farm->id, $request->input('boundary'));
        }

        return response()->json($farm->fresh(), 201);
    }

    public function show(Request $request, string $id)
    {
        $farm = Farm::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->withCount('scoutings')
            ->firstOrFail();

        $diseaseStats = DB::select(
            'SELECT disease_code, COUNT(*) as total FROM field_scoutings WHERE farm_id = ? GROUP BY disease_code',
            [$id]
        );

        return response()->json([
            'farm'         => $farm,
            'disease_stats' => $diseaseStats,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $request->validate([
            'name'                 => 'sometimes|string|max:200',
            'boundary'             => 'nullable|array',
            'boundary.type'        => 'required_with:boundary|string|in:Polygon',
            'boundary.coordinates' => 'required_with:boundary|array',
        ]);

        $farm = Farm::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($request->has('name')) {
            $farm->update(['name' => $request->input('name')]);
        }

        if ($request->has('boundary')) {
            $boundary = $request->input('boundary');
            if ($boundary === null) {
                DB::statement('UPDATE farms SET boundary = NULL WHERE id = ?', [$id]);
            } else {
                $this->updateBoundary($id, $boundary);
            }
        }

        return response()->json($farm->fresh());
    }

    public function destroy(Request $request, string $id)
    {
        $farm = Farm::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $farm->delete();

        return response()->json(['status' => 'deleted']);
    }

    // GeoJSON Polygon → PostGIS geography via binding (sem risco de injection)
    private function updateBoundary(string $farmId, array $geoJson): void
    {
        DB::statement(
            'UPDATE farms SET boundary = ST_SetSRID(ST_GeomFromGeoJSON(?), 4326) WHERE id = ?',
            [json_encode($geoJson), $farmId]
        );
    }
}
