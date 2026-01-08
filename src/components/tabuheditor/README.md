# Structure

- TabuhEditor
    - TabuhEditorMenu
    - EditorWindow - _Generates foldable panels, each disclosing one System_
        - SystemContextMenu - _Appears when user right-clicks on a panel header_
        - PlaybackButtons - _The play buttons in each panel header_
            - AudioFunctions - _Context containing audio functions for the current system_
        - SummaryItem - _Displays (editable) summary info in the panel header above each system grid_
        - SystemNode - _Creates the grid of cells for each System, within a panel_
            - NavigationFunctions - _Context containing keyboard navigation functions across the system (e.g. move
              cursor to first/last measure)_
            - StaffNode - _A row in a system grid, containing the notation for a single instrument position_
                - MeasureNode - _A single cell of the grid_
                    - useKeyboardListener - _manages the cursor behavior within cells and navigation between cells_
