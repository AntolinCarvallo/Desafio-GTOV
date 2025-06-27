<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BranchController;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/guardar-sucursales', [BranchController::class, 'guardarSucursales'])->name('guardar.sucursales');

Route::get('/', [BranchController::class, 'index']);
