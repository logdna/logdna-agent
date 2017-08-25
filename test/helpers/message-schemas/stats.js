module.exports = {
    properties: {
        e: {
            type: 'string'
            , required: true
            , pattern: 's'
        }, m: {
            type: 'object'
            , required: true
            , additionalProperties: false
            , properties: {
                heapTotal: {
                    type: 'number'
                    , required: true
                }, heapUsed: {
                    type: 'number'
                    , required: true
                }, rss: {
                    type: 'number'
                    , required: true
                }
            }
        }
    }, additionalProperties: false
};
