import tokenService from '../services/token.service.js';

async function testTokenService() {
    try {
        console.log('Starting token service test...');
        const tokens = await tokenService.loadTokens();
        console.log('\nSample of loaded tokens:');
        tokens.slice(0, 5).forEach(token => {
            console.log({
                exchange: token.exchange,
                tokenNumber: token.tokenNumber,
                strike: token.strike,
                type: token.type,
                ltp: token.ltp
            });
        });
        console.log(`\nTotal tokens loaded: ${tokens.length}`);
    } catch (error) {
        console.error('Error testing token service:', error);
    }
}

testTokenService(); 