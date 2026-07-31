# User Onboarding
The app has become fairly complex and might be daunting for new users. It requires information to guide the user's first steps. A 'guided tour' is an accessible way for a new user to get acquainted with the app's structure.

# CLAUDE's advice
I asked CLAUDE to advise me which package to use. This is CLAUDE's conclusion. 

The MIT-licensed, no-strings options are @reactour/tour, react-joyride, and driver.js. How they differ:

@reactour/tour — React-idiomatic: steps as a data array, JSX allowed in tooltip content, a useTour() hook. Nice if you want tour steps wired to your app's state/components.
driver.js — tiny (~5 kB, zero deps), framework-agnostic, imperative API. Dead simple highlight-and-step tours. Works fine in React, just not "component-y."
react-joyride — the most-installed React-specific one, mature and flexible, but historically lagged on peer-deps for new React majors, so confirm it declares React 19 support (or you'll be reaching for overrides).

For your app specifically — React 19 + Vite + TS, a focused editor where a guided "here's the menu, here's the toolbar, here's playback" walkthrough is all you likely need — I'd recommend driver.js for the least friction and smallest footprint, or @reactour/tour if you'd rather keep it fully in React with JSX step content and hooks. Both are MIT and clean on React 19. I'd avoid Intro.js purely on the licensing overhead, not the functionality.