<?php

namespace Tests\Feature;

use App\Http\Middleware\RequireCronSecret;
use Illuminate\Http\Request;
use Tests\TestCase;

class RequireCronSecretTest extends TestCase
{
    public function test_it_fails_closed_when_the_secret_is_not_configured(): void
    {
        config(['services.cron.secret' => '']);

        $response = (new RequireCronSecret())->handle(
            Request::create('/subscription/cron-job'),
            fn () => response('continued')
        );

        $this->assertSame(503, $response->getStatusCode());
        $this->assertSame('{"message":"Cron endpoint is not configured."}', $response->getContent());
    }

    public function test_it_rejects_a_missing_or_incorrect_secret(): void
    {
        config(['services.cron.secret' => 'expected-secret']);

        foreach ([null, 'incorrect-secret'] as $providedSecret) {
            $server = $providedSecret === null ? [] : ['HTTP_X_CRON_SECRET' => $providedSecret];
            $response = (new RequireCronSecret())->handle(
                Request::create('/subscription/cron-job', 'GET', [], [], [], $server),
                fn () => response('continued')
            );

            $this->assertSame(403, $response->getStatusCode());
        }
    }

    public function test_it_continues_when_the_configured_secret_matches(): void
    {
        config(['services.cron.secret' => 'expected-secret']);
        $request = Request::create(
            '/subscription/cron-job',
            'GET',
            [],
            [],
            [],
            ['HTTP_X_CRON_SECRET' => 'expected-secret']
        );

        $response = (new RequireCronSecret())->handle(
            $request,
            fn () => response('continued', 202)
        );

        $this->assertSame(202, $response->getStatusCode());
        $this->assertSame('continued', $response->getContent());
    }
}
