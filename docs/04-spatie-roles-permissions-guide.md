# Spatie Roles & Permissions — Working Playbook (POS Project)

Companion to [03-technical-blueprint.md](./03-technical-blueprint.md). This is the doc to check *before* touching roles/permissions code — it's written to stop the mistakes you keep repeating, not to re-explain the package.

## 1. The one rule that fixes 90% of the mistakes

> **The app checks permissions. It (almost) never checks roles.**

- Controllers, policies, middleware, Inertia page guards → check **permission names**.
- Roles exist only so a human (superadmin) can assign a bundle of permissions to a user in one click.
- If you ever write `$user->hasRole('Cashier')` inside application logic to decide *what they can do*, stop — that's a permission check wearing a role's name. Ask "what specific action am I gating?" and check that permission instead.

Roles are a **UI/assignment convenience**, not an authorization mechanism. Treat permission names as the stable, developer-owned contract. Role names can be renamed/restructured later without breaking anything, *because nothing in the codebase checks them directly.*

## 2. Naming convention (lock this in now, don't improvise per-feature)

Pattern: `<action> <resource>`, lowercase, plural resource where it makes sense.

```
view products
create products
edit products
delete products

view orders
edit orders
refund orders

view stock
adjust stock
transfer stock

view branch reports
view region reports        # superadmin/region-admin only, scoped by region_id in the policy, not the permission name
manage payment gateways
manage regions
manage branches
manage users
```

Rules:
- Never bake a role name into a permission name (`edit products as admin` — wrong). Scoping (own vs all, own branch vs all branches) belongs in the **policy logic**, not the permission string. See §5.
- Keep the list flat and boring. If you're tempted to make a permission that only ever gets assigned to one role, that's fine — it's still a permission, not a role check.

## 3. Your role set (fixed, per the product spec)

| Role | Gets which permission clusters |
|---|---|
| **Superadmin** | Everything. Also the only role that can create/edit roles and permissions themselves (see §4). |
| **Region Admin** | `view region reports`, `manage branches` (within their region), `manage payment gateways` (within their region) |
| **Branch/Store Admin** | `view branch reports`, `manage users` (branch-scoped: cashiers/inventory managers under them), product + stock permissions for their branch |
| **Cashier** | `view products`, `create orders`, `view own till session`, `close till` |
| **Inventory Manager** | `view stock`, `adjust stock`, `transfer stock`, `view products`, `edit products` |
| **Customer (storefront)** | Not a Spatie role in the admin sense — this is your `customers` table, separate guard. Don't mix it into the same role/permission set as staff. Keep storefront auth on its own guard (`web` vs a `customer` guard) so a customer account can never accidentally inherit staff permissions. |

**Region/branch scoping is not a permission concern.** `edit products` is the same permission everywhere — whether a Branch Admin can edit *this specific* product is decided in the **Policy** by comparing `$product->branch_id` (or region) to `$user->branch_id`. Don't create `edit products in own branch` as a separate permission — that's the naming mistake from §2.

## 4. Who creates roles/permissions — your seeding + runtime split

You said: **Superadmin creates all roles and permissions.** Split this into two layers so you don't fight the package:

**Layer 1 — Seeder (developer-owned, source of truth for permission *names*)**
Permissions are code, not admin-UI data. Define the full permission list in a seeder that runs on every deploy:

```php
// database/seeders/PermissionSeeder.php
$permissions = [
    'view products', 'create products', 'edit products', 'delete products',
    'view orders', 'edit orders', 'refund orders',
    'view stock', 'adjust stock', 'transfer stock',
    'view branch reports', 'view region reports',
    'manage payment gateways', 'manage regions', 'manage branches', 'manage users',
];

foreach ($permissions as $permission) {
    Permission::findOrCreate($permission);
}

$roles = ['Superadmin', 'Region Admin', 'Branch Admin', 'Cashier', 'Inventory Manager'];
foreach ($roles as $role) {
    Role::findOrCreate($role);
}
```
Use `findOrCreate`, never bare `create` on every seeder run — `create` will throw on the unique constraint the second time it runs. This is one of the most common Spatie mistakes.

**Layer 2 — Superadmin UI (runtime, assignment only)**
The superadmin screen you build should let Superadmin:
- Assign/revoke permissions to/from a role (`$role->syncPermissions([...])`)
- Assign/revoke roles to/from a user (`$user->syncRoles([...])`)
- Optionally create *new* roles at runtime if the business genuinely needs a new bundle later (e.g. "Auditor")

