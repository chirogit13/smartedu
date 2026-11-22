{{-- Smart EduVerse homepage experience (public homepage only) --}}
@if (isset($featureSections))
    @php
        $evLogo = $settings['horizontal_logo'] ?? asset('assets/landing_page_images/Logo1.svg');
        $evName = $settings['system_name'] ?? 'Smart EduVerse';
        $evMsgs = [
            __("Hi! I am your Smart EduVerse assistant."),
            __("I can explain any topic, step by step."),
            __("Parents get instant updates on attendance and results."),
            __("Teachers save hours on grading and reports."),
            __("Tap Get Started to bring your school online."),
        ];
        $evJs = 'assets/home_page/js/eduverse-experience.js';
        $evJsVer = @filemtime(public_path($evJs)) ?: '1';
    @endphp

    {{-- Hero copy --}}
    <template id="eduverseHeroCopy">
        <div class="ev-copy">
            <div class="ev-brand" data-ev="brand">
                <img src="{{ $evLogo }}" alt="{{ $evName }}">
                <span>Smart EduVerse</span>
            </div>
            <div>
                <span class="ev-eyebrow" data-ev="eyebrow"><span class="ev-dot" aria-hidden="true"></span>{{ __("The AI-powered school platform") }}</span>
            </div>
            <h1 class="ev-title">
                <span class="ev-line-mask"><span class="ev-line" data-ev="line">{{ __("Education Beyond Boundaries.") }}</span></span>
                <span class="ev-line-mask"><span class="ev-line ev-gradient" data-ev="line">{{ __("Learning Smarter with AI.") }}</span></span>
            </h1>
            <p class="ev-sub" data-ev="sub">{{ __("Empowering students, supporting teachers and connecting parents through intelligent education.") }}</p>
            <div class="ev-actions" data-ev="actions">
                <a href="#eduverse-story" class="ev-btn ev-btn-primary">
                    {{ __("Explore Smart EduVerse") }} <i class="fa-solid fa-arrow-down" aria-hidden="true"></i>
                </a>
                <button type="button" class="ev-btn ev-btn-ghost" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
                    {{ __("Get Started") }} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </button>
                @if (($isDemoSchool ?? 0) == 1)
                    <a href="{{ $demoSchoolUrl ?? url('/') }}" target="_blank" rel="noopener" class="ev-demo-link">{{ __("Try the demo school") }}</a>
                @endif
            </div>
            <ul class="ev-audiences">
                <li data-ev="aud" tabindex="0" data-ev-react data-ev-msg="{{ __("Students learn at their own pace with an AI tutor.") }}">
                    <span class="ev-aud-icon" aria-hidden="true"><i class="fa-solid fa-user-graduate"></i></span>
                    <span class="ev-aud-text"><strong>{{ __("Students") }}</strong><span>{{ __("Learn at your own pace") }}</span></span>
                </li>
                <li data-ev="aud" tabindex="0" data-ev-react data-ev-msg="{{ __("Parents see attendance, results and fees in real time.") }}">
                    <span class="ev-aud-icon" aria-hidden="true"><i class="fa-solid fa-people-roof"></i></span>
                    <span class="ev-aud-text"><strong>{{ __("Parents") }}</strong><span>{{ __("Stay connected daily") }}</span></span>
                </li>
                <li data-ev="aud" tabindex="0" data-ev-react data-ev-msg="{{ __("Teachers plan, grade and report in one place.") }}">
                    <span class="ev-aud-icon" aria-hidden="true"><i class="fa-solid fa-chalkboard-user"></i></span>
                    <span class="ev-aud-text"><strong>{{ __("Teachers") }}</strong><span>{{ __("Teach, not paperwork") }}</span></span>
                </li>
            </ul>
        </div>
    </template>

    {{-- Hero visual: floating cards and holographic assistant around the 3D globe --}}
    <template id="eduverseHeroVisual" data-screen-alt="{{ __("Smart EduVerse dashboard preview") }}">
        <div class="ev-float ev-float-a" data-depth="18">
            <div class="ev-card" data-ev="card" tabindex="0" data-ev-react data-ev-msg="{{ __("Attendance is tracked automatically every day.") }}">
                <span class="ev-card-icon" aria-hidden="true"><i class="fa-solid fa-calendar-check"></i></span>
                <span class="ev-card-text"><small>{{ __("Attendance today") }}</small><strong>96%</strong></span>
            </div>
        </div>
        <div class="ev-float ev-float-b" data-depth="-14">
            <div class="ev-card" data-ev="card" tabindex="0" data-ev-react data-ev-msg="{{ __("Ask me anything, any time of day.") }}">
                <span class="ev-card-icon" aria-hidden="true"><i class="fa-solid fa-robot"></i></span>
                <span class="ev-card-text"><small>{{ __("AI tutor") }}</small><strong>{{ __("Online now") }}</strong></span>
            </div>
        </div>
        <div class="ev-float ev-float-c" data-depth="10">
            <div class="ev-card" data-ev="card" tabindex="0" data-ev-react data-ev-msg="{{ __("Results are published the moment teachers finish grading.") }}">
                <span class="ev-card-icon" aria-hidden="true"><i class="fa-solid fa-award"></i></span>
                <span class="ev-card-text"><small>{{ __("New result") }}</small><strong>{{ __("Maths: A+") }}</strong></span>
            </div>
        </div>
        <div class="ev-ai" data-ev="ai" data-msgs="{{ json_encode($evMsgs) }}">
            <div class="ev-ai-bubble" data-ev-bubble role="status" aria-live="polite"></div>
            <button type="button" class="ev-ai-avatar" aria-label="{{ __("Talk to the Smart EduVerse assistant") }}">
                <span class="ev-ai-halo" aria-hidden="true"></span>
                <span class="ev-ai-head" aria-hidden="true">
                    <span class="ev-ai-visor"><span class="ev-ai-eye"></span><span class="ev-ai-eye"></span></span>
                </span>
                <span class="ev-ai-body" aria-hidden="true"></span>
                <span class="ev-ai-scan" aria-hidden="true"></span>
                <span class="ev-ai-base" aria-hidden="true"></span>
            </button>
        </div>
    </template>

    {{-- Story sections shown below the hero --}}
    <template id="eduverseStorySections">
        <section class="ev-story" id="eduverse-story" aria-labelledby="ev-story-title">
            <div class="container">
                <div class="ev-story-head ev-reveal">
                    <span class="ev-tag">{{ __("One connected school") }}</span>
                    <h2 id="ev-story-title">{{ __("Everything your school needs, working together") }}</h2>
                    <p>{{ __("Smart EduVerse brings students, teachers and parents onto one intelligent platform, so learning keeps moving inside and outside the classroom.") }}</p>
                </div>

                {{-- 1. AI-powered learning --}}
                <article class="ev-feature ev-reveal">
                    <div class="ev-feature-text">
                        <span class="ev-tag"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> {{ __("AI-powered learning") }}</span>
                        <h3>{{ __("A personal tutor for every student") }}</h3>
                        <p>{{ __("Students ask questions in plain language and get clear, step-by-step explanations, practice questions and revision tips, any time of day.") }}</p>
                        <ul class="ev-points">
                            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>{{ __("Explains topics at the right level for each student") }}</span></li>
                            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>{{ __("Creates quizzes and revision plans in seconds") }}</span></li>
                            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>{{ __("Available 24/7 on web and mobile") }}</span></li>
                        </ul>
                    </div>
                    <div class="ev-mock" data-ev-demo="ai">
                        <div class="ev-mock-head">
                            <span class="ev-mock-title"><i class="fa-solid fa-robot" aria-hidden="true"></i>{{ __("AI study assistant") }}</span>
                            <span class="ev-sample">{{ __("Sample") }}</span>
                        </div>
                        <div class="ev-chat-body">
                            <div class="ev-msg ev-msg-user">{{ __("Can you explain photosynthesis simply?") }}</div>
                            <div class="ev-typing" aria-hidden="true"><span></span><span></span><span></span></div>
                            <div class="ev-msg ev-msg-ai">
                                <span class="ev-msg-avatar" aria-hidden="true"><i class="fa-solid fa-robot"></i></span>
                                <span data-ev-type>{{ __("Of course! Plants use sunlight, water and carbon dioxide to make their own food (glucose) and release oxygen. Think of leaves as tiny solar-powered kitchens.") }}</span>
                            </div>
                            <div class="ev-chips">
                                <span>{{ __("Give me a quiz") }}</span>
                                <span>{{ __("Show a diagram") }}</span>
                                <span>{{ __("Explain in simpler words") }}</span>
                            </div>
                        </div>
                        <div class="ev-chat-input" aria-hidden="true">
                            <span>{{ __("Ask anything about your lessons...") }}</span>
                            <i class="fa-solid fa-paper-plane"></i>
                        </div>
                    </div>
                </article>

                {{-- 2. Student performance --}}
                <article class="ev-feature is-flipped ev-reveal">
                    <div class="ev-feature-text">
                        <span class="ev-tag"><i class="fa-solid fa-chart-line" aria-hidden="true"></i> {{ __("Student performance") }}</span>
                        <h3>{{ __("See progress clearly, act early") }}</h3>
                        <p>{{ __("Grades, attendance and exam results turn into simple charts, so everyone can spot strengths and gaps before they become problems.") }}</p>
                        <ul class="ev-points">
                            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>{{ __("Live attendance and grade tracking") }}</span></li>
                            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>{{ __("Subject-by-subject progress charts") }}</span></li>
                            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>{{ __("Early alerts for students who need support") }}</span></li>
                        </ul>
                    </div>
                    <div class="ev-mock" data-ev-demo="perf">
                        <div class="ev-mock-head">
                            <span class="ev-mock-title"><i class="fa-solid fa-chart-pie" aria-hidden="true"></i>{{ __("Term overview") }}</span>
                            <span class="ev-sample">{{ __("Sample data") }}</span>
                        </div>
                        <div class="ev-perf">
                            <div class="ev-panel">
                                <span class="ev-panel-label">{{ __("Attendance") }}</span>
                                <div class="ev-ring">
                                    <svg viewBox="0 0 120 120" aria-hidden="true">
                                        <circle class="ev-ring-bg" cx="60" cy="60" r="50"></circle>
                                        <circle class="ev-ring-fg" cx="60" cy="60" r="50"></circle>
                                    </svg>
                                    <div class="ev-ring-value"><div><span data-ev-count="96">96</span>%<small>{{ __("This term") }}</small></div></div>
                                </div>
                            </div>
                            <div class="ev-panel">
                                <span class="ev-panel-label">{{ __("Average score by subject") }}</span>
                                <div class="ev-bars">
                                    <div class="ev-bar"><div class="ev-bar-track"><div class="ev-bar-fill" style="--h:88%;--d:0s"></div></div><small>{{ __("Math") }}</small></div>
                                    <div class="ev-bar"><div class="ev-bar-track"><div class="ev-bar-fill" style="--h:76%;--d:.1s"></div></div><small>{{ __("Sci") }}</small></div>
                                    <div class="ev-bar"><div class="ev-bar-track"><div class="ev-bar-fill" style="--h:92%;--d:.2s"></div></div><small>{{ __("Eng") }}</small></div>
                                    <div class="ev-bar"><div class="ev-bar-track"><div class="ev-bar-fill" style="--h:68%;--d:.3s"></div></div><small>{{ __("Hist") }}</small></div>
                                    <div class="ev-bar"><div class="ev-bar-track"><div class="ev-bar-fill" style="--h:84%;--d:.4s"></div></div><small>{{ __("Art") }}</small></div>
                                </div>
                            </div>
                            <div class="ev-panel ev-grades">
                                <div class="ev-grade"><strong>A</strong><span>{{ __("Overall grade") }}</span></div>
                                <div class="ev-grade"><strong><span data-ev-count="12">12</span></strong><span>{{ __("Assignments done") }}</span></div>
                                <div class="ev-grade"><strong>+<span data-ev-count="8">8</span>%</strong><span>{{ __("Since last term") }}</span></div>
                                <div class="ev-spark" aria-hidden="true">
                                    <svg viewBox="0 0 200 52" preserveAspectRatio="none"><path d="M2 44 L30 38 L58 40 L86 28 L114 30 L142 18 L170 20 L198 6"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>

                {{-- 3. Parent engagement --}}
                <article class="ev-feature ev-reveal">
                    <div class="ev-feature-text">
                        <span class="ev-tag"><i class="fa-solid fa-bell" aria-hidden="true"></i> {{ __("Parent engagement") }}</span>
                        <h3>{{ __("Parents always in the loop") }}</h3>
                        <p>{{ __("Instant notifications on the parent app keep families informed about attendance, results, homework, fees and school events.") }}</p>
                        <ul class="ev-points">
                            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>{{ __("Real-time alerts on any phone") }}</span></li>
                            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>{{ __("Direct messages with teachers") }}</span></li>
                            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>{{ __("Online fee payments and receipts") }}</span></li>
                        </ul>
                    </div>
                    <div class="ev-mock ev-phone-stage" data-ev-demo="parent">
                        <div class="ev-phone">
                            <div class="ev-phone-screen">
                                <span class="ev-phone-notch" aria-hidden="true"></span>
                                <div class="ev-phone-time">8:45</div>
                                <div class="ev-phone-date">{{ __("Sample notifications") }}</div>
                                <div class="ev-notif" style="--d:.1s">
                                    <span class="ev-notif-icon" aria-hidden="true"><i class="fa-solid fa-calendar-check"></i></span>
                                    <span class="ev-notif-text"><strong>{{ __("Attendance") }}</strong><span>{{ __("Aisha arrived at school at 7:58") }}</span><small>{{ __("now") }}</small></span>
                                </div>
                                <div class="ev-notif" style="--d:.5s">
                                    <span class="ev-notif-icon" aria-hidden="true"><i class="fa-solid fa-award"></i></span>
                                    <span class="ev-notif-text"><strong>{{ __("New result") }}</strong><span>{{ __("Science test: 92%. Great work!") }}</span><small>{{ __("5 min ago") }}</small></span>
                                </div>
                                <div class="ev-notif" style="--d:.9s">
                                    <span class="ev-notif-icon" aria-hidden="true"><i class="fa-solid fa-book-open"></i></span>
                                    <span class="ev-notif-text"><strong>{{ __("Homework") }}</strong><span>{{ __("English essay due Friday") }}</span><small>{{ __("1 h ago") }}</small></span>
                                </div>
                                <div class="ev-notif" style="--d:1.3s">
                                    <span class="ev-notif-icon" aria-hidden="true"><i class="fa-solid fa-comments"></i></span>
                                    <span class="ev-notif-text"><strong>{{ __("Message from teacher") }}</strong><span>{{ __("Parent meeting moved to Thursday") }}</span><small>{{ __("today") }}</small></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>

                {{-- 4. Teacher workspace --}}
                <article class="ev-feature is-flipped ev-reveal">
                    <div class="ev-feature-text">
                        <span class="ev-tag"><i class="fa-solid fa-chalkboard-user" aria-hidden="true"></i> {{ __("Teacher workspace") }}</span>
                        <h3>{{ __("Less admin, more teaching") }}</h3>
                        <p>{{ __("Create assignments, run assessments and generate reports from one workspace, with AI help for grading and feedback.") }}</p>
                        <ul class="ev-points">
                            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>{{ __("Assignments and online assessments") }}</span></li>
                            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>{{ __("AI-assisted grading and feedback") }}</span></li>
                            <li><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>{{ __("One-click class and student reports") }}</span></li>
                        </ul>
                    </div>
                    <div class="ev-mock" data-ev-demo="teacher">
                        <div class="ev-mock-head">
                            <span class="ev-mock-title"><i class="fa-solid fa-briefcase" aria-hidden="true"></i>{{ __("Teacher workspace") }}</span>
                            <span class="ev-sample">{{ __("Sample data") }}</span>
                        </div>
                        <div class="ev-teacher">
                            <div class="ev-side" aria-hidden="true">
                                <span class="is-active"><i class="fa-solid fa-list-check"></i></span>
                                <span><i class="fa-solid fa-file-pen"></i></span>
                                <span><i class="fa-solid fa-chart-column"></i></span>
                                <span><i class="fa-solid fa-users"></i></span>
                            </div>
                            <div class="ev-tasks">
                                <div class="ev-task" style="--d:0s">
                                    <span class="ev-task-name">{{ __("Algebra worksheet - Grade 8") }}</span>
                                    <span class="ev-badge ev-badge-ok">{{ __("Graded") }}</span>
                                    <span class="ev-task-meta"><span class="ev-progress"><span style="--w:100%"></span></span>32/32</span>
                                </div>
                                <div class="ev-task" style="--d:.15s">
                                    <span class="ev-task-name">{{ __("Science quiz - Cells") }}</span>
                                    <span class="ev-badge ev-badge-ai">{{ __("AI grading") }}</span>
                                    <span class="ev-task-meta"><span class="ev-progress"><span style="--w:72%"></span></span>23/32</span>
                                </div>
                                <div class="ev-task" style="--d:.3s">
                                    <span class="ev-task-name">{{ __("English essay - My hero") }}</span>
                                    <span class="ev-badge ev-badge-due">{{ __("Due Friday") }}</span>
                                    <span class="ev-task-meta"><span class="ev-progress"><span style="--w:40%"></span></span>13/32</span>
                                </div>
                                <div class="ev-report">
                                    <i class="fa-solid fa-file-circle-check" aria-hidden="true"></i>
                                    <span>{{ __("Term report for Class 8B is ready to share") }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        </section>
    </template>

    <script src="{{ asset($evJs) }}?v={{ $evJsVer }}"></script>
@endif
