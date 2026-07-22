# Refactor the new-copy-delete functionality of the system's SummaryItem toolbar.

## Context

The SummaryItem contains a group of buttons to create, copy and delete a system. The way these functionalities are presented can be confusing for the user.

## New requirements

The three SummaryItems `new`, `copy` and `delete` should be replaced with a hamburger menu. The image below shows the current and required lay-out for the SymmaryItem.

![image](./System%20menu.png)

### Functionality of the new menu items

Each menu item should present the user with one or more options as described below.

** new... **
Adds a new empty system.
options:
- `before` or `after` the current system

** copy from... **
Adds a copy of a system.
options:
- `system`: a list of systems from which the user can select the copy source.
- `before` or `after` the current system.
- `copy what`:
	- `entire system`: copy all attributes except `label`. uuid should be assigned a unique value.
	- `staffs`: does not copy execution items.
	- `positions`: copies the position groups and staffs and clears the notation.

** move... **
Moves the current system within the list of systems.
options:
- `before` or `after`: indicates where to move the current system relative to the target system.
- `system`: a list of systems from which the user can select the target system.

** delete... **
Removes the current system.
options:
- `are you sure?`: Yes or Cancel

#### Additional remarks
- Function `systemSelectorOptions` can be used to create a user-friendly list of all systems. The list displays system labels if available.
- To execute the actions, use function `executeItemAction`. This is a property of `SystemNode` which points to function `updateScoreFromItemAction` of the `useScoreManager` hook. This hook will also take care of re-assigning the `id` and `index` properties of all systems after the update.