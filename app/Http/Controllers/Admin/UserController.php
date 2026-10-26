<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ToastHelper;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Region;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $query = User::with([
            'roles.permissions:id,name',
            'branch:id,name',
            'region:id,name',
        ]);

        $scopedRegionId = $request->attributes->get('scoped_region_id');
        if ($scopedRegionId) {
            $query->where(function ($q) use ($scopedRegionId) {
                $q->where('region_id', $scopedRegionId)
                    ->orWhereHas('branch', fn ($branchQuery) => $branchQuery->where('region_id', $scopedRegionId));
            });
        }

        $scopedBranchId = $request->attributes->get('scoped_branch_id');
        if ($scopedBranchId) {
            $query->where('branch_id', $scopedBranchId);
        }

        if (! $request->user()->hasRole('Superadmin')) {
            $query->whereDoesntHave('roles', fn ($roleQuery) => $roleQuery->whereIn('name', ['Superadmin', 'Region Admin']));
        }

        return Inertia::render('admin/users/index', [
            'users' => $query->latest()->paginate(20),
            'roles' => $this->assignableRoles($request),
            'branches' => $this->visibleBranches($request),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', User::class);

        return Inertia::render('admin/users/add', [
            'roles' => $this->assignableRoles($request),
            'branches' => $this->visibleBranches($request, ['id', 'name', 'region_id']),
            'regions' => $this->visibleRegions($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', User::class);

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|exists:roles,name',
            'branch_id' => 'nullable|exists:branches,id',
            'region_id' => 'nullable|exists:regions,id',
        ]);

        $branchId = isset($data['branch_id']) ? (int) $data['branch_id'] : null;
        $regionId = isset($data['region_id']) ? (int) $data['region_id'] : null;

        $this->assertRoleAssignable($request->user(), $data['role']);
        $this->assertScopeAssignable($request->user(), $branchId, $regionId);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'branch_id' => $branchId,
            'region_id' => $regionId,
            'is_active' => true,
        ]);

        // email_verified_at is intentionally not mass assignable; admin-created
        // staff still need to be able to sign in without an inbox.
        $user->forceFill(['email_verified_at' => now()])->save();

        $user->assignRole($data['role']);

        ToastHelper::success('User created.');

        return redirect()->route('admin.users.index');
    }

    public function edit(Request $request, User $user): Response
    {
        $this->authorize('update', $user);

        return Inertia::render('admin/users/edit', [
            'user' => $user->load('roles:id,name'),
            'roles' => $this->assignableRoles($request),
            'branches' => $this->visibleBranches($request, ['id', 'name', 'region_id']),
            'regions' => $this->visibleRegions($request),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $this->authorize('update', $user);

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email,'.$user->id,
            'role' => 'required|exists:roles,name',
            'branch_id' => 'nullable|exists:branches,id',
            'region_id' => 'nullable|exists:regions,id',
        ]);

        $branchId = isset($data['branch_id']) ? (int) $data['branch_id'] : null;
        $regionId = isset($data['region_id']) ? (int) $data['region_id'] : null;

        $this->assertRoleAssignable($request->user(), $data['role']);
        $this->assertScopeAssignable($request->user(), $branchId, $regionId);
        $this->assertSuperadminCanBeDemoted($request->user(), $user, $data['role']);

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'branch_id' => $branchId,
            'region_id' => $regionId,
        ]);

        $user->syncRoles([$data['role']]); // one role per user, per your role set

        ToastHelper::success('User updated.');

        return redirect()->route('admin.users.index');
    }

    /**
     * @return Collection<int, Role>
     */
    private function assignableRoles(Request $request)
    {
        $roles = Role::query()->orderBy('name');

        if (! $request->user()->hasRole('Superadmin')) {
            $roles->whereNotIn('name', ['Superadmin', 'Region Admin']);
        }

        return $roles->get(['id', 'name']);
    }

    /**
     * @param  array<int, string>  $columns
     * @return Collection<int, Branch>
     */
    private function visibleBranches(Request $request, array $columns = ['id', 'name'])
    {
        $scopedBranchId = $request->attributes->get('scoped_branch_id');
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        return Branch::query()
            ->where('is_active', true)
            ->when($scopedBranchId, fn ($query, $branchId) => $query->where('id', $branchId))
            ->when(! $scopedBranchId && $scopedRegionId, fn ($query, $regionId) => $query->where('region_id', $regionId))
            ->orderBy('name')
            ->get($columns);
    }

    /**
     * @return Collection<int, Region>
     */
    private function visibleRegions(Request $request)
    {
        $scopedRegionId = $request->attributes->get('scoped_region_id');

        return Region::query()
            ->where('is_active', true)
            ->when($scopedRegionId, fn ($query, $regionId) => $query->where('id', $regionId))
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    private function assertRoleAssignable(User $actor, string $role): void
    {
        if ($actor->hasRole('Superadmin')) {
            return;
        }

        if (in_array($role, ['Superadmin', 'Region Admin'], true)) {
            throw ValidationException::withMessages([
                'role' => 'Only a Superadmin can assign this role.',
            ]);
        }
    }

    private function assertScopeAssignable(User $actor, ?int $branchId, ?int $regionId): void
    {
        if ($actor->hasRole('Superadmin')) {
            return;
        }

        if ($actor->branch_id === null || $branchId !== $actor->branch_id) {
            throw ValidationException::withMessages([
                'branch_id' => 'You can only assign users to your own branch.',
            ]);
        }

        if ($regionId !== null && $regionId !== $actor->effectiveRegionId()) {
            throw ValidationException::withMessages([
                'region_id' => 'You can only assign users to your own region.',
            ]);
        }
    }

    private function assertSuperadminCanBeDemoted(User $actor, User $target, string $role): void
    {
        if (! $target->hasRole('Superadmin') || $role === 'Superadmin') {
            return;
        }

        if ($target->id === $actor->id) {
            throw ValidationException::withMessages([
                'role' => 'You cannot change your own Superadmin role.',
            ]);
        }

        $activeSuperadmins = User::role('Superadmin')->where('is_active', true)->count();

        if ($activeSuperadmins <= 1) {
            throw ValidationException::withMessages([
                'role' => 'You cannot demote the last active Superadmin.',
            ]);
        }
    }

    public function destroy(User $user): RedirectResponse
    {
        $this->authorize('delete', $user);

        // Guard rail: prevent self-deactivation
        if ($user->id === auth()->id()) {
            ToastHelper::error('You cannot deactivate your own account.');

            return back();
        }

        // Guard rail: prevent deactivating the last superadmin
        if ($user->hasRole('Superadmin')) {
            $superadminCount = User::role('Superadmin')->where('is_active', true)->count();
            if ($superadminCount <= 1) {
                ToastHelper::error('Cannot deactivate the last active superadmin.');

                return back();
            }
        }

        // deactivate, don't delete — preserves order/audit history tied to this user
        $user->update(['is_active' => false]);

        ToastHelper::success('User deactivated.');

        return back();
    }

    public function reactivate(User $user): RedirectResponse
    {
        $this->authorize('delete', $user);

        $user->update(['is_active' => true]);

        ToastHelper::success('User reactivated.');

        return back();
    }
}
