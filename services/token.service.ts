import fs from 'fs';
import csvParser from 'csv-parser';

interface Token {
  exchange: string;
  tokenNumber: string;
  strike?: number;
  type?: string;
  ltp: number;
}

interface ExpiryData {
  ce: { [key: string]: { token: string } };
  pe: { [key: string]: { token: string } };
}

interface IndexData {
  expiries: Array<{ year: number; month: number; day: number }>;
  [key: string]: any;
}

interface ScripMasterData {
  [key: string]: IndexData;
}

class TokenService {
  private tokens: Token[] = [];
  private readonly jsonPath = "C:\\Users\\Lenovo\\Desktop\\programming\\src_typescript\\reference\\scripMasterData.json";
  private readonly csvPath = "C:\\Users\\Lenovo\\Desktop\\programming\\src_typescript\\Upstox_Scripmaster.csv";
  private readonly indexes = ['BANKNIFTY', 'NIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'BANKEX', 'SENSEX'];

  private getScripMasterData(): ScripMasterData {
    return JSON.parse(fs.readFileSync(this.jsonPath, 'utf8'));
  }

  private getOptionTokens(indexName: string): Token[] {
    const scripMasterData = this.getScripMasterData();

    if (!scripMasterData[indexName]) {
      console.error(`Index ${indexName} not found in script master data`);
      return [];
    }

    const indexData = scripMasterData[indexName];
    const tokens: Token[] = [];
    const missingExpiries: string[] = [];

    const exchange = indexName === 'BANKEX' || indexName === 'SENSEX' ? 'BSE_FO' : 'NSE_FO';

    const sortedExpiries = [...indexData.expiries].sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateA.getTime() - dateB.getTime();
    });

    sortedExpiries.forEach((expiry, idx) => {
      const month = expiry.month.toString().padStart(2, '0');
      const day = expiry.day.toString().padStart(2, '0');
      const expiryKey = `${day}-${month}-${expiry.year}`;
      const expiryData = indexData[expiryKey] as ExpiryData;

      if (!expiryData || !expiryData.ce || !expiryData.pe) {
        missingExpiries.push(expiryKey);
        return;
      }

      const allStrikes = Object.keys(expiryData.ce)
        .map(Number)
        .sort((a, b) => a - b);

      if (allStrikes.length === 0) {
        console.warn(`No strikes found for ${indexName} at expiry ${expiryKey}`);
        return;
      }

      const middleIndex = Math.floor(allStrikes.length / 2);
      const strikesToGet = idx === 0 ? 40 : 20;
      const startIdx = Math.max(0, middleIndex - strikesToGet);
      const endIdx = Math.min(allStrikes.length - 1, middleIndex + strikesToGet);
      const selectedStrikes = allStrikes.slice(startIdx, endIdx + 1);

      selectedStrikes.forEach((strike) => {
        const strikeStr = strike.toString();
        if (expiryData.ce[strikeStr]) {
          tokens.push({
            exchange,
            tokenNumber: expiryData.ce[strikeStr].token,
            strike: strike,
            type: 'CE',
            ltp: 0
          });
        }
      });

      selectedStrikes.forEach((strike) => {
        const strikeStr = strike.toString();
        if (expiryData.pe[strikeStr]) {
          tokens.push({
            exchange,
            tokenNumber: expiryData.pe[strikeStr].token,
            strike: strike,
            type: 'PE',
            ltp: 0
          });
        }
      });
    });

    if (missingExpiries.length > 0) {
      console.warn(`Missing expiries for ${indexName}:`, missingExpiries);
    }

    return tokens;
  }

  async loadTokens(): Promise<Token[]> {
    console.log("Loading tokens from JSON and CSV files");
    
    // Get option tokens for all indexes
    const allTokens: Token[] = [];
    this.indexes.forEach(indexName => {
      const indexTokens = this.getOptionTokens(indexName);
      console.log(`Loaded ${indexTokens.length} tokens for ${indexName}`);
      allTokens.push(...indexTokens);
    });

    console.log(`Total tokens before LTP update: ${allTokens.length}`);

    // Fetch LTP values from CSV
    return new Promise((resolve, reject) => {
      const results: any[] = [];

      fs.createReadStream(this.csvPath)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          console.log(`Loaded ${results.length} records from CSV`);
          
          let matchedCount = 0;
          allTokens.forEach(token => {
            const match = results.find(row => 
              row.exchange_token === String(token.tokenNumber) && 
              row.exchange === token.exchange
            );
            if (match) {
              token.ltp = parseFloat(match.last_price) || 0;
              matchedCount++;
            }
          });

          console.log(`Matched ${matchedCount} tokens with LTP values`);
          this.tokens = allTokens;
          resolve(allTokens);
        })
        .on('error', (error: Error) => {
          console.error('Error reading CSV file:', error);
          reject(error);
        });
    });
  }

  getTokens(): Token[] {
    return this.tokens;
  }

  getTokenByNumber(tokenNumber: string): Token | undefined {
    return this.tokens.find(token => token.tokenNumber === tokenNumber);
  }
}

export default new TokenService(); 