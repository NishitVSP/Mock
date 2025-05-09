import fs from 'fs';
import csvParser from 'csv-parser';
import path from 'path';

type CsvRow = {
  instrument: string;
  name: string;
  expiryDate: string;
  lastPrice: string;
  // Add other columns if needed
};

const indexes = ['BANKNIFTY', 'NIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'BANKEX', 'SENSEX'];

interface IndexPrices {
  [key: string]: number;
}

const initialIndexPrices: IndexPrices = {
  BANKNIFTY: 45000,
  NIFTY: 22000,
  FINNIFTY: 20000,
  MIDCPNIFTY: 9000,
  BANKEX: 50000,
  SENSEX: 73000
};

let currentIndexPrices: IndexPrices = { ...initialIndexPrices };

export async function getIndexLastPrices(): Promise<IndexPrices> {
  try {
    const filePath = path.join(process.cwd(), 'ScripMaster.csv');
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
    const result: IndexPrices = { ...initialIndexPrices }; // Use initial prices as fallback
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
        currentIndexPrices[idx] = Number(nearestRow.lastPrice);
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching index prices:', error);
    return currentIndexPrices;
  }
}

export function updateIndexPrice(indexName: string, price: number): void {
  if (indexName in currentIndexPrices) {
    currentIndexPrices[indexName] = price;
  }
}