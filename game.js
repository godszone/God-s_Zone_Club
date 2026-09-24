/* =========================================================
   GOD'S ZONE — DAILY GAME
   ONE ATTEMPT PER DAY
========================================================= */

const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbypAAJYUUq-Ra41OYl7uICog6RMZuwxCIGzYcMXPrljaMymrl4cmXWXIvihKSWFGAa8/exec";


/* =========================================================
   ELEMENTS
========================================================= */

const loginBox = document.getElementById("game-login");
const quizWrap = document.getElementById("quiz-wrap");
const quizForm = document.getElementById("quiz-form");
const resultBox = document.getElementById("game-result");

const nameInput = document.getElementById("player-name");
const startButton = document.getElementById("start-game");
const submitButton = document.getElementById("submit-answers");

const quizWelcome = document.getElementById("quiz-welcome");

const resultScore = document.getElementById("result-score");
const resultPoints = document.getElementById("result-points");
const resultNote = document.getElementById("result-note");

const leaderboardList = document.getElementById("leaderboard-list");

const weekBox = document.getElementById("game-week");
const pointsHint = document.getElementById("game-points-hint");

const liveStatus = document.getElementById("game-live-status");

const serverError = document.getElementById("game-server-error");
const quizServerError = document.getElementById("quiz-server-error");


/* =========================================================
   STATE
========================================================= */

let currentPlayer = "";
let currentWeek = "";
let currentQuestions = [];
let currentState = null;

let requestCounter = 0;


/* =========================================================
   HELPERS
========================================================= */

function sanitizeName(value) {

    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 24);
}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function showError(element, message) {

    if (!element) return;

    if (!message) {

        element.textContent = "";
        element.style.display = "none";

        return;
    }

    element.textContent = message;
    element.style.display = "block";
}


/* =========================================================
   JSONP SERVER REQUEST
========================================================= */

function callServer(action, data = {}) {

    return new Promise((resolve, reject) => {

        const callbackName =
            "__gz_callback_" +
            Date.now() +
            "_" +
            (++requestCounter);


        const script =
            document.createElement("script");


        let finished = false;


        function cleanup() {

            if (finished) return;

            finished = true;

            clearTimeout(timeout);

            try {
                delete window[callbackName];
            } catch (error) {
                window[callbackName] = undefined;
            }

            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }


        const timeout =
            setTimeout(() => {

                cleanup();

                reject(
                    new Error(
                        "Сервер довго не відповідає. Спробуй оновити сторінку."
                    )
                );

            }, 20000);


        window[callbackName] =
            function (response) {

                if (finished) return;

                const responseCopy = response;

                cleanup();


                if (
                    responseCopy &&
                    responseCopy.ok
                ) {

                    resolve(
                        responseCopy.data
                    );

                    return;
                }


                reject(
                    new Error(
                        responseCopy &&
                            responseCopy.error
                            ? responseCopy.error
                            : "Помилка сервера."
                    )
                );
            };


        const params =
            new URLSearchParams();


        params.set(
            "action",
            action
        );

        params.set(
            "callback",
            callbackName
        );

        params.set(
            "data",
            JSON.stringify(data)
        );

        params.set(
            "_",
            String(Date.now())
        );


        script.src =
            WEB_APP_URL +
            "?" +
            params.toString();


        script.onerror =
            function () {

                if (finished) return;

                cleanup();

                reject(
                    new Error(
                        "Не вдалося підключитися до гри."
                    )
                );
            };


        document.head.appendChild(
            script
        );
    });
}


/* =========================================================
   LEADERBOARD
========================================================= */

function renderLeaderboard(leaders = []) {

    if (
        !Array.isArray(leaders) ||
        leaders.length === 0
    ) {

        leaderboardList.innerHTML = `
            <div class="leader-row">

                <div class="leader-rank">
                    —
                </div>

                <div class="leader-name">
                    Поки що немає результатів
                </div>

                <div class="leader-points"></div>

            </div>
        `;

        return;
    }


    leaderboardList.innerHTML =
        leaders.map(
            (player, index) => `

                <div class="leader-row">

                    <div class="leader-rank">
                        ${String(index + 1).padStart(2, "0")}
                    </div>

                    <div class="leader-name">
                        ${escapeHTML(player.name)}
                    </div>

                    <div class="leader-points">
                        ${Number(player.points) || 0} б.
                    </div>

                </div>

            `
        ).join("");
}


/* =========================================================
   QUESTIONS
========================================================= */

