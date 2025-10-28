const requestPromise = require('request-promise');

module.exports = () => {

createStore = (store) =>{
    let options = {
        method: 'POST',
        uri: "http://localhost:8000/api/v1/web/accounts/create-account",
        json: true,
        resolveWithFullResponse: true,//added this to view status code
        headers: {
            'content-type': 'application/json',
        },
        body: store
    };

    requestPromise.post(options)
        .then((response) => {
            res.send(response.body)
        })
        .catch((err) => {
            res.send("Catch error", err);
        })
}

}