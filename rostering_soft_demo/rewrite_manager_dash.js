const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/dashboard/ManagerDashboard.tsx', 'utf8');

// Rename component
code = code.replace(/export default function DispatchPage\(\) \{/, 'export default function ManagerDashboard() {');

// Add designations to state
code = code.replace(
  /const \[rosterGroups, setRosterGroups\] = useState<RosterGroup\[\]>\(\[\]\);/,
  `const [rosterGroups, setRosterGroups] = useState<RosterGroup[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [filterDesigId, setFilterDesigId] = useState<string>('');`
);

// Add to fetch
code = code.replace(
  /const rgRes = await supabase\.from\('roster_groups'\)\.select\('\*'\);/,
  `const rgRes = await supabase.from('roster_groups').select('*');\n      const desigRes = await supabase.from('designations').select('*');`
);
code = code.replace(
  /setRosterGroups\(\(rgRes\.data \|\| \[\]\) as RosterGroup\[\]\);/,
  `setRosterGroups((rgRes.data || []) as RosterGroup[]);\n    setDesignations((desigRes?.data || []) as any[]);`
);

// Force viewMode and remove toggles
code = code.replace(
  /const \[viewMode, setViewMode\] = useState<DispatchViewMode>\('planned'\);/,
  `const viewMode = 'dispatch';`
);

// Filter by designation instead of roster groups
code = code.replace(
  /if \(filterRgIds\.length > 0\) result = result\.filter\(e => e\.roster_group_id && filterRgIds\.includes\(e\.roster_group_id\)\);/,
  `if (filterDesigId) result = result.filter(e => e.designation_id === filterDesigId);`
);

// Remove the Planned / Dispatch toggle completely
code = code.replace(
  /<div className="flex items-center bg-slate-100 rounded-lg p-0\.5 gap-0\.5">[\s\S]*?<\/div>/,
  ''
);

// Replace Groups dropdown with Designation dropdown
code = code.replace(
  /<div className="relative min-w-\[220px\]">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
  `<div className="min-w-[180px]">
              <Select
                value={filterDesigId}
                onChange={e => setFilterDesigId(e.target.value)}
                className="bg-slate-50 border-border text-slate-900 text-xs h-8 rounded-lg"
              >
                <option value="" className="bg-white">All Designations</option>
                {designations.map(d => (
                  <option key={d.id} value={d.id} className="bg-white">{d.name}</option>
                ))}
              </Select>
            </div>
            </div>
            </div>`
);

// Remove "Draft Mode" / "Live Dispatch" indicator and publish buttons
code = code.replace(
  /<div className="flex items-center gap-3">[\s\S]*?<\/div>/,
  ''
);

// Remove Duty Pool
code = code.replace(
  /\{\/\* ── Duty Pool — always visible \*\/\}[\s\S]*?(?=\{\/\* ── Modals ── \*\/)/,
  ''
);

// Make canEdit false
code = code.replace(
  /const canEdit = useMemo\(\(\) => \{[\s\S]*?\}, \[role, delegations\]\);/,
  `const canEdit = false;`
);

fs.writeFileSync('src/app/(app)/dashboard/ManagerDashboard.tsx', code);
