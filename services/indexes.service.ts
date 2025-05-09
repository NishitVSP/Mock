import fs from 'fs';
import csvParser from 'csv-parser';

type CsvRow = {
  instrument: string;
  name: string;
  expiryDate: string;
  lastPrice: string;
  // Add other columns if needed
};

const indexes = ['BANKNIFTY', 'NIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'BANKEX', 'SENSEX'];

export async function getIndexLastPrices(): Promise<Record<string, number>> {
  const filePath = 'C:/Users/Lenovo/Desktop/programming/src_typescript/ScripMaster.csv';
  const filteredRows: CsvRow[] = [];

  // Read and filter the CSV rows
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row: CsvRow) => {
        // Filter by instrument
        if (row.instrument === 'FUTIDX' || row.instrument === 'IF') {
          // Filter by index name
          if (indexes.includes(row.name)) {
            filteredRows.push(row);
          }
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  // Group by index name
  const grouped: Record<string, CsvRow[]> = {};
  for (const idx of indexes) {
    grouped[idx] = [];
  }
  for (const row of filteredRows) {
    grouped[row.name].push(row);
  }

  // Find nearest expiry row for each index
  const now = new Date();
  const result: Record<string, number> = {};
  for (const idx of indexes) {
    const rows = grouped[idx];
    if (rows.length === 0) continue;
    // Find row with nearest expiryDate >= now
    let nearestRow: CsvRow | null = null;
    let minDiff = Infinity;
    for (const row of rows) {
      const expiry = new Date(row.expiryDate);
      const diff = Math.abs(expiry.getTime() - now.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        nearestRow = row;
      }
    }
    if (nearestRow) {
      result[idx] = Number(nearestRow.lastPrice);
    }
  }

  return result;
}