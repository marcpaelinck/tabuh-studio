# Structure

- TabuhEditor
    - Menu
    - EditorWindow - _Generates foldable panels, each disclosing one System_
        - SystemContextMenu - _Appears when user right-clicks on a panel header_
        - PlaybackButtons - _The play buttons in each panel header_
        - SystemNode - _Creates the grid of cells for each System, within a panel_
            - StaffNode - _Creates one row of cells of the grid_
                - MeasureNode - _Single cell of the grid_
                    - useKeyboardListener - _manages the cursor behavior within cells and navigation between cells_
