const express = require('express')
const app = express()

// Parameters ssl protocol
const fs = require('fs');
const https = require('https');
const port = 80

const requestPromise = require('request-promise');
var bodyParser = require('body-parser')
var commonSettings = require('./config/settings.json')
var commonFunctions = require('./lib/middleware/common')
const serverDBUrl = commonSettings.base_path;
global.commonFunctions = commonFunctions

app.use(express.static(__dirname, { dotfiles: 'allow' } ));

app.use(bodyParser.urlencoded({ extended: false }))
// express.static(root, [options])
app.use(express.static('public'))
// parse application/json
app.use(bodyParser.json())
app.use(function (req, res, next) {

    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", "Origin, Cache-Control, X-Requested-With, Content-Type, Accept, Authorization");
    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.send(200);
    } else {
        next();
    }

});

/** 
 * JavaScript comment 
 * @Author: Publio Quintero 
 * @Date: 2021-08-17 22:34:51 
 * @Desc: Adding certificates to enable ssl protocol 
 */
const privateKey = fs.readFileSync('/etc/letsencrypt/live/shopify.bebettertest.net/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/shopify.bebettertest.net/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/shopify.bebettertest.net/chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};
const httpsServer = https.createServer(credentials, app);

var routes = require('./controllers/v1/shopify');
var routes1 = require('./controllers/v1/app');
routes(app);
routes1(app);

app.get('/', (req, res) => {
    res.sendStatus(200);
})

/*app.get('/.well-known/acme-challenge/q5rzfruWQrNB_XGGXKzxSzoZI73OtLySzm_aATs0l8M', function(req,res){
	res.send('q5rzfruWQrNB_XGGXKzxSzoZI73OtLySzm_aATs0l8M.-OqklOlmEW2Ic3BnWi5rFXfuGx2_Wm70NIZvXTIKEGE')
})*/

app.post('/add-product-webhook', (req, res) => {
    let options = {
        method: 'GET',
        uri: serverDBUrl + "/api/v1/web/accounts/account-by-domain/" + req.headers['x-shopify-shop-domain'],
        json: true,
        resolveWithFullResponse: true,
        headers: {
            'content-type': 'application/json',
        }
    };

    requestPromise.get(options)
        .then((resp) => {
            let product = req.body.product_listing
            let options = {
                method: 'POST',
                uri: serverDBUrl + "/api/v1/web/products/create-single-product/" + resp.body.body.account.domain,
                json: true,
                resolveWithFullResponse: true,
                headers: {
                    'content-type': 'application/json',
                },
                body: {
                    product: product
                }
            };

            requestPromise.post(options)
                .then((response) => {
                    res.sendStatus(200);
                    // res.send(response.body)
                })
                .catch((err) => {
                    console.log("Error in inner Add Webhook", err);
                    res.status(400).send(err);
                })
        })
        .catch((err) => {
            console.log("Error in inner Add Webhook", err);
            res.status(400).send(err)
        })
})


app.post('/update-product-webhook', (req, res) => {
    let options = {
        method: 'GET',
        uri: serverDBUrl + "/api/v1/web/accounts/account-by-domain/" + req.headers['x-shopify-shop-domain'],
        json: true,
        resolveWithFullResponse: true,
        headers: {
            'content-type': 'application/json',
        }
    };

    requestPromise.get(options)
        .then((resp) => {
            let product = req.body.product_listing
            let options = {
                method: 'PUT',
                uri: serverDBUrl + "/api/v1/web/products/update-single-product/" + resp.body.body.account.domain,
                json: true,
                resolveWithFullResponse: true,
                headers: {
                    'content-type': 'application/json',
                },
                body: {
                    product: product
                }
            };

            requestPromise.put(options)
                .then((response) => {
                    res.sendStatus(200);
                    // res.send(response.body)
                })
                .catch((err) => {
                    console.log("Error in inner Update Webhook", err);
                    res.status(400).send(err);
                })
        })
        .catch((err) => {
            console.log("Error in inner Update Webhook", err);
            res.status(400).send(err)
        })
})


app.post('/delete-product-webhook', (req, res) => {
    let options = {
        method: 'GET',
        uri: serverDBUrl + "/api/v1/web/accounts/account-by-domain/" + req.headers['x-shopify-shop-domain'],
        json: true,
        resolveWithFullResponse: true,
        headers: {
            'content-type': 'application/json',
        }
    };

    requestPromise.get(options)
        .then((resp) => {
            let product = req.body.product_listing
            let options = {
                method: 'PUT',
                uri: serverDBUrl + "/api/v1/web/products/delete-from-store/" + product.product_id,
                json: true,
                resolveWithFullResponse: true,
                headers: {
                    'content-type': 'application/json',
                },
                body: {
                    deletedFromStore: true
                }
            };

            requestPromise.put(options)
                .then((response) => {
                    res.sendStatus(200);
                    // res.send(response.body)
                })
                .catch((err) => {
                    console.log("Error in inner Delete Webhook", err);
                    res.status(400).send(err);
                })
        })
        .catch((err) => {
            console.log("Error in outer Delete Webhook", err);
            res.status(400).send(err)
        })
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
httpsServer.listen(443);
