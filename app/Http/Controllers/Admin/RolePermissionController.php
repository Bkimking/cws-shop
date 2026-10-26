<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ToastHelper;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/roles/index', [
            'roles' => Role::withCount('users')->with('permissions:id,name')->get(),
            'permissions' => Permission::all(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        // Creating a genuinely new role (e.g. future "Auditor") — rare, per Doc 04 §4
        $data = $request->validate(['name' => 'required|string|max:100|unique:roles,name']);

        Role::create(['name' => $data['name']]);

        ToastHelper::success('Role created successfully!');

        return redirect()->route('admin.roles.index');
    }

    public function update(Request $request, Role $role)
    {
        if ($role->name === 'Superadmin') {
            ToastHelper::error('Superadmin permissions are managed by the system.');

            return redirect()->route('admin.roles.index');
        }

        // Bulk permission assignment for a role — this is the "checkboxes per role" UI
        $data = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        $role->syncPermissions($data['permissions']);

        ToastHelper::success('Role permissions updated successfully!');

        return redirect()->route('admin.roles.index');
    }

    public function destroy(Role $role)
    {
        if ($role->name === 'Superadmin') {
            ToastHelper::error('Cannot delete the Superadmin role!');

            return redirect()->route('admin.roles.index');
        }

        // Guard rail: warn if role is in use by users
        $userCount = $role->users()->count();
        if ($userCount > 0) {
            ToastHelper::error("Cannot delete role. It is currently assigned to {$userCount} user(s)!");

            return redirect()->route('admin.roles.index');
        }

        $role->delete();

        ToastHelper::success('Role deleted successfully!');

        return redirect()->route('admin.roles.index');
    }
}
