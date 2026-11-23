{{-- Smart EduVerse 3D: School Admin campus.
     Included from school_admin_dashboard.blade.php; uses the variables DashboardController passes to that view.
     Buildings are filtered by App\Services\EduVerse3D\SchoolCampusBuilder (role, permission, plan feature, route).
     Progressive enhancement only: the HTML module list works without WebGL or JavaScript. --}}
@php
    $ev3dUser = Auth::user();
    $ev3dNodes = [];
    $ev3dSchoolName = '';
    $ev3dSessionName = '';
    if (\App\Services\EduVerse3D\SchoolCampusBuilder::isEligible($ev3dUser)) {
        $ev3dSchoolId = (int) $ev3dUser->school_id;
        $ev3dSchoolName = optional($ev3dUser->school)->name ?? '';
        $ev3dSessionYear = null;
        try {
            $ev3dSessionYear = app(\App\Services\CachingService::class)->getDefaultSessionYear();
        } catch (\Throwable $e) {
            $ev3dSessionYear = null;
        }
        $ev3dSessionName = $ev3dSessionYear->name ?? '';

        // Today's attendance for this school only. Queried only when the plan and role allow
        // attendance; school_id is filtered explicitly in addition to the per-school database.
        $ev3dAttendance = null;
        if ($ev3dSessionYear && \App\Services\FeaturesService::hasFeature('Attendance Management')
            && $ev3dUser->canany(['class-teacher', 'attendance-list'])) {
            try {
                $ev3dTypes = \App\Models\Attendance::query()
                    ->where('school_id', $ev3dSchoolId)
                    ->where('session_year_id', $ev3dSessionYear->id)
                    ->whereDate('date', \Carbon\Carbon::today()->format('Y-m-d'))
                    ->selectRaw('type, COUNT(*) as total')
                    ->groupBy('type')
                    ->pluck('total', 'type');
                $ev3dPresent = (int) ($ev3dTypes[1] ?? 0);
                $ev3dAbsent = (int) ($ev3dTypes[0] ?? 0) + (int) ($ev3dTypes[2] ?? 0);
                $ev3dAttendance = ['present' => $ev3dPresent, 'absent' => $ev3dAbsent, 'marked' => $ev3dPresent + $ev3dAbsent];
            } catch (\Throwable $e) {
                report($e);
                $ev3dAttendance = null;
            }
        }

        $ev3dLatest = '';
        if (isset($announcement) && is_iterable($announcement)) {
            foreach ($announcement as $ev3dItem) {
                $ev3dLatest = (string) ($ev3dItem->title ?? '');
                break;
            }
        }

        $ev3dBuilder = new \App\Services\EduVerse3D\SchoolCampusBuilder(
            $ev3dUser,
            fn (string $feature) => \App\Services\FeaturesService::hasFeature($feature),
            fn (string $name) => \Illuminate\Support\Facades\Route::has($name) ? route($name) : null,
            fn (string $key) => __($key)
        );
        $ev3dNodes = $ev3dBuilder->nodes([
            'subscription_name' => (isset($subscription) && $subscription) ? optional($subscription->package)->name : null,
            'license_days_left' => (isset($subscription) && $subscription) ? ($license_expire ?? null) : null,
            'teachers' => $teacher ?? null,
            'students' => $student ?? null,
            'guardians' => $parent ?? null,
            'classes' => $classes_counter ?? null,
            'streams' => $streams ?? null,
            'exams' => isset($exams) && is_countable($exams) ? count($exams) : null,
            'fees' => !empty($fees_detail) && is_array($fees_detail) ? $fees_detail : null,
            'attendance' => $ev3dAttendance,
            'latest_announcement' => $ev3dLatest,
        ]);
    }
@endphp
@if (\App\Services\EduVerse3D\SchoolCampusBuilder::isEligible($ev3dUser))
    @include('eduverse3d.stage', ['ev3d' => [
        'id' => 'ev3d-school-campus',
        'scene' => 'campus',
        'eyebrow' => __('School campus'),
        'title' => $ev3dSchoolName !== '' ? $ev3dSchoolName : __('Your school'),
        'subtitle' => __('Each building opens the matching module. Only modules your role and plan allow are shown.'),
        'panelTitle' => __('Campus buildings'),
        'nodes' => $ev3dNodes,
        'extra' => [
            'centerLabel' => $ev3dSchoolName !== '' ? $ev3dSchoolName : __('Your school'),
            'centerSub' => $ev3dSessionName,
        ],
        'legend' => [
            ['kind' => 'success', 'label' => __('On track')],
            ['kind' => 'warning', 'label' => __('Needs attention (absences or unpaid fees)')],
        ],
        'note' => __('Figures come from this school\'s own records for the current session. Building height follows the number shown; buildings without a number use the base height. Attendance counts only the records marked today.'),
    ]])
@endif
