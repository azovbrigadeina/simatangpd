# Workspace Rules - Proyek Simatang

## Deployment Workflow
Whenever code changes are made to this project:
1. Always push using `npx -y @google/clasp push -f`.
2. Create a new version with `V_NUM=$(npx -y @google/clasp version "<description>" | grep -oE '[0-9]+' | tail -n 1)`.
3. Deploy directly to the single primary active deployment ID `AKfycbzoScMV1ULBGAel1KHaebq7EPnz_u3m54HR3409liJgPi7qmNJ7k67rCifrkF8LJgtrgg`:
   `npx -y @google/clasp deploy -i "AKfycbzoScMV1ULBGAel1KHaebq7EPnz_u3m54HR3409liJgPi7qmNJ7k67rCifrkF8LJgtrgg" -V "$V_NUM" -d "Release @$V_NUM"`
