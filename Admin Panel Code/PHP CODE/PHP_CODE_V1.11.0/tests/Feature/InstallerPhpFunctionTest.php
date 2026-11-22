<?php

namespace Tests\Feature;

use Tests\TestCase;

class InstallerPhpFunctionTest extends TestCase
{
    public function test_php_function_step_renders_function_checks(): void
    {
        foreach (['installer.server', 'installer.folders'] as $configKey) {
            $checks = config($configKey);
            foreach ($checks as &$check) {
                $check['check'] = static fn () => true;
            }
            unset($check);

            config([$configKey => $checks]);
        }

        $this->get(route('install.php-function.index'))
            ->assertOk()
            ->assertSee('Enable php Symlink function')
            ->assertSee('Enable php exec function')
            ->assertSee('Enable php shell_exec function')
            ->assertSee('Enable php proc_open function');
    }
}
