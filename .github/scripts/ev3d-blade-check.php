<?php
// Phase 2 one-off helper: compile every Blade view with Laravel 10's compiler and run php -l on the result.
// Fails only when an EduVerse 3D view or a dashboard listed on the command line breaks.
require getenv('BLADE_VENDOR') . '/autoload.php';

use Illuminate\Filesystem\Filesystem;
use Illuminate\View\Compilers\BladeCompiler;

$root = rtrim($argv[1], '/');
$must = array_slice($argv, 2);
$compiler = new BladeCompiler(new Filesystem(), sys_get_temp_dir());
$bad = 0;
$ok = 0;
$skipped = 0;
$files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
foreach ($files as $file) {
    $path = (string) $file;
    if (!str_ends_with($path, '.blade.php')) {
        continue;
    }
    $rel = substr($path, strlen($root) + 1);
    $critical = in_array($rel, $must, true) || str_starts_with($rel, 'eduverse3d/');
    try {
        $php = $compiler->compileString(file_get_contents($path));
    } catch (Throwable $e) {
        $skipped++;
        echo ($critical ? 'COMPILE FAIL ' : 'skip (needs full app) ') . $rel . ': ' . $e->getMessage() . PHP_EOL;
        if ($critical) {
            $bad = 1;
        }
        continue;
    }
    $tmp = tempnam(sys_get_temp_dir(), 'blade');
    file_put_contents($tmp, $php);
    $out = [];
    exec('php -l ' . escapeshellarg($tmp) . ' 2>&1', $out, $rc);
    unlink($tmp);
    if ($rc !== 0) {
        echo ($critical ? 'LINT FAIL ' : 'lint warning (existing view) ') . $rel . PHP_EOL . '  ' . implode(PHP_EOL . '  ', $out) . PHP_EOL;
        if ($critical) {
            $bad = 1;
        }
        continue;
    }
    $ok++;
    if ($critical) {
        echo 'OK ' . $rel . PHP_EOL;
    }
}
echo 'Compiled and linted: ' . $ok . ', skipped: ' . $skipped . PHP_EOL;
exit($bad);
