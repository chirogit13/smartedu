{{-- Smart EduVerse homepage styles (public homepage only) --}}
@if (isset($featureSections))
    @php
        $evCss = 'assets/home_page/css/eduverse.css';
        $evCssVer = @filemtime(public_path($evCss)) ?: '1';
    @endphp
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <link rel="stylesheet" href="{{ asset($evCss) }}?v={{ $evCssVer }}">
@endif