function renderQuestions() {

    quizForm.innerHTML =
        currentQuestions.map(
            (question, qIndex) => {

                const options =
                    question.options.map(
                        (option, optionIndex) => `

                            <label class="answer-option">

                                <input
                                    type="radio"
                                    name="question-${qIndex}"
                                    value="${optionIndex}"
                                >

                                <span>
                                    ${escapeHTML(option)}
                                </span>

                            </label>

                        `
                    ).join("");


                return `

                    <article class="question-card">

                        <div class="question-number">
                            ПИТАННЯ ${String(qIndex + 1).padStart(2, "0")}
                        </div>

                        <p class="question-text">
                            ${escapeHTML(question.text)}
                        </p>

                        ${options}

                    </article>

                `;
            }
        ).join("");
}


/* =========================================================
   STATE
========================================================= */

function applyState(state) {

    currentState = state;

    currentWeek =
        String(
            state.week || ""
        );

    currentQuestions =
        Array.isArray(state.questions)
            ? state.questions
            : [];


    weekBox.textContent =
        state.weekTitle ||
        (
            currentWeek
                ? `Тиждень ${currentWeek}`
                : "Байбл квіз"
        );


    const maxPoints =
        Number(state.maxPoints) ||
        currentQuestions.length;


    pointsHint.textContent =
        `Можна заробити до ${maxPoints} балів`;


    renderLeaderboard(
        state.leaderboard || []
    );


    if (state.open === false) {

        liveStatus.textContent =
            "Гра зараз закрита";

        startButton.disabled = true;

        startButton.textContent =
            "Гра зараз недоступна";

    } else {

        liveStatus.textContent =
            "Гра відкрита";

        startButton.disabled = false;

        startButton.textContent =
            "Почати гру";
    }


    showError(
        serverError,
        ""
    );
}


/* =========================================================
   LOAD
========================================================= */

async function loadGame() {

    showError(
        serverError,
        ""
    );

    liveStatus.textContent =
        "Підключення...";


    try {

        const state =
            await callServer(
                "state",
                {}
            );


        applyState(
            state
        );


    } catch (error) {

        console.error(
            "STATE ERROR:",
            error
        );


        liveStatus.textContent =
            "Помилка підключення";


        showError(
            serverError,
            error.message
        );
    }
}


/* =========================================================
   OPEN QUESTIONS
========================================================= */

function openQuiz(name) {

    currentPlayer = name;


    localStorage.setItem(
        "gzPlayerName",
        name
    );


    loginBox.classList.add(
        "is-hidden"
    );


    resultBox.classList.remove(
        "is-active"
    );


    quizWrap.classList.add(
        "is-active"
    );


    quizWelcome.textContent =
        `Привіт, ${name}! Обери по одній відповіді в кожному питанні.`;


    renderQuestions();
}


/* =========================================================
   START

   Здесь происходит проверка:
   играл человек сегодня или нет.
========================================================= */

startButton.addEventListener(
    "click",
    async function () {

        showError(
            serverError,
            ""
        );


        const name =
            sanitizeName(
                nameInput.value
            );


        if (!name) {

            showError(
                serverError,
                "Введи ім’я або нікнейм."
            );

            nameInput.focus();

            return;
        }


        if (!currentState) {

            showError(
                serverError,
                "Гра ще завантажується."
            );

            return;
        }


        if (currentState.open === false) {

            showError(
                serverError,
                "Гра зараз закрита."
            );

            return;
        }


        if (!currentQuestions.length) {

            showError(
                serverError,
                "Питання ще не додані."
            );

            return;
        }


        startButton.disabled = true;

        startButton.textContent =
            "Перевіряємо...";


        liveStatus.textContent =
            "Перевіряємо...";


        try {

            /* ==========================================
               ASK SERVER IF PLAYER PLAYED TODAY
            ========================================== */

            const response =
                await callServer(
                    "start",
                    {
                        name: name
                    }
                );


            if (!response) {

                throw new Error(
                    "Сервер повернув порожню відповідь."
                );
            }


            /* Обновляем состояние */

            if (response.state) {

                currentState =
                    response.state;

                currentWeek =
                    String(
                        response.state.week || ""
                    );

                currentQuestions =
                    Array.isArray(
                        response.state.questions
                    )
                        ? response.state.questions
                        : [];


                renderLeaderboard(
                    response.state.leaderboard || []
                );
            }


            /* ==========================================
               ALREADY PLAYED TODAY
            ========================================== */

            if (response.attempt) {

                const attempt =
                    response.attempt;


                quizWrap.classList.remove(
                    "is-active"
                );


                resultBox.classList.remove(
                    "is-active"
                );


                liveStatus.textContent =
                    "Сьогодні вже зіграно";


                showError(
                    serverError,
                    `${attempt.name}, ти вже проходив(ла) гру сьогодні. Повертайся завтра!`
                );


                startButton.disabled =
                    false;


                startButton.textContent =
                    "Почати гру";


                return;
            }


            /* ==========================================
               PLAYER HAS NOT PLAYED TODAY
            ========================================== */

            liveStatus.textContent =
                "Гра відкрита";


            openQuiz(
                name
            );


        } catch (error) {

            console.error(
                "START ERROR:",
                error
            );


            liveStatus.textContent =
                "Помилка підключення";


            showError(
                serverError,
                error.message
            );


            startButton.disabled =
                false;


            startButton.textContent =
                "Почати гру";
        }
    }
);


