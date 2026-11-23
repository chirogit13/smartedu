<?php

namespace Tests\Unit\EduVerse3D;

use App\Services\EduVerse3D\SchoolCampusBuilder;
use PHPUnit\Framework\TestCase;

/**
 * Plain PHPUnit tests (no database, no Laravel boot) for the School Admin
 * campus: who gets it, which buildings appear, and that values are never invented.
 */
class SchoolCampusBuilderTest extends TestCase
{
    private const ALL_FEATURES = [
        'Attendance Management', 'Exam Management', 'Assignment Management', 'Lesson Management',
        'Fees Management', 'Transportation Module', 'Announcement Management',
    ];

    private const ALL_PERMISSIONS = [
        'school-setting-manage', 'class-list', 'student-list', 'teacher-list', 'attendance-list',
        'exam-result', 'exam-create', 'assignment-list', 'lesson-list', 'fees-paid', 'fees-list',
        'vehicles-list', 'route-list', 'reports-student', 'reports-exam', 'announcement-list',
    ];

    private static function user(?int $schoolId, array $roles, array $permissions): object
    {
        return new class ($schoolId, $roles, $permissions) {
            public $school_id;
            private array $roles;
            private array $permissions;

            public function __construct($schoolId, array $roles, array $permissions)
            {
                $this->school_id = $schoolId;
                $this->roles = $roles;
                $this->permissions = $permissions;
            }

            public function hasRole($role): bool
            {
                return in_array($role, $this->roles, true);
            }

            public function can($permission): bool
            {
                return in_array($permission, $this->permissions, true);
            }
        };
    }

    private static function builder(object $user, array $features = self::ALL_FEATURES, ?array $routes = null): SchoolCampusBuilder
    {
        return new SchoolCampusBuilder(
            $user,
            fn (string $f) => in_array($f, $features, true),
            fn (string $name) => ($routes === null || in_array($name, $routes, true)) ? 'https://school.test/' . $name : null,
            fn (string $key) => $key
        );
    }

    private static function ids(array $nodes): array
    {
        return array_column($nodes, 'id');
    }

    private static function byId(array $nodes, string $id): array
    {
        foreach ($nodes as $node) {
            if ($node['id'] === $id) {
                return $node;
            }
        }
        self::fail("Node {$id} not found");
    }

    public function test_only_school_admins_of_a_school_are_eligible(): void
    {
        $this->assertTrue(SchoolCampusBuilder::isEligible(self::user(7, ['School Admin'], [])));
        $this->assertFalse(SchoolCampusBuilder::isEligible(null));
        $this->assertFalse(SchoolCampusBuilder::isEligible(self::user(null, ['School Admin'], [])));
        $this->assertFalse(SchoolCampusBuilder::isEligible(self::user(7, ['Teacher'], [])));
        $this->assertFalse(SchoolCampusBuilder::isEligible(self::user(7, ['Student'], [])));
        $this->assertFalse(SchoolCampusBuilder::isEligible(self::user(null, ['Super Admin'], self::ALL_PERMISSIONS)));
        $this->assertFalse(SchoolCampusBuilder::isEligible(self::user(7, ['School Admin', 'Super Admin'], [])));
    }

    public function test_ineligible_users_get_no_buildings_even_with_every_permission(): void
    {
        foreach ([self::user(null, ['School Admin'], self::ALL_PERMISSIONS), self::user(7, ['Teacher'], self::ALL_PERMISSIONS)] as $user) {
            $this->assertSame([], self::builder($user)->nodes(['students' => 10]));
        }
    }

    public function test_school_admin_with_all_permissions_and_features_gets_every_building(): void
    {
        $nodes = self::builder(self::user(7, ['School Admin'], self::ALL_PERMISSIONS))->nodes([]);
        $this->assertSame(
            ['main', 'classes', 'students', 'teachers', 'attendance', 'exams', 'assignments', 'fees', 'transport', 'reports', 'announcements'],
            self::ids($nodes)
        );
        foreach ($nodes as $node) {
            $this->assertNotEmpty($node['href']);
        }
    }