**Do not** let the superadmin UI create brand-new permission *names* on the fly. New permissions = new capability the code doesn't check for yet, so they're meaningless until a developer wires a `can()` check to them. Keep permission creation in the seeder/codebase; keep role creation and role↔permission↔user assignment in the UI.

## 5. Policies — where the actual access decision lives

One policy per model (`ProductPolicy`, `OrderPolicy`, `StockPolicy`, etc.). Policy methods check **permissions**, and add whatever scoping logic the business needs:

```php
class ProductPolicy
{
    public function update(User $user, Product $product): bool
    {
        if (!$user->can('edit products')) {
            return false;
        }

        // Superadmin/Region Admin bypass branch scoping
        if ($user->hasRole(['Superadmin', 'Region Admin'])) {
            return true;
        }

        // Branch Admin / Inventory Manager: only their own branch's products
        return $user->branch_id === $product->branch_id;
    }
}
```

Note the one acceptable place to check a role name directly: **superadmin/region-level bypass logic inside a policy**, where you're deliberately saying "this role skips scoping." That's a business rule about hierarchy, not an authorization shortcut — it's fine here. Everywhere else, default to permission checks.

Then in controllers/Inertia responses:
```php
$this->authorize('update', $product);
```
Never re-implement the branch-scoping `if` statement inline in a controller. If you find yourself copy-pasting a scoping check across controllers, it belongs in the policy (or a query scope), not duplicated.

## 6. Direct permissions — avoid them

Don't call `$user->givePermissionTo(...)` directly on a user in this project. Every permission a user has should trace back to a role. If a cashier needs one extra ability, that's a sign you need a new role or to adjust the Cashier role's permission set — not a one-off direct grant that becomes invisible in the "who can do what" picture six months from now.

If you ever do need to audit whether something slipped in as a direct permission:
```php
$user->getDirectPermissions(); // should be empty in this project, always
```

## 7. Caching — the mistake that causes "I added a permission and nothing changed"

Spatie caches permissions/roles. If you ever manipulate `Role`/`Permission` rows directly in the DB (tinker, manual query, a data-fix script) instead of through the package's methods, the cache goes stale and behavior won't update until you clear it:

```php
app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
```
Or via artisan: `php artisan permission:cache-reset`.

Rule of thumb: if you used `syncPermissions`, `assignRole`, `givePermissionTo` etc. through the package, cache invalidation is automatic. If you touched the pivot tables directly, clear the cache yourself.

## 8. Performance notes (only matters once branches/users scale up)

- Assigning a lot of permissions to a role in bulk: prefer `$role->syncPermissions([...])` in one call over looping `givePermissionTo` one at a time.
- If you're frequently creating/deleting permissions programmatically (you shouldn't be, per §4 — but if a migration needs to), `Permission::make([...])->saveOrFail()` is faster than `Permission::create([...])` at scale because it skips some of the package's duplicate-checking overhead. Not needed for your seeder-driven approach at current scale — note it for later if the permission list ever needs bulk scripted changes.

## 9. Where Activity Log fits in (you've got this, just the boundary)

Since you already use `spatie/laravel-activitylog`: log **role/permission changes** as activity (who assigned what role to whom, who changed a role's permission set) — this is an audit trail concern, separate from the authorization mechanism itself. Don't conflate the two packages' jobs: permissions decide *can they*, activity log records *what happened*. A superadmin action like `syncRoles()` on a user is exactly the kind of event worth an activity log entry given this is a multi-branch system with real money moving through it.

## 10. Pre-flight checklist (read this before writing any roles/permissions code)

- [ ] Am I checking a **permission**, not a role, in this controller/policy/view?
- [ ] Does this permission name already exist in the seeder list? If not, add it there — not in the admin UI.
- [ ] Is branch/region scoping handled in the **policy**, not baked into the permission name?
- [ ] Did I use `findOrCreate` in the seeder, not `create`?
- [ ] Am I about to give a user a **direct** permission? If yes — stop, fix the role instead.
- [ ] Did I touch `role_has_permissions` / `model_has_roles` tables directly? If yes — clear the permission cache.
- [ ] Is this a role/permission change that should also fire an activity log entry?

[← Technical Blueprint](./03-technical-blueprint.md) | [Index](./00-index.md)
