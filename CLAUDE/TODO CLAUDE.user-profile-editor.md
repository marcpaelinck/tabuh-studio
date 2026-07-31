# User Profile Editor
The app lacks a mean for the user to manage their own profile.

# Requirements
- When the 'profile' logo (above the main menu) is clicked, a popup menu should appear with the following options.
	- `Login...` if the user is not logged in, otherwise `Logout`
	- `Create an account...`
	- `Edit my profile...`: only visible if the user is logged in
- The `Login...` option should open a login form similar to the current one, but in a drawer similar to that of the main menu `Notation - Open...`.
- The `Create profile...` should open a form requesting the user's first and last name, email address and password. There should be a second password field to confirm that the password is entered correctly. If both password fields differ, the field should display a warning. All fields should have a SchemaModel that checks for the correctness of the field input. The Form should have a `Register` and `Cancel` butten. If the user clicks `Register` and some field content is incorrect, a message should be displayed near the erroneous fields using the SchemaModel's default error check. There should also be a check that the email address is not in use by another registered user. Otherwise an email should be sent to the user's email address with a confirmation link with a limited validity period. If the confirmation link is clicked within the time limit, a new user should be created.
