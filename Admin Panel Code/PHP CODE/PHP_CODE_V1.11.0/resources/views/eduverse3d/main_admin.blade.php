{{-- Smart EduVerse 3D: Main Admin command centre.
     Included from super_admin_dashboard.blade.php; uses the variables DashboardController passes to that view
     ($super_admin, $settings, $expiring_soon, $recent_schools). Progressive enhancement only. --}}
@php
    $ev3dRoute = function ($name, $params = []) {
        return \Illuminate\Support\Facades\Route::has($name) ? route($name, $params) : null;
    };
    $ev3dUser = Auth::user();
    $ev3dCurrency = $settings['currency_symbol'] ?? '$';
    $ev3dGrowth = (float) ($super_admin['revenue_growth'] ?? 0);
    $ev3dIsSuper = $ev3dUser && $ev3dUser->hasRole('Super Admin');
    $ev3dNodes = [];
    if ($ev3dUser && $ev3dUser->canany(['schools-list', 'schools-create', 'schools-edit', 'schools-delete'])) {
        $ev3dNodes[] = ['id' => 'schools', 'label' => __('schools'), 'value' => (string) ($super_admin['total_school'] ?? 0),
            'hint' => ($super_admin['active_schools'] ?? 0) . ' ' . __('active') . ' · ' . ($super_admin['inactive_schools'] ?? 0) . ' ' . __('inactive') . ' · +' . ($super_admin['new_schools_this_month'] ?? 0) . ' ' . __('this_month'),
            'href' => $ev3dRoute('schools.index'), 'kind' => 'primary'];
        $ev3dNodes[] = ['id' => 'inquiries', 'label' => __('Support inquiries'), 'value' => '',
            'hint' => __('School registration requests'), 'href' => $ev3dRoute('inquiry.index'), 'kind' => 'info'];
    }
    if ($ev3dUser && $ev3dUser->can('subscription-view')) {
        $ev3dNodes[] = ['id' => 'subscriptions', 'label' => __('active_plans'), 'value' => (string) ($super_admin['active_plans_count'] ?? 0),
            'hint' => __('out_of') . ' ' . ($super_admin['total_school'] ?? 0) . ' ' . __('schools'), 'href' => url('subscriptions/report'), 'kind' => 'success'];
        $ev3dNodes[] = ['id' => 'revenue', 'label' => __('monthly_revenue'), 'value' => $ev3dCurrency . number_format((float) ($super_admin['current_month_revenue'] ?? 0)),
            'hint' => ($ev3dGrowth >= 0 ? '+' : '-') . number_format(abs($ev3dGrowth), 2) . '% vs ' . __('last_month'),
            'href' => url('subscriptions/transactions'), 'kind' => $ev3dGrowth >= 0 ? 'success' : 'warning'];
    }
    if ($ev3dUser && $ev3dUser->canany(['package-list', 'package-create', 'package-edit', 'package-delete'])) {
        $ev3dNodes[] = ['id' => 'packages', 'label' => __('package'), 'value' => (string) ($super_admin['active_packages_count'] ?? 0),
            'hint' => __('Active paid packages'), 'href' => $ev3dRoute('package.index'), 'kind' => 'info'];
    }
    if ($ev3dUser && $ev3dUser->canany(['addons-list', 'addons-create', 'addons-edit', 'addons-delete'])) {
        $ev3dNodes[] = ['id' => 'addons', 'label' => __('addons'), 'value' => (string) ($super_admin['total_addons_count'] ?? 0),
            'hint' => __('Active add-ons'), 'href' => $ev3dRoute('addons.index'), 'kind' => 'info'];
    }
    if ($ev3dUser && $ev3dUser->can('custom-school-email')) {
        $ev3dNodes[] = ['id' => 'announce', 'label' => __('Email schools'), 'value' => '',
            'hint' => __('Send an announcement to school admins'), 'href' => $ev3dRoute('schools.send.mail'), 'kind' => 'primary'];
    }
    if ($ev3dUser && $ev3dUser->canany(['staff-list', 'staff-create', 'staff-edit', 'staff-delete'])) {
        $ev3dNodes[] = ['id' => 'staff', 'label' => __('staff'), 'value' => '',
            'hint' => __('Platform staff and roles'), 'href' => $ev3dRoute('staff.index'), 'kind' => 'info'];
    }
    if ($ev3dUser && $ev3dUser->can('system-setting-manage')) {
        $ev3dNodes[] = ['id' => 'settings', 'label' => __('system_settings'), 'value' => '',
            'hint' => __('Payments, subscriptions, integrations'), 'href' => $ev3dRoute('system-settings.index'), 'kind' => 'info'];
    }
    if ($ev3dIsSuper) {
        $ev3dNodes[] = ['id' => 'health', 'label' => __('System health'), 'value' => '',
            'hint' => __('Database, queue and server checks'), 'href' => $ev3dRoute('system-settings.health'), 'kind' => 'warning'];
    }
    // Drop nodes whose route is missing in this installation.
    $ev3dNodes = array_values(array_filter($ev3dNodes, fn ($n) => !empty($n['href'])));

    // Globe markers: real recent + expiring schools. Positions are illustrative (no coordinates stored).
    $ev3dMarkers = [];
    $ev3dSchoolsHref = $ev3dRoute('schools.index');
    foreach ($expiring_soon ?? [] as $ev3dSub) {
        if (!$ev3dSub->school) continue;
        $ev3dMarkers[$ev3dSub->school->id] = ['id' => 's' . $ev3dSub->school->id, 'label' => $ev3dSub->school->name,
            'value' => optional($ev3dSub->package)->name, 'kind' => 'warning', 'weight' => 2, 'href' => $ev3dSchoolsHref,
            'hint' => __('expiring_soon') . ': ' . \Carbon\Carbon::parse($ev3dSub->getRawOriginal('end_date'))->format('Y-m-d')];
    }
    foreach ($recent_schools ?? [] as $ev3dSchool) {
        if (isset($ev3dMarkers[$ev3dSchool->id])) continue;
        $ev3dMarkers[$ev3dSchool->id] = ['id' => 's' . $ev3dSchool->id, 'label' => $ev3dSchool->name, 'value' => '',
            'kind' => 'primary', 'weight' => 1, 'href' => $ev3dSchoolsHref,
            'hint' => __('recent_schools') . ': ' . \Carbon\Carbon::parse($ev3dSchool->getRawOriginal('created_at'))->diffForHumans()];
    }
@endphp
@include('eduverse3d.stage', ['ev3d' => [
    'id' => 'ev3d-main-admin',
    'scene' => 'globe',
    'eyebrow' => __('Command centre'),
    'title' => __('Platform overview'),
    'subtitle' => __('Every school on the platform at a glance. Orbiting modules open the matching admin page.'),
    'panelTitle' => __('Platform modules'),
    'nodes' => $ev3dNodes,
    'markers' => array_values($ev3dMarkers),
    'legend' => [
        ['kind' => 'primary', 'label' => __('Recently registered school')],
        ['kind' => 'warning', 'label' => __('Plan expiring soon')],
    ],
    'note' => __('School markers show the 5 newest schools and the 5 plans closest to expiry. Their position on the globe is illustrative because schools have no stored location. Student, teacher and parent totals are kept in each school\'s own database and are not combined here.'),
]])
