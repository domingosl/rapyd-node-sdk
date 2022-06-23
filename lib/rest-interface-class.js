module.exports = class RestInterface {

    constructor(rootContext, createEndpoint, readEndpoint, editEndpoint, listEndpoint, deleteEndpoint) {

        this.rootContext = rootContext;

        this.isPublic = { create: false, read: false, edit: false, list: false, delete: false };

        this.forceFullResponse = false;

        this.createEndpoint = createEndpoint;
        this.readEndpoint = readEndpoint;
        this.editEndpoint = editEndpoint;
        this.listEndpoint = listEndpoint;
        this.deleteEnpoint = deleteEndpoint;

    }

    setPublic(options) {
        this.isPublic = {...this.isPublic, options};
        return this;
    }

    setForceFullResponse() {
        this.forceFullResponse = true;
        return this;
    }

    async create() {

        let response;

        if(arguments.length === 1)
            response = await this.rootContext.makeRequest(this.createEndpoint, 'POST', arguments[0], this.isPublic.create, this.forceFullResponse);
        else
            response = await this.rootContext.makeRequest(prepareURL(this.createEndpoint, arguments[0]), 'POST', arguments[1], this.isPublic.create, this.forceFullResponse);

        this.forceFullResponse = false;
        return response;

    }

    async read(urlParams = [], queryParams = null) {

        const response = await this.rootContext.makeRequest(prepareURL(this.readEndpoint, urlParams, queryParams), 'GET', null, this.isPublic.read, this.forceFullResponse);
        this.forceFullResponse = false;
        return response;

    }

    async list(urlParams = [], queryParams = null) {

        const response = await this.rootContext.makeRequest(prepareURL(this.listEndpoint, urlParams, queryParams), 'GET', null, this.isPublic.list, this.forceFullResponse);
        this.forceFullResponse = false;
        return response;

    }

    async update(urlParams = [], payload = {}) {

        const response = await this.rootContext.makeRequest(prepareURL(this.editEndpoint || this.readEndpoint, urlParams), 'PUT', payload, this.isPublic.update, this.forceFullResponse);
        this.forceFullResponse = false;
        return response;

    }

    async delete(urlParams) {

        const response = await this.rootContext.makeRequest(prepareURL(this.deleteEnpoint, urlParams), 'DELETE', null, this.isPublic.delete, this.forceFullResponse);
        this.forceFullResponse = false;
        return response;

    }
};

const prepareURL = (url, _urlParams, _queryParams) => {

    let params;
    if(typeof _urlParams === 'string')
        params = [_urlParams];
    else
        params = _urlParams;

    let res = url.replace(/{(\d+)}/g, function (match, number) {
        return typeof params[number] !== 'undefined'
            ? params[number]
            : match
            ;
    });

    if(_queryParams)
        res += '?' + serialize(_queryParams);

    return res;

};

const serialize = (obj) => {
    const str = [];

    for (let p in obj)
        if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }

    return str.join("&");
}