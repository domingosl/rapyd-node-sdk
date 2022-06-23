require('dotenv').config()

const RapydAPIClient = require('../lib/index');

const rapydApiClient = new RapydAPIClient(process.env.RAPYD_ACCESS_KEY, process.env.RAPYD_SECRET_KEY, 'sandbox');

rapydApiClient.events.on('log', payload => console.log(payload));

const run = async () =>
{
    console.log(await rapydApiClient.Identities.Types.list());
}

run();