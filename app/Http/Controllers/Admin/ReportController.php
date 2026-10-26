<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        if (! $request->user()->can('view reports')) {
            abort(403);
        }

        return Inertia::render('admin/reports/index');
    }
}
