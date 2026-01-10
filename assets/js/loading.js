// Loading Page Animation Script
// Handles boot sequence, test execution, and automatic redirect to main portfolio

document.addEventListener("DOMContentLoaded", () => {
  const loadingContainer = document.querySelector(".loading-container");
  const bootLines = document.querySelectorAll(".boot-line");
  const testExecution = document.querySelector(".test-execution");
  const testCases = document.querySelectorAll(".test-case");
  const testSummary = document.querySelector(".test-summary");
  const summaryLines = document.querySelectorAll(".test-summary .summary-line");
  const finalStatus = document.querySelector(".final-status");
  const systemLoad = document.querySelector(".system-load");
  const progressFill = document.querySelector(".progress-fill");
  const loadPercentage = document.querySelector(".load-percentage");

  // Hide everything initially
  bootLines.forEach((line) => {
    line.style.opacity = "0";
    line.style.transform = "translateX(-10px)";
  });
  testExecution.style.opacity = "0";
  testCases.forEach((tc) => {
    tc.style.opacity = "0";
    tc.style.transform = "translateX(-10px)";
  });
  summaryLines.forEach((line) => (line.style.opacity = "0"));
  finalStatus.style.opacity = "0";
  finalStatus.style.transform = "scale(0.9)";
  systemLoad.style.opacity = "0";

  let currentStep = 0;
  const startTime = Date.now();

  // Sequential animation function
  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function showElement(el, duration = 300) {
    el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
    el.style.opacity = "1";
    el.style.transform = "translateX(0) scale(1)";
  }

  async function runSequence() {
    // Phase 1: Boot lines appear one by one
    for (const line of bootLines) {
      await showElement(line, 200);
      await sleep(300 + Math.random() * 200); // Random delay for realism
    }

    await sleep(400);

    // Phase 2: Show test execution section
    testExecution.style.transition = "opacity 0.4s ease";
    testExecution.style.opacity = "1";
    await sleep(500);

    // Phase 3: Test cases pass one by one
    for (const testCase of testCases) {
      await showElement(testCase, 250);
      await sleep(400 + Math.random() * 300); // Simulate test running
    }

    await sleep(300);

    // Phase 4: Show summary
    for (const line of summaryLines) {
      line.style.transition = "opacity 0.3s ease";
      line.style.opacity = "1";
      await sleep(200);
    }

    await sleep(300);

    // Phase 5: Show system load progress
    systemLoad.style.transition = "opacity 0.4s ease";
    systemLoad.style.opacity = "1";

    // Animate progress bar
    let progress = 0;
    const progressDuration = 1500;
    const progressStart = Date.now();

    await new Promise((resolve) => {
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - progressStart;
        progress = Math.min((elapsed / progressDuration) * 100, 100);
        progressFill.style.width = `${progress}%`;
        loadPercentage.textContent = `${Math.floor(progress)}%`;

        if (progress >= 100) {
          clearInterval(progressInterval);
          resolve();
        }
      }, 30);
    });

    await sleep(300);

    // Phase 6: Show final status
    await showElement(finalStatus, 400);
    await sleep(800);

    // Phase 7: Fade out everything and redirect
    loadingContainer.style.transition = "opacity 0.6s ease";
    loadingContainer.style.opacity = "0";

    await sleep(700);

    // Redirect to home
    window.location.href = "home.html";
  }

  // Start the sequence
  runSequence();

  // Optional: Add keyboard shortcut to skip loading (for development)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      // Skip to main page
      document.body.classList.add("fade-out");
      setTimeout(() => {
        window.location.href = "home.html";
      }, 400);
    }
  });

  // Optional: Click anywhere to skip (for mobile/touch devices)
  let clickTimeout;
  document.body.addEventListener("click", () => {
    clearTimeout(clickTimeout);
    clickTimeout = setTimeout(() => {
      // Only skip if loading has been visible for at least 2 seconds
      const elapsed = Date.now() - startTime;
      if (elapsed > 2000) {
        document.body.classList.add("fade-out");
        setTimeout(() => {
          window.location.href = "home.html";
        }, 400);
      }
    }, 300); // Debounce clicks
  });

  // Add glitch effect to system name (optional cool effect)
  const systemName = document.querySelector(".system-name");
  if (systemName) {
    setInterval(() => {
      if (Math.random() > 0.95) {
        // 5% chance every interval
        systemName.style.textShadow =
          "2px 2px var(--green), -2px -2px var(--blue)";
        setTimeout(() => {
          systemName.style.textShadow = "0 0 10px var(--green-glow)";
        }, 50);
      }
    }, 100);
  }

  // Console easter egg
  console.log(
    "%c╔═══════════════════════════════════════╗",
    "color: #3fb950; font-weight: bold;"
  );
  console.log(
    "%c║   QA SYSTEM INITIALIZED              ║",
    "color: #3fb950; font-weight: bold;"
  );
  console.log("%c║   Playwright Test Suite: PASSED      ║", "color: #3fb950;");
  console.log("%c║   Portfolio Status: READY            ║", "color: #3fb950;");
  console.log(
    "%c╚═══════════════════════════════════════╝",
    "color: #3fb950; font-weight: bold;"
  );
  console.log(
    "%c\nPress SPACE or ENTER to skip loading animation",
    "color: #8b949e; font-style: italic;"
  );
});
