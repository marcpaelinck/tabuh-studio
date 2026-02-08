# Tabuh Editor View

## Structure

- **TabuhEditor**
    - **Dashboard** - _Status icons displayed above the editor_
    - **TabuhEditorMenu**
    - **EditorWindow** - _Generates foldable panels, each disclosing one System_
        - **PlaybackButtons** - _The play buttons in each panel header_
            - **AudioFunctions** - _Context containing audio functions for the current system_
        - **PartIndicator** - _Provides highlighting of named parts in the score._
            - usePartManager - _Handles the user interaction with the PartIndicator_
        - **SummaryItem** - _Displays (editable) summary info in the panel header above each system grid_
            - **ExecutionForm** - _Used for input of `goto`, `tempo` and `dynamics` directives_
        - **SystemNode** - _Creates the grid of cells for each System, within a panel_
            - **NavigationFunctions** - _Context containing keyboard navigation functions across the system (e.g. move
              cursor to first/last measure)_
            - **StaffNode** - _A row in a system grid, containing the notation for a single instrument position_
                - **MeasureNode** - _A single cell of the grid_
                    - useKeyboardListener - _manages the cursor behavior within cells and navigation between cells_
