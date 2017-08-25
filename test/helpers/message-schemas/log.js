module.exports = {
    properties: {
        e: {
            type: 'string'
            , required: true
            , pattern: 'l'
        }, t: {
            type: 'number'
            , required: true
            , pattern: '1'
        }, l: {
            type: 'string'
            , required: true
        }, f: {
            type: 'string'
            , required: true
        }
    }, additionalProperties: false
};
