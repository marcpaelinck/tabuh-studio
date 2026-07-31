# Mobile Menu Makeover
The look-and-feel of the version for small screens (mobile, tablet) should be similar to that of modern Android and iOS apps.

# Context
Tabuh Studio has a different screen layout for small screens (mobile phones, tablets). The interface looks clean and modern. However the hamburger menu looks somewhat clumsy.

# Requirements
- Instead of a hamburger menu containing the main options I would like a menu at the bottom of the screen, similar to modern mobile apps. See file `Mobile Bottom Menu example.jpg` in folder `Mobile interface docs` for an example. This is the user interface of the VLC app. It has the main menu on the bottom, with options `Video`, `Audio`, `Browse` etc.
- The Tabuh Studio app should have a similar bottom containing the options `Player`, `Scores`, `Focus` and `Speed`. Each menu option should open a view that fills the entire screen area above the bottom menu.
	- The `Player` option should display the player view.
	- The `Browse` option should present a selection form similar to the recently modified 'Open...' menu item in the MainMenu: a selector for the orchestra and a scrollable list for the scores.
	- The `Focus` option should present the focus options in a scrollable list similar to that of the `Browse` option. When the user select a new focus value the view should switch back to the `Player` option.
	- The `Speed` selection form should be similar to the `Focus` form. Here also the view should switch back to `Player` after a selection.
- In the future it might be necessary to add a `More` item to the menu.