/* =========================================================
   ENTER
========================================================= */

nameInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();


            if (
                !startButton.disabled
            ) {

                startButton.click();
            }
        }
    }
);


/* =========================================================
   SUBMIT
========================================================= */

submitButton.addEventListener(
    "click",
    async function () {

        showError(
            quizServerError,
            ""
        );


        const answers = [];

        let answeredCount = 0;


        currentQuestions.forEach(
            (question, qIndex) => {

                const selected =
                    document.querySelector(
                        `input[name="question-${qIndex}"]:checked`
                    );


                if (!selected) {

                    answers.push(null);

                    return;
                }


                answeredCount++;


                answers.push(
                    Number(
                        selected.value
                    )
                );
            }
        );


        if (
            answeredCount <
            currentQuestions.length
        ) {

            alert(
                "Відповідай на всі питання 🙂"
            );

            return;
        }


        submitButton.disabled = true;

        submitButton.textContent =
            "Перевіряємо...";


        try {

            const result =
                await callServer(
                    "submit",
                    {

                        name:
                            currentPlayer,

                        week:
                            currentWeek,

                        answers:
                            answers
                    }
                );


            /* ==========================================
               SAFETY CHECK

               Даже если две вкладки были открыты,
               сервер всё равно запрещает второй результат.
            ========================================== */

            if (result.alreadyPlayed) {

                quizWrap.classList.remove(
                    "is-active"
                );


                resultBox.classList.add(
                    "is-active"
                );


                resultScore.textContent =
                    `${result.correct}/${result.totalQuestions}`;


                resultPoints.textContent =
                    `${result.totalPoints} балів загалом`;


                resultNote.textContent =
                    `${result.name}, ти вже проходив(ла) гру сьогодні. ` +
                    `Нова спроба буде доступна завтра.`;


                renderLeaderboard(
                    result.leaderboard || []
                );


                return;
            }


            /* ==========================================
               NEW RESULT
            ========================================== */

            quizWrap.classList.remove(
                "is-active"
            );


            resultBox.classList.add(
                "is-active"
            );


            resultScore.textContent =
                `${result.correct}/${result.totalQuestions}`;


            resultPoints.textContent =
                `+${result.points} балів`;


            let message = "";


            if (
                result.correct ===
                result.totalQuestions
            ) {

                message =
                    `${result.name}, ідеально! Усі відповіді правильні.`;

            } else if (
                result.correct > 0
            ) {

                message =
                    `${result.name}, правильних відповідей: ` +
                    `${result.correct} з ${result.totalQuestions}.`;

            } else {

                message =
                    `${result.name}, цього разу без балів. ` +
                    `Завтра можна спробувати знову!`;
            }


            message +=
                ` Загалом: ${result.totalPoints} балів.`;


            if (result.rank) {

                message +=
                    ` Твоє місце: #${result.rank}.`;
            }


            resultNote.textContent =
                message;


            renderLeaderboard(
                result.leaderboard || []
            );


        } catch (error) {

            console.error(
                "SUBMIT ERROR:",
                error
            );


            showError(
                quizServerError,
                error.message
            );


        } finally {

            submitButton.disabled =
                false;


            submitButton.textContent =
                "Відправити відповіді";
        }
    }
);


/* =========================================================
   SAVED NAME
========================================================= */

const rememberedName =
    localStorage.getItem(
        "gzPlayerName"
    );


if (rememberedName) {

    nameInput.value =
        rememberedName;
}


/* =========================================================
   START APP
========================================================= */

loadGame();