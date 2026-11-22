{{--
    Smart EduVerse 3D stage (shared partial).
    Usage: @include('eduverse3d.stage', ['ev3d' => [...]])
      id         string   unique DOM id
      scene      string   globe | campus | classroom
      eyebrow    string   small label above the title
      title      string
      subtitle   string   (optional)
      panelTitle string   heading for the accessible link panel
      nodes      array    [['id','label','value','hint','href','kind','metric']]  clickable modules
      markers    array    globe only: [['id','label','hint','href','kind','weight']]
      slots      array    classroom only: [['id','label','sub','href']]
      extra      array    scene extras (centerLabel, centerSub, boardTitle, boardSub)
      legend     array    [['kind','label']]
      note       string   honest data note shown under the panel
    The HTML panel lists every clickable object as a normal link, so the page
    stays fully usable with keyboard, screen readers and without WebGL.
--}}
@php
    $ev3dVersion = '2.0.0';
    $ev3dId = $ev3d['id'] ?? 'ev3d-' . uniqid();
    $ev3dNodes = array_values(array_filter($ev3d['nodes'] ?? []));
    $ev3dConfig = array_merge($ev3d['extra'] ?? [], [
        'nodes' => $ev3dNodes,
        'markers' => array_values($ev3d['markers'] ?? []),
        'slots' => array_values($ev3d['slots'] ?? []),
        'i18n' => [
            'pause' => __('Pause motion'),
            'play' => __('Play motion'),
            'reducedMotion' => __('Motion is off because your device prefers reduced motion.'),
            'noWebgl' => __('3D view is not supported on this device. All modules are listed alongside.'),
            'loadError' => __('The 3D view could not be loaded. All modules are still available alongside.'),
            'sceneError' => __('The 3D view hit a problem. All modules are still available alongside.'),
            'contextLost' => __('The 3D view was paused by the browser. Reload the page to restore it.'),
            'unsupported' => __('This 3D view is not available.'),
        ],
    ]);
    $ev3dJson = json_encode($ev3dConfig, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
@endphp

@once
    <link rel="stylesheet" href="{{ asset('assets/eduverse3d/eduverse3d.css') }}?v={{ $ev3dVersion }}">
    <script type="module" src="{{ asset('assets/eduverse3d/eduverse3d.js') }}?v={{ $ev3dVersion }}"></script>
@endonce

<section class="ev3d" id="{{ $ev3dId }}" data-ev3d="{{ $ev3d['scene'] ?? 'globe' }}"
    data-ev3d-three="{{ asset('assets/eduverse3d/vendor/three.module.min.js') }}?v={{ $ev3dVersion }}"
    data-ev3d-state="idle" aria-labelledby="{{ $ev3dId }}-title">
    <div class="ev3d-header">
        <div>
            @if (!empty($ev3d['eyebrow']))
                <p class="ev3d-eyebrow">{{ $ev3d['eyebrow'] }}</p>
            @endif
            <h2 class="ev3d-title" id="{{ $ev3dId }}-title">{{ $ev3d['title'] ?? '' }}</h2>
            @if (!empty($ev3d['subtitle']))
                <p class="ev3d-subtitle">{{ $ev3d['subtitle'] }}</p>
            @endif
        </div>
        <button type="button" class="ev3d-btn ev3d-motion-toggle" aria-pressed="false">{{ __('Pause motion') }}</button>
    </div>

    <div class="ev3d-body">
        <div class="ev3d-stage">
            <div class="ev3d-canvas" aria-hidden="true"></div>
            <div class="ev3d-overlay ev3d-loading" role="status" hidden>
                <span class="ev3d-spinner" aria-hidden="true"></span>
                <span>{{ __('Loading 3D view…') }}</span>
            </div>
            <div class="ev3d-overlay ev3d-fallback" role="status" hidden>
                <span class="ev3d-fallback-icon" aria-hidden="true"><i class="fa fa-cube"></i></span>
                <span class="ev3d-fallback-text">{{ __('3D view is not supported on this device. All modules are listed alongside.') }}</span>
            </div>
            <div class="ev3d-tooltip" hidden></div>
            <p class="ev3d-hint" aria-hidden="true">{{ __('Drag to rotate. Click an object to open it.') }}</p>
            <noscript>
                <div class="ev3d-overlay">{{ __('Turn on JavaScript to see the 3D view. All modules are listed alongside.') }}</div>
            </noscript>
        </div>

        <nav class="ev3d-panel" aria-label="{{ $ev3d['panelTitle'] ?? __('Modules') }}">
            <h3 class="ev3d-panel-title">{{ $ev3d['panelTitle'] ?? __('Modules') }}</h3>
            @if (count($ev3dNodes))
                <ul class="ev3d-nodes">
                    @foreach ($ev3dNodes as $node)
                        <li>
                            @if (!empty($node['href']))
                                <a class="ev3d-node" href="{{ $node['href'] }}" data-ev3d-node="{{ $node['id'] }}"
                                    data-kind="{{ $node['kind'] ?? 'primary' }}">
                            @else
                                <div class="ev3d-node" data-ev3d-node="{{ $node['id'] }}"
                                    data-kind="{{ $node['kind'] ?? 'primary' }}">
                            @endif
                                <span class="ev3d-node-label">{{ $node['label'] }}</span>
                                @if (isset($node['value']) && $node['value'] !== '')
                                    <span class="ev3d-node-value">{{ $node['value'] }}</span>
                                @endif
                                @if (!empty($node['hint']))
                                    <span class="ev3d-node-hint">{{ $node['hint'] }}</span>
                                @endif
                            @if (!empty($node['href']))
                                </a>
                            @else
                                </div>
                            @endif
                        </li>
                    @endforeach
                </ul>
            @else
                <p class="ev3d-empty">{{ __('No modules are available for your account.') }}</p>
            @endif

            @if (!empty($ev3d['legend']))
                <ul class="ev3d-legend">
                    @foreach ($ev3d['legend'] as $item)
                        <li><span class="ev3d-dot" data-kind="{{ $item['kind'] }}" aria-hidden="true"></span>{{ $item['label'] }}</li>
                    @endforeach
                </ul>
            @endif

            @if (!empty($ev3d['note']))
                <p class="ev3d-note">{{ $ev3d['note'] }}</p>
            @endif
        </nav>
    </div>

    <script type="application/json" class="ev3d-config">{!! $ev3dJson !!}</script>
</section>