    public function test_no_permissions_means_no_buildings(): void
    {
        $this->assertSame([], self::builder(self::user(7, ['School Admin'], []))->nodes(['students' => 10, 'teachers' => 3]));
    }

    public function test_each_building_requires_its_permission(): void
    {
        $nodes = self::builder(self::user(7, ['School Admin'], ['student-list', 'reports-exam']))->nodes([]);
        $this->assertSame(['students', 'reports'], self::ids($nodes));
        $this->assertSame('https://school.test/reports.exam.exam-reports', self::byId($nodes, 'reports')['href']);
    }

    public function test_plan_features_gate_modules_even_with_permission(): void
    {
        $nodes = self::builder(self::user(7, ['School Admin'], self::ALL_PERMISSIONS), [])->nodes([]);
        $this->assertSame(['main', 'classes', 'students', 'teachers', 'reports'], self::ids($nodes));
    }

    public function test_class_teacher_alone_does_not_open_student_details(): void
    {
        // StudentController@index requires student-list, so class-teacher alone must not show the building.
        $nodes = self::builder(self::user(7, ['School Admin'], ['class-teacher']))->nodes([]);
        $this->assertSame(['attendance'], self::ids($nodes));
    }

    public function test_lesson_link_is_used_when_assignments_are_not_allowed(): void
    {
        $nodes = self::builder(self::user(7, ['School Admin'], ['lesson-list']), ['Lesson Management'])->nodes([]);
        $this->assertSame('https://school.test/lesson.index', self::byId($nodes, 'assignments')['href']);
    }

    public function test_buildings_with_missing_routes_are_dropped(): void
    {
        $nodes = self::builder(self::user(7, ['School Admin'], self::ALL_PERMISSIONS), self::ALL_FEATURES, ['students.index', 'fees.index'])->nodes([]);
        $this->assertSame(['students', 'fees'], self::ids($nodes));
        $this->assertSame('https://school.test/fees.index', self::byId($nodes, 'fees')['href']);
    }

    public function test_values_come_only_from_supplied_data(): void
    {
        $nodes = self::builder(self::user(7, ['School Admin'], self::ALL_PERMISSIONS))->nodes([
            'students' => 412, 'guardians' => 300, 'teachers' => 25, 'classes' => 12, 'streams' => 2, 'exams' => 3,
            'fees' => ['fullPaidFees' => 100, 'partialPaidFees' => 20, 'unPaidFees' => 5],
            'attendance' => ['present' => 380, 'absent' => 12, 'marked' => 392],
            'latest_announcement' => 'Sports day',
        ]);
        $this->assertSame('412', self::byId($nodes, 'students')['value']);
        $this->assertSame(412, self::byId($nodes, 'students')['metric']);
        $this->assertSame('25', self::byId($nodes, 'teachers')['value']);
        $this->assertSame('12', self::byId($nodes, 'classes')['value']);
        $this->assertSame('3', self::byId($nodes, 'exams')['value']);
        $this->assertSame('380 / 392', self::byId($nodes, 'attendance')['value']);
        $this->assertSame('warning', self::byId($nodes, 'attendance')['kind']);
        $this->assertSame('100', self::byId($nodes, 'fees')['value']);
        $this->assertSame(125, self::byId($nodes, 'fees')['metric']);
        $this->assertSame('warning', self::byId($nodes, 'fees')['kind']);
        $this->assertStringContainsString('Sports day', self::byId($nodes, 'announcements')['hint']);
    }

    public function test_missing_data_is_left_empty_not_invented(): void
    {
        $nodes = self::builder(self::user(7, ['School Admin'], self::ALL_PERMISSIONS))->nodes([]);
        foreach ($nodes as $node) {
            $this->assertSame('', $node['value'], "{$node['id']} should have no value");
            $this->assertSame(0, $node['metric'], "{$node['id']} should use the base height");
        }
    }
}
