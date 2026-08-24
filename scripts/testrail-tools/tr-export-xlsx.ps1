<#
.SYNOPSIS
  Convert a CSV export to styled XLSX (needs Python openpyxl).
.EXAMPLE
  .\tr-export-xlsx.ps1 -CsvPath audit-all.csv -XlsxPath audit.xlsx
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$CsvPath,
    [Parameter(Mandatory)][string]$XlsxPath,
    [string]$SheetName = 'Sheet1'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $CsvPath)) {
    throw "CSV not found: $CsvPath"
}

$pyScript = Join-Path $env:TEMP 'qa-tr-export-xlsx.py'
@'
import csv, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

csv_path, xlsx_path, sheet_name = sys.argv[1], sys.argv[2], sys.argv[3]
rows = list(csv.DictReader(open(csv_path, encoding='utf-8-sig')))
if not rows:
    raise SystemExit('CSV has no rows')

headers = list(rows[0].keys())
wb = Workbook()
ws = wb.active
ws.title = sheet_name[:31]
ws.append(headers)

header_fill = PatternFill('solid', fgColor='1F4E79')
header_font = Font(color='FFFFFF', bold=True)
for col in range(1, len(headers) + 1):
    c = ws.cell(1, col)
    c.fill = header_fill
    c.font = header_font

for r in rows:
    ws.append([r.get(h, '') for h in headers])

for idx, h in enumerate(headers, 1):
    width = min(max(len(h), 12), 60)
    ws.column_dimensions[get_column_letter(idx)].width = width

ws.freeze_panes = 'A2'
ws.auto_filter.ref = f'A1:{get_column_letter(len(headers))}{ws.max_row}'
wb.save(xlsx_path)
print(f'Wrote {xlsx_path} rows={len(rows)} cols={len(headers)}')
'@ | Set-Content -Path $pyScript -Encoding UTF8

python $pyScript $CsvPath $XlsxPath $SheetName
if ($LASTEXITCODE -ne 0) {
    throw 'Python openpyxl export failed. Install: pip install openpyxl'
}
