# Structure

- TabuhEditor
    - Menu
    - EditorWindow - _Generates foldable panels, each disclosing one System_
        - SystemContextMenu - _Appears when user right-clicks on a panel header_
        - PlaybackButtons - _The play buttons in each panel header_
        - SystemNode - _Creates the grid of cells for each System, within a panel_
            - SystemSummary - _Displays summary info and control buttons in the panel header above each system grid_
                - PlaybackButtons - _Buttons for immediate playback_
            - StaffNode - _A row in a system grid, containing the notation for a single instrument position_
                - MeasureNode - _A single cell of the grid_
                    - useKeyboardListener - _manages the cursor behavior within cells and navigation between cells_
