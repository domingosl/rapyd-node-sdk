const axios = require('axios');
const CryptoJS = require('crypto-js');
const EventEmitter = require('events');

const RestInterface = require('./rest-interface-class');

const baseURLTplDev = "https://sandboxapi.rapyd.net";
const baseURLTplProd = "https://api.rapyd.net";


module.exports = class Rapyd {

    constructor(accessKey, secretKey, env) {

        this.accessKey = accessKey;
        this.secretKey = secretKey;

        this.env = env.toLowerCase();

        this.credentials = {
            token: null,
            expiresAt: null
        };

        this.baseURL = env === 'production' ? baseURLTplProd : env === 'sandbox' ?
            baseURLTplDev : null;

        if(!this.baseURL) throw new Error('Invalid environment');

        class Emitter extends EventEmitter {}

        this.events = new Emitter();

        //API METHODS
        this.Data = {
            Countries: new RestInterface(this, null, null, null, '/v1/data/countries')
        };

        this.Identities = {
            Types: new RestInterface(this, null, null, null, '/v1/identities/types')
        }

        this.Wallets = new RestInterface(this, '/v1/user', '/v1/user/{0}', '/v1/user');
        this.WalletTransactions = new RestInterface(this, null, '/v1/user/{0}/transactions');
        this.WalletTransactionDetails = new RestInterface(this, null, '/v1/user/{0}/transactions/{1}');

        this.Checkout = new RestInterface(this, '/v1/checkout', '/v1/checkout/{0}');
        this.Customers = new RestInterface(this, '/v1/customers', '/v1/customers/{0}');

        this.Transfers = new RestInterface(this, '/v1/account/transfer', '/v1/user/{0}/transaction/{1}');
        this.TransferResponse = new RestInterface(this, '/v1/account/transfer/response');

        this.Payouts = {
            SupportedMethods: (beneficiaryCountry, beneficiaryEntityType, payoutCurrency, category) =>
                new RestInterface(this, null,
                    '/v1/payouts/supported_types?beneficiary_country=' +
                    beneficiaryCountry + '&category=' +
                    category + '&beneficiary_entity_type=' +
                    beneficiaryEntityType +
                    '&payout_currency=' +
                    payoutCurrency),
            RequiredFields:
                (senderCountry, beneficiaryCountry, senderEntityType, beneficiaryEntityType, payoutAmount, payoutCurrency) =>
                    new RestInterface(this, null, '/v1/payouts/{0}/details' +
                        '?beneficiary_country=' + beneficiaryCountry +
                        '&beneficiary_entity_type=' + beneficiaryEntityType +
                        '&payout_amount=' + payoutAmount +
                        '&payout_currency=' + payoutCurrency +
                        '&sender_country=' + senderCountry +
                        '&sender_currency=' + payoutCurrency +
                        '&sender_entity_type=' + senderEntityType),
            Beneficiaries: new RestInterface(this, '/v1/payouts/beneficiary', '/v1/payouts/beneficiary/{0}'),
            Bankwire: new RestInterface(this, '/v1/payouts', '/v1/payouts/{0}')
        };

        this.Payments = new RestInterface(this, null, '/v1/payments/{0}');

        this.Issuing = {
            BankAccounts: new RestInterface(this,
                '/v1/issuing/bankaccounts',
                '/v1/issuing/bankaccounts/{0}',
                null,
                '/v1/issuing/bankaccounts/list'),
            SimulatedBankAccountTransfer: new RestInterface(this, '/v1/issuing/bankaccounts/bankaccounttransfertobankaccount'),
            BankAccountsCapabilities: new RestInterface(this, null, '/v1/issuing/bankaccounts/capabilities/{0}')
        };

        this.Refunds = new RestInterface(this, '/v1/refunds');

    };

    async makeRequest(endpoint, method, payload) {

        const me = this;

        try {

            const query = (method === 'GET' && payload ? '?' + me._serialize(payload) : '')
            const url = me.baseURL + endpoint + query;

            me.events.emit('log', 'debug', "New Rapyd API request", { endpoint, method, payload: payload || {} });

            const response = await axios({
                headers: me._getHeaders({
                    data: method === 'GET' ? null : payload,
                    url,
                    method,
                    endpoint: endpoint + query
                }),
                url,
                method,
                data: payload,
                timeout: 15000
            });

            if (!response.data || response.data.error)
                return Promise.reject();

            me.events.emit('log', 'debug', "Response from Rapyd", {response: response.data});

            return response.data;
        } catch (error) {
            return Promise.reject(error.response ? error.response.data : error);
        }

    };

    _serialize(obj) {
        const str = [];

        for (let p in obj)
            if (obj.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            }

        return str.join("&");
    }

    _getHeaders(request) {

        const headers = {};

        headers['Content-Type'] = 'application/json';

        headers['timestamp'] = (Math.floor(new Date().getTime() / 1000) - 10).toString();

        headers['salt'] = CryptoJS.lib.WordArray.random(12).toString();

        const body = request.data ? JSON.stringify(request.data) : '';

        const toSign = request.method.toLowerCase() + request.endpoint + headers['salt'] + headers['timestamp'] + this.accessKey + this.secretKey + body;

        const rapyd_signature = CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(toSign, this.secretKey));
        headers['signature'] = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(rapyd_signature));

        headers['access_key'] = this.accessKey;

        return headers;

    }

};