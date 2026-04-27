 1. Roster Planner Guide

  This guide is for users with roster_planner or system_admin roles. It covers the end-to-end process of managing the railway    
  rostering system.

  Core Workflow: The Setup Sequence

  To ensure the system works correctly, you must set up entities in this specific order:
  1. Departments $\rightarrow$ 2. Designations $\rightarrow$ 3. Roster Groups $\rightarrow$ 4. Duties $\rightarrow$ 5. Employees 

  ---
  Page-by-Page Details

  1. Staff Directory & Employees
  - Staff Directory (/users): Manage the "Network Access" accounts. Here you assign the Clearance Level (Role). Only users with  
  the correct role can access administrative pages.
  - Employees (/employees): Manage the actual professional records.
    - Key Fields: Employee ID, Joining Date, and Nearby Station (used for logistics).
    - Linking: Every employee must be linked to a Department, Designation, and Roster Group to appear correctly in the Dispatch  
  timeline.

  2. Organizational Structure
  - Departments (/departments): The highest level of organization (e.g., "Operations", "Maintenance").
  - Designations (/designations): Specific job roles (e.g., "Loco Pilot", "Station Master") linked to a Department.
  - Roster Groups (/roster-groups): Logical team groupings (e.g., "Mumbai Local Drivers"). These are critical because Roster     
  Rules (like max working hours) are often applied at the group level.

  3. Duty Management (/duties)
  - Creating Duties: Define the "What", "When", and "Where".
    - Timing & Route: For "Normal" or "Spare" duties, you must set the Sign-On/Off times and locations.
    - Duty Types: Categorize duties (e.g., Passenger, Freight, Leave).
  - Cascading Filters: Use the filter bar at the top to quickly find duties by Department $\rightarrow$ Roster Group.

  4. Roster Dispatch (/dispatch) — The Power Tool
  This is the heart of the system where you assign duties to staff.
  - Planned vs. Dispatch View:
    - Planned (Draft Mode): Where you build the roster. Changes are "Drafts" (amber color) and not visible to employees until    
  published.
    - Dispatch (Live Mode): Shows only "Confirmed" (emerald color) duties. This is the official live schedule.
  - The Timeline:
    - Drag-and-Drop: Drag a duty from the "Available Pool" at the bottom onto an employee's date cell.
    - Quick Actions: Right-click (or click) a cell to quickly assign a Weekly Off (WO), a Leave, or a Spare Duty.
    - Rule Violations: If a cell shows a red pulsing icon, hover over it to see why (e.g., "Insufficient rest: 6h 30m (Min:      
  12h)").
    - Gaps: The vertical badges between cells show the exact rest time between consecutive shifts.
  - Publishing: Once the draft is ready, click "Publish Roster" to convert all draft assignments into confirmed duties.

  5. Leave & Duty Management (/employee-requests)
  - Reviewing: View all pending requests from staff.
  - Processing: You can either Approve or Reject a request.
  - Feedback: Always provide a Planner Comment when rejecting a request so the employee knows why.

  ---

  Quick Summary Table

  ┌────────────────────────────┬─────────────────────────────────────────┬───────────────────────────────────────────────────┐   
  │            Goal            │               Where to go               │                    What to do                     │   
  ├────────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────────────────────┤   
  │ Check tomorrow's shift     │ Dashboard $\rightarrow$ Header Card     │ Look at Timing and Location                       │   
  ├────────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────────────────────┤   
  │ See full month schedule    │ Dashboard $\rightarrow$ Calendar/List   │ Switch view using the toolbar                     │   
  ├────────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────────────────────┤   
  │ Request a day off          │ Leave & Duty Mgt $\rightarrow$ New      │ Select 'Leave' $\rightarrow$ Date $\rightarrow$   │   
  │                            │ Request                                 │ Reason                                            │   
  ├────────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────────────────────┤   
  │ Swap a shift               │ Leave & Duty Mgt $\rightarrow$ New      │ Select 'Shift Change' $\rightarrow$ Target Duty   │   
  │                            │ Request                                 │                                                   │   
  ├────────────────────────────┼─────────────────────────────────────────┼───────────────────────────────────────────────────┤   
  │ See why a request was      │ Leave & Duty Mgt                        │ Check 'Planner Comment' on the request card       │   
  │ denied                     │                                         │                                                   │   
  └────────────────────────────┴─────────────────────────────────────────┴───────────────────────────────────────────────────┘