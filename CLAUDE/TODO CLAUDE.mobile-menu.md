# Mobile menu
The menu in the mobile version is not up to standards. It needs a modern look-and feel.

# Context
Tabuh Studio has a different screen layout for small screens (mobile phones, tablets). The interface looks clean and modern. However the hamburger menu looks somewhat clumsy. 

# Requirements
- Instead of a hamburger menu containing the main options I would like a menu at the bottom of the screen, similar to modern mobile apps. See file `Mobile Interface example.jpg` in folder `Mobile interface docs` for an example. This is the user interface of the VLC app. It has the main menu on the bottom, with options `Video`, `Audio`, `Browse` etc.
- This bottom menu should contain the options `Player`, `Browse`, `Focus` and `Speed`. Each menu option should open a view that fills the entire screen area above the bottom menu.
	- The `Player` option should display the player view.
	- The `Browse` option should present a scrollable/selectable list of the available scores in the database. The current notation should be shown as selected.  The user should be able to select a notation in the list.
	- The `Focus` option should present the focus options and highlight the current focus (if any). The user should be able to select another focus value.
	- The `Speed` option should enable the user to select a new speed. The current speed should be highlighted.
- There should be enough room in the bottom menu to add a `More` option in the future.
