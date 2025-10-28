const {
    commonFunctions,
} = global;
const requestPromise = require('request-promise');
var commonSettings = require('./../../config/settings.json')
module.exports = (app) => {
    app.post('/product-listing-shop', async (req, res) => {
        console.log("req from listing", req.body)
        let shop = req.body.shop
        let accessToken = req.body.accessToken
        let options = {
            method: 'GET',
            uri: "https://" + shop + "/admin/product_listings/count.json",
            json: true,
            resolveWithFullResponse: true,
            headers: {
                'X-Shopify-Access-Token':accessToken,
                'content-type': 'application/json'
            }
        };
        let productListing = await requestPromise(options)
        console.log("productListing", productListing.body)
        res.send(productListing.body)
    });

    app.get('/get-common-settings', async(req, res)=>{
        res.send(commonSettings)
    })
};