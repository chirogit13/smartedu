<?php

namespace App\Services\EduVerse3D;

use Closure;

/**
 * Builds the module list for the School Admin 3D campus.
 *
 * Every building is added only when the logged-in user holds the permission
 * the target controller checks, the school's plan includes the
 * module's feature, and the target route exists. The controllers behind
 * each link still enforce their own feature and permission checks; this
 * class only decides what to show.
 *
 * Values come only from the $data array, which the dashboard fills from the
 * logged-in school's own records. A missing value is shown as empty and is
 * never invented.
 */
final class SchoolCampusBuilder
{
    private object $user;
    private Closure $hasFeature;
    private Closure $route;
    private Closure $translate;

    /**
     * @param object  $user       user with can(string): bool, hasRole(string): bool and a school_id property
     * @param Closure $hasFeature fn (string $feature): bool
     * @param Closure $route      fn (string $name): ?string, null when the route does not exist
     * @param Closure $translate  fn (string $key): string
     */
    public function __construct(object $user, Closure $hasFeature, Closure $route, Closure $translate)
    {
        $this->user = $user;
        $this->hasFeature = $hasFeature;
        $this->route = $route;
        $this->translate = $translate;
    }

    /**
     * Only School Admins who belong to a school get the campus. Super Admins,
     * users without a school and other school roles do not.
     */
    public static function isEligible(?object $user): bool
    {
        if ($user === null || empty($user->school_id)) {
            return false;
        }

        return $user->hasRole('School Admin') && !$user->hasRole('Super Admin');
    }

