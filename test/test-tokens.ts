import tokenService from '../services/token.service.js';

async function testTokenService() {
    try {
        // console.log('Starting token service test...');
        const tokens = await tokenService.loadTokens();

        // console.log('\nSample of loaded tokens:');
        // console.log({
        //   total: tokens.length,
        //   sample: tokens.slice(0, 5)
        // });

        // console.log(`\nTotal tokens loaded: ${tokens.length}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

testTokenService(); 