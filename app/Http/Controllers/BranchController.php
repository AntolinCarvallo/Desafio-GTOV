<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Branch;

class BranchController extends Controller
{
    public function index()
    {
        $sucursales = Branch::all();
        return view('welcome', compact('sucursales'));
    }

    public function guardarSucursales(Request $request)
        {
            try {
                $sucursales = $request->input('sucursales');

                if (empty($sucursales)) {
                    return response()->json(['mensaje' => 'No se recibieron datos.'], 400);
                }

                // Generar hash único del contenido completo
                $contenido = json_encode($sucursales);
                $hash = hash('sha256', $contenido);

                // Verificar si ya fue importado
                $yaExiste = DB::table('importaciones_kml')->where('hash', $hash)->exists();
                if ($yaExiste) {
                    return response()->json([
                        'mensaje' => 'Este archivo ya fue importado anteriormente.',
                        'yaImportado' => true
                    ]);
                }

                // Guardar en la tabla 'branches'
                foreach ($sucursales as $sucursal) {
                    DB::table('branches')->insert([
                        'sucursal' => $sucursal['sucursal'],
                        'descripcion' => $sucursal['descripcion'],
                        'raw_coordinates' => json_encode($sucursal['raw_coordinates']),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                // Guardar el hash para control de duplicados
                DB::table('importaciones_kml')->insert([
                    'hash' => $hash,
                    'created_at' => now()
                ]);

                return response()->json(['mensaje' => 'Datos guardados correctamente.']);
            } catch (\Exception $e) {
                //\Log::error("Error al guardar sucursales: " . $e->getMessage());
                return response()->json(['mensaje' => 'Error interno del servidor.'], 500);
            }
        }
}