    /**
     * @param array $data keys (all optional): subscription_name, license_days_left,
     *                    teachers, students, guardians, classes, streams, exams,
     *                    fees ['fullPaidFees','partialPaidFees','unPaidFees'],
     *                    attendance ['present','absent','marked'] or null,
     *                    latest_announcement
     * @return array<int, array<string, mixed>>
     */
    public function nodes(array $data): array
    {
        if (!self::isEligible($this->user)) {
            return [];
        }

        $nodes = [];

        if ($this->can('school-setting-manage')) {
            $hint = '';
            if (!empty($data['subscription_name'])) {
                $hint = (string) $data['subscription_name'];
                if (isset($data['license_days_left'])) {
                    $hint .= ' · ' . (int) $data['license_days_left'] . ' ' . $this->t('days left');
                }
            }
            $nodes[] = $this->node('main', $this->t('Main building'), '', $hint ?: $this->t('School settings'),
                $this->firstRoute(['school-settings.index']), 'primary', 0);
        }

        if ($this->can('class-list')) {
            $classes = $this->int($data, 'classes');
            $streams = $this->int($data, 'streams');
            $nodes[] = $this->node('classes', $this->t('Classes & academics'), $this->str($classes),
                $streams === null ? '' : $streams . ' ' . $this->t('streams'),
                $this->firstRoute(['class.index']), 'info', $classes);
        }

        if ($this->can('student-list')) {
            $students = $this->int($data, 'students');
            $guardians = $this->int($data, 'guardians');
            $nodes[] = $this->node('students', $this->t('Students'), $this->str($students),
                $guardians === null ? '' : $guardians . ' ' . $this->t('guardians'),
                $this->firstRoute(['students.index']), 'primary', $students);
        }

        if ($this->can('teacher-list')) {
            $teachers = $this->int($data, 'teachers');
            $nodes[] = $this->node('teachers', $this->t('Teachers'), $this->str($teachers), $this->t('Manage teachers'),
                $this->firstRoute(['teachers.index']), 'info', $teachers);
        }

        if ($this->feature('Attendance Management') && $this->canAny(['class-teacher', 'attendance-list'])) {
            $att = isset($data['attendance']) && is_array($data['attendance']) ? $data['attendance'] : null;
            $value = '';
            $hint = $this->t('No attendance marked today');
            $metric = 0;
            if ($att !== null && (int) ($att['marked'] ?? 0) > 0) {
                $present = (int) ($att['present'] ?? 0);
                $absent = (int) ($att['absent'] ?? 0);
                $metric = (int) $att['marked'];
                $value = $present . ' / ' . $metric;
                $hint = $this->t('Today') . ': ' . $present . ' ' . $this->t('present') . ' · ' . $absent . ' ' . $this->t('absent or on leave');
            } elseif ($att === null) {
                $hint = $this->t('View attendance');
            }
            $nodes[] = $this->node('attendance', $this->t('Attendance'), $value, $hint,
                $this->firstRoute(['attendance.view']), $att === null ? 'info' : ((int) ($att['absent'] ?? 0) > 0 ? 'warning' : 'success'), $metric);
        }

        if ($this->feature('Exam Management') && $this->canAny(['exam-result', 'exam-create'])) {
            $exams = $this->int($data, 'exams');
            $routes = [];
            if ($this->can('exam-result')) {
                $routes[] = 'exams.get-result';
            }
            if ($this->can('exam-create')) {
                $routes[] = 'exams.index';
            }
            $nodes[] = $this->node('exams', $this->t('Exams & results'), $this->str($exams),
                $exams === null ? '' : $this->t('Exams set up'),
                $this->firstRoute($routes), 'info', $exams);
        }

        $assignmentRoute = null;
        if ($this->feature('Assignment Management') && $this->can('assignment-list')) {
            $assignmentRoute = $this->firstRoute(['assignment.index']);
        }
        if ($assignmentRoute === null && $this->feature('Lesson Management') && $this->can('lesson-list')) {
            $assignmentRoute = $this->firstRoute(['lesson.index']);
        }
        if ($assignmentRoute !== null) {
            $nodes[] = $this->node('assignments', $this->t('Assignments & lessons'), '', $this->t('Homework and lesson plans'),
                $assignmentRoute, 'info', 0);
        }

        if ($this->feature('Fees Management') && $this->canAny(['fees-paid', 'fees-list'])) {
            $fees = isset($data['fees']) && is_array($data['fees']) ? $data['fees'] : null;
            $value = '';
            $hint = $this->t('Fees');
            $metric = 0;
            $unpaid = 0;
            if ($fees !== null) {
                $full = (int) ($fees['fullPaidFees'] ?? 0);
                $partial = (int) ($fees['partialPaidFees'] ?? 0);
                $unpaid = (int) ($fees['unPaidFees'] ?? 0);
                $metric = $full + $partial + $unpaid;
                $value = (string) $full;
                $hint = $full . ' ' . $this->t('fully paid') . ' · ' . $partial . ' ' . $this->t('partial') . ' · ' . $unpaid . ' ' . $this->t('unpaid');
            }
            $routes = [];
            if ($this->can('fees-paid')) {
                $routes[] = 'fees.paid.index';
            }
            if ($this->can('fees-list')) {
                $routes[] = 'fees.index';
            }
            $nodes[] = $this->node('fees', $this->t('Fees & finance'), $value, $hint,
                $this->firstRoute($routes), $fees === null ? 'info' : ($unpaid > 0 ? 'warning' : 'success'), $metric);
        }

        if ($this->feature('Transportation Module') && $this->canAny(['vehicles-list', 'route-list'])) {
            $routes = [];
            if ($this->can('vehicles-list')) {
                $routes[] = 'vehicles.index';
            }
            if ($this->can('route-list')) {
                $routes[] = 'routes.index';
            }
            $nodes[] = $this->node('transport', $this->t('Transport'), '', $this->t('Vehicles and routes'),
                $this->firstRoute($routes), 'info', 0);
        }

        if ($this->canAny(['reports-student', 'reports-exam'])) {
            $routes = [];
            if ($this->can('reports-student')) {
                $routes[] = 'reports.student.student-reports';
            }
            if ($this->can('reports-exam')) {
                $routes[] = 'reports.exam.exam-reports';
            }
            $nodes[] = $this->node('reports', $this->t('Reports'), '', $this->t('Student and exam reports'),
                $this->firstRoute($routes), 'info', 0);
        }

        if ($this->feature('Announcement Management') && $this->can('announcement-list')) {
            $latest = isset($data['latest_announcement']) ? trim((string) $data['latest_announcement']) : '';
            $nodes[] = $this->node('announcements', $this->t('Announcements'), '',
                $latest !== '' ? $this->t('Latest') . ': ' . $latest : $this->t('No announcements yet'),
                $this->firstRoute(['announcement.index']), 'primary', 0);
        }

        // Drop buildings whose route does not exist in this installation.
        return array_values(array_filter($nodes, static fn ($n) => !empty($n['href'])));
    }

    private function node(string $id, string $label, string $value, string $hint, ?string $href, string $kind, ?int $metric): array
    {
        return [
            'id' => $id,
            'label' => $label,
            'value' => $value,
            'hint' => $hint,
            'href' => $href,
            'kind' => $kind,
            'metric' => max(0, (int) $metric),
        ];
    }

    private function firstRoute(array $names): ?string
    {
        foreach ($names as $name) {
            $url = ($this->route)($name);
            if (!empty($url)) {
                return $url;
            }
        }
        return null;
    }

    private function can(string $permission): bool
    {
        return (bool) $this->user->can($permission);
    }

    private function canAny(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->can($permission)) {
                return true;
            }
        }
        return false;
    }

    private function feature(string $name): bool
    {
        return (bool) ($this->hasFeature)($name);
    }

    private function t(string $key): string
    {
        return (string) ($this->translate)($key);
    }

    private function int(array $data, string $key): ?int
    {
        return isset($data[$key]) && is_numeric($data[$key]) ? (int) $data[$key] : null;
    }

    private function str(?int $value): string
    {
        return $value === null ? '' : (string) $value;
    }
}
