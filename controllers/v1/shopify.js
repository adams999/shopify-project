const crypto = require("crypto");
const cookie = require("cookie");
const querystring = require("querystring");
const nonce = require("nonce")();
var commonSettings = require("./../../config/settings.json");
const client = require('../../common/split');

const apiKey = commonSettings.shopify_api_key;
const apiSecret = commonSettings.shopify_secret_key;

const scopes =
   "read_products,write_orders,write_checkouts,read_checkouts,read_shipping,write_draft_orders,write_orders,read_content,write_shipping,read_product_listings";

const forwardingAddress = commonSettings.store_forwarding_address;
const webhookAddress = commonSettings.webhook_address;
const dashDomain = commonSettings.redirect_dashboard_url;
const privateIp = commonSettings.base_path;

const requestPromise = require("request-promise");
const axios = require("axios");
const stripe = require("stripe")(commonSettings.stripe_secret_key);
var stripeKey = commonSettings.stripe_secret_key;
var xAccessSimuStoreReal = "";
var storeName = "";
var stringify = require("qs-stringify");
var qs = require("qs");
var storeDetails = {
   userId: "",
   shop: "",
   accountType: "",
   accessToken: "",
};
var authToken = "";
const userId = "";
const accountType = "";
var checkoutToken = "";
var shippingCode = "202";
var fromShopify = "true";
var cappedAmount = commonSettings.capped_ammount;
let test = commonSettings.test;
module.exports = (app) => {
   app.get("/shopify", (req, res) => {
      //console.log(req.query)

      //  fromShopify = req.query.fromShopify

      //  if (fromShopify == "false") {
      //      storeDetails.accountType = req.query.accountType;
      //      storeDetails.userId = req.query.userId;
      //      authToken = 'Bearer ' + req.query.token;
      //      console.log("From Simustream====>", fromShopify)
      //  }
      //  if (fromShopify == "true") {
      //      console.log("From Shopify====>", fromShopify)
      //  }

      //  storeDetails.shop = req.query.store;
      storeName = req.query.store;

      //  const shop = storeDetails.shop ? storeDetails.shop : "simustream-12store.myshopify.com"
      const shop = req.query.shop;
		const userId = req.query.user;
      if (shop) {
         //const state = nonce();
         const redirectUri = forwardingAddress + "/shopify/callback";
         const installUrl =
            "https://" +
            shop +
            "/admin/oauth/authorize?client_id=" +
            apiKey +
            "&scope=" +
            scopes +
            // '&state=' + state +
            "&redirect_uri=" +
            redirectUri;

         //res.cookie('state', state);
         res.cookie('userId', userId);
         //res.cookie('accountType', storeDetails.accountType);
         //res.cookie('Authorization', authToken);
         //console.log("installUrl", installUrl)

         res.redirect(installUrl);
      } else {
         return res
            .status(400)
            .send(
               "Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request"
            );
      }
   });

   app.get("/shopify/callback", (req, res) => {
      console.log("------------------------------------");
      console.log("shopify call back  installed app");
      console.log("------------------------------------");
      const {
         shop,
         hmac,
         code,
         //state
      } = req.query;
      //  const stateCookie = cookie.parse(req.headers.cookie).state;
      //  const accountType = cookie.parse(req.headers.cookie).accountType;
      //  if (state !== stateCookie) {
      //      return res.status(403).send('Request origin cannot be verified');
      //  }

      if (shop && hmac && code) {
         //   res.status(200).send('Callback route');
         const map = Object.assign({}, req.query);
         delete map["signature"];
         delete map["hmac"];
         const message = querystring.stringify(map);
         const providedHmac = Buffer.from(hmac, "utf-8");
         const generatedHash = Buffer.from(
            crypto
               .createHmac("sha256", apiSecret)
               .update(message)
               .digest("hex"),
            "utf-8"
         );
         let hashEquals = false;
         // timingSafeEqual will prevent any timing attacks. Arguments must be buffers
         try {
            hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac);
            // timingSafeEqual will return an error if the input buffers are not the same length.
         } catch (e) {
            hashEquals = false;
         }

         if (!hashEquals) {
            return res.status(400).send("HMAC validation failed");
         }

         const accessTokenRequestUrl =
            "https://" + shop + "/admin/oauth/access_token";
         const accessTokenPayload = {
            client_id: apiKey,
            client_secret: apiSecret,
            code,
         };

         requestPromise
            .post(accessTokenRequestUrl, {
               json: accessTokenPayload,
            })
            .then((accessTokenResponse) => {
               console.log(
                  "accessTokenResponse App Installed ========>>>>>>>>",
                  accessTokenResponse
               );
               const accessToken = accessTokenResponse.access_token;
               storeDetails.accessToken = accessToken;
               //temporary, send accesstoken on every call later
               xAccessSimuStoreReal = accessToken;
               console.log("------------------------------------");
               console.log("Access token received > ", accessToken, shop);
               console.log("------------------------------------");

               const redirectAcceptChargeUri =
                  forwardingAddress + "/charge-accepted?shop=" + shop;
               let options3 = {
                  method: "POST",
                  uri:
                     "https://" +
                     shop +
                     "/admin/api/2019-04/recurring_application_charges.json",
                  json: true,
                  resolveWithFullResponse: true, //added this to view status code
                  headers: {
                     "X-Shopify-Access-Token": xAccessSimuStoreReal,
                     Host: shop,
                     "content-type": "application/json",
                     "Retry-After": 1,
                  },
                  body: {
                     recurring_application_charge: {
                        name: "Super Duper Plan",
                        price: 1.0,
                        return_url: redirectAcceptChargeUri,
                        test: true,
                        capped_amount: parseInt(cappedAmount),
                        terms: "$1 for 10 products",
                     },
                  },
               };

               requestPromise
                  .post(options3)
                  .then((response3) => {
                     res.cookie(
                        "recurringCharge",
                        response3.body.recurring_application_charge.id
                     );
                     res.cookie("accessToken", accessToken);
                     res.redirect(
                        response3.body.recurring_application_charge
                           .confirmation_url
                     );
                  })

                  .catch((error) => {
                     console.log("error", error);
                  });
            })
            .catch((error) => {
               res.status(error.statusCode).send(error.error.error_description);
            });
      } else {
         res.status(400).send("Required parameters missing");
      }
   });

   app.get("/charge-accepted", (req, res) => {
      //console.log("VARIABLES ================================================================\n", req.query.shop)
      const recurring_application_charge = cookie.parse(
         req.headers.cookie
      ).recurringCharge;
      const accessToken = cookie.parse(req.headers.cookie).accessToken;
      let chargeId = parseInt(recurring_application_charge);
      var userId = "";
      var authorizationToken = "";

      //  if (fromShopify == "false") {
      //      userId = cookie.parse(req.headers.cookie).userId;
      //      authorizationToken = cookie.parse(req.headers.cookie).Authorization;
      //      console.log('------------------------------------');
      //      console.log("From Simustream=======>>", userId, accountType, authorizationToken);
      //      console.log('------------------------------------');
      //  }

      storeName = req.query.shop;
      let options4 = {
         method: "GET",
         uri:
            "https://" +
            storeName +
            "/admin/api/2019-04/recurring_application_charges/" +
            chargeId +
            ".json",
         json: true,
         resolveWithFullResponse: true, //added this to view status code
         headers: {
            "X-Shopify-Access-Token": xAccessSimuStoreReal,
            Host: storeName,
            "content-type": "application/json",
            "Retry-After": 1,
         },
      };

      requestPromise
         .get(options4)
         .then((response4) => {
            console.log(
               "recurring_application_charges: ",
               response4.body.recurring_application_charge
            );
            let recurring_application_charge =
               response4.body.recurring_application_charge;
            let options5 = {
               method: "POST",
               uri:
                  "https://" +
                  storeName +
                  "/admin/api/2019-04/recurring_application_charges/" +
                  recurring_application_charge.id +
                  "/activate.json",
               json: true,
               resolveWithFullResponse: true, //added this to view status code
               headers: {
                  "X-Shopify-Access-Token": xAccessSimuStoreReal,
                  Host: storeName,
                  "content-type": "application/json",
                  "Retry-After": 1,
               },
               body: {
                  recurring_application_charge: {
                     id: recurring_application_charge.id,
                     name: recurring_application_charge.name,
                     api_client_id: recurring_application_charge.api_client_id,
                     price: recurring_application_charge.price,
                     status: "accepted",
                     return_url: recurring_application_charge.return_url,
                     billing_on: recurring_application_charge.billing_on,
                     created_at: recurring_application_charge.created_at,
                     updated_at: recurring_application_charge.updated_at,
                     test: recurring_application_charge.test,
                     activated_on: recurring_application_charge.activated_on,
                     cancelled_on: recurring_application_charge.cancelled_on,
                     trial_days: recurring_application_charge.trial_days,
                     trial_ends_on: recurring_application_charge.trial_ends_on,
                     decorated_return_url:
                        recurring_application_charge.decorated_return_url,
                  },
               },
            };

            requestPromise
               .post(options5)
               .then((response5) => {
                  const shopRequestUrl =
                     "https://" + storeName + "/admin/shop.json";
                  const shopRequestHeaders = {
                     "X-Shopify-Access-Token": accessToken,
                  };

                  requestPromise
                     .get(shopRequestUrl, {
                        headers: shopRequestHeaders,
                     })
                     .then((shopResponse) => {
                        console.log("------------------------------------");
                        console.log(
                           "From Simustream=======>>",
                           userId,
                           accountType,
                           authorizationToken
                        );
                        console.log("------------------------------------");

                        let data = {
                           method: "POST",
                           uri:
                              privateIp +
                              "/api/v1/web/accounts/create-account?fromShopify=" +
                              fromShopify,
                           json: true,
                           resolveWithFullResponse: true,
                           headers: {
                              "content-type": "application/json",
                              Authorization: authorizationToken,
                           },
                           body: {
                              domain: storeName,
                              title: "Simu Stream",
                              accountType: "shopify",
                              userId: cookie.parse(req.headers.cookie).userId, //"60ad48eaf37662197dc629b9",
                              accessToken: accessToken,
                              recurringApplicationChargeId:
                                 recurring_application_charge.id,
                           },
                        };

                        requestPromise
                           .post(data)
                           .then((response) => {
										console.log("Entramos aqui ======================================================\n")
                              console.log("response 1 ", response.body);
                              let options = {
                                 method: "GET",
                                 uri:
                                    "https://" +
                                    storeName +
                                    "/admin/product_listings.json",
                                 json: true,
                                 resolveWithFullResponse: true,
                                 headers: {
                                    "X-Shopify-Access-Token": accessToken,
                                    "content-type": "application/json",
                                 },
                              };

										

                              requestPromise
                                 .get(options)
                                 .then(function (products) {
                                    //console.log(
                                    //   "authorizationToken=============>>>>",
                                    //   authorizationToken
                                    //);
                                    console.log(
                                       "products=============>>>>",
                                       products.body
                                    );

                                    let options = {
                                       method: "POST",
                                       uri:
                                          privateIp +
                                          "/api/v1/web/products/create-products/" +
                                          storeName +
                                          "?fromShopify=" +
                                          fromShopify,
                                       json: true,
                                       //resolveWithFullResponse: false,
                                       headers: {
                                          "content-type": "application/json",
                                          // 'Authorization': authorizationToken
                                       },
                                       body: {
                                          products:
                                             products.body.product_listings,
                                       },
                                    };

												//console.log("options 396 ==============================================================\n", options)


                                    requestPromise
                                       .post(options)
                                       .then(async function (response) {
														console.log("PRODUCTS 402 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++", response)
                                          console.log(
                                             "------------------------------------"
                                          );
                                          console.log("In Webhook > ");
                                          console.log(
                                             "------------------------------------"
                                          );
                                          let addWebhook = await axios.get(
                                             forwardingAddress +
                                                "/register-add-webhook?accessToken=" +
                                                accessToken +
                                                "&shop=" +
                                                storeName
                                          );
                                          let updateWebhook = await axios.get(
                                             forwardingAddress +
                                                "/register-update-webhook?accessToken=" +
                                                accessToken +
                                                "&shop=" +
                                                storeName
                                          );
                                          let deleteWebhook = await axios.get(
                                             forwardingAddress +
                                                "/register-delete-webhook?accessToken=" +
                                                accessToken +
                                                "&shop=" +
                                                storeName
                                          );
                                          console.log(
                                             "------------------------------------"
                                          );
                                          // console.log("Webhook > ", addWebhook);
                                          console.log(
                                             "------------------------------------"
                                          );
                                          if (fromShopify == "false") {
                                             res.redirect(
                                                dashDomain + "/choose-products"
                                             );
                                          }
                                          if (fromShopify == "true") {
                                             res.redirect(
                                                "https://" +
                                                   storeName +
                                                   "/admin/apps"
                                             );
                                          }
                                       })
                                       .catch(function (err) {
                                          console.log("Error 452 ================================================================", err.body);
                                          //res.send(err);
                                       });
                                 })
                                 .catch(function (err) {
												console.log("Entramos en error 453 =======================================================================")
                                    //res.send(err);
                                 });
                           })
                           .catch((err) => {
                              console.log("error", err);
                              res.redirect(
                                 dashDomain +
                                    "/choose-products?message=Account already created"
                              );
                           });
                        //    await dbActions.createStore({title: shopResponse.shop.name, accountType: 'shopify', userId: "5ca0f43298a601236c651538", accessToken: accessToken});
                     })
                     .catch((error) => {
                        console.log("error", error);
                        res.send(error);
                     });
               })
               .catch((err5) => {
                  console.log("Recurring charge err3: ", err5);
                  res.send(err5);
               });
         })
         .catch((err4) => {
            console.log("Recurring charge err3: ", err4);
            res.send(err4);
         });
   });

   // TODO: Following APIs need to be removed/improved

   app.get("/product-list", (req, res) => {
      const shop = req.query.store
         ? req.query.store
         : "simustream-store.myshopify.com";
      let options = {
         method: "GET",
         uri: "https://" + shop + "/admin/product_listings.json",
         json: true,
         resolveWithFullResponse: true,
         headers: {
            "X-Shopify-Access-Token": req.query.accessToken
               ? req.query.accessToken
               : xAccessSimuStoreReal,
            "content-type": "application/json",
         },
      };

      requestPromise
         .get(options)
         .then(function (response) {
            // if (response.statusCode == 201) {
            console.log("------------------------------------");
            console.log(response);
            console.log("------------------------------------");
            res.json(response.body);
            // } else {
            //     res.json(false);
            // }
         })
         .catch(function (err) {
            console.log("------------------------------------");
            console.log("err", err);
            console.log("------------------------------------");
            res.json(false);
         });
   });

   app.post("/checkout", (req, res) => {
      // console.log("req.body.body.checkoutBody", req.body.body)
      // req.body.body.billing_address = req.body.body.shipping_address
      console.log(req.body.body.line_items);

      const shop = req.body.body.storeDetails.shop;
      const accessToken = req.body.body.storeDetails.accessToken;
      const cartItems = req.body.body.cartItems;
      const applyDiscount = req.body.body.applyDiscount;
      let checkoutObj = {};
      let options = {
         method: "POST",
         uri: "https://" + shop + "/admin/checkouts.json",
         json: true,
         resolveWithFullResponse: true, //added this to view status code
         headers: {
            "X-Shopify-Access-Token": accessToken,
            "content-type": "application/json",
         },
         body: {
            checkout: req.body.body,
         },
      };

      requestPromise
         .post(options)
         .then(async (response) => {
            let shipping = "";
            maxAttempts = 20;
            let shippingBody = {
               shippingResponse: response,
               shop: req.body.body.storeDetails.shop,
               accessToken: req.body.body.storeDetails.accessToken,
            };
            checkoutObj = shippingBody.shippingResponse.body;
            let shop = shippingBody.shop;
            let accessToken = shippingBody.accessToken;
            // if (checkoutObj.checkout.requires_shipping) {
            //     let options2 = {
            //         method: 'GET',
            //         uri: "https://" + shop + "/admin/checkouts/" + checkoutObj.checkout.token + "/shipping_rates.json",
            //         json: true,
            //         resolveWithFullResponse: true, //added this to view status code
            //         headers: {
            //             'X-Shopify-Access-Token': accessToken,
            //             'content-type': 'application/json',
            //             'Location': "https://" + shop + "/admin/checkouts/" + checkoutObj.checkout.token + "/shipping_rates.json",
            //         }
            //     };
            //     for (let i = 0; i < maxAttempts; i++) {
            //         shipping = await requestPromise.get(options2)
            //         if (shipping.statusCode == "200") {
            //             break;
            //         }
            //     }
            //     if (shipping.body.shipping_rates.length) {
            //         res.send({
            //             shipping_rates: shipping.body.shipping_rates,
            //             checkout: checkoutObj.checkout,
            //             status: shipping.statusCode,
            //             testCheckout: shipping.body

            //         });
            //     }
            //     if (shipping.statusCode == "200" && !shipping.body.shipping_rates.length) {
            //         res.send({
            //             shipping_rates: "Shipping not available right now. Please try later.",
            //             checkout: checkoutObj.checkout,
            //             status: shipping.statusCode
            //         });
            //     }

            // } else {
            res.send({
               checkout: checkoutObj.checkout,
               // message: "No shipping required.",
               // status: shipping.statusCode
            });
            // }
         })
         .catch((error) => {
            var keyNames = Object.keys(error.error.errors);
            let errorMessage = "";
            let faultyMessages = [];
            let faultyProducts = [];
            let outOfStockProducts = [];
            let emailValidated = false;
            let shippingValidated = false;
            let lineItemsValidated = false;
            console.log("KeyNames====>>>>", keyNames);
            keyNames.forEach((key, keyIndex) => {
               if (keyNames[keyIndex] == "email" && !emailValidated) {
                  let errorValues = error.error.errors.email;
                  errorValues.forEach((el) => {
                     errorMessage += "<p>" + "Email " + el.message + ".</p>";
                  });
                  emailValidated = true;
               }
               if (
                  keyNames[keyIndex] == "shipping_address" &&
                  !shippingValidated
               ) {
                  let errorValues = Object.keys(
                     error.error.errors.shipping_address
                  );
                  errorValues.forEach((el) => {
                     if (el == "zip") {
                        error.error.errors.shipping_address[el].forEach(
                           (el) => {
                              faultyMessages.push({
                                 title: "Zip",
                                 message: el.message,
                              });
                           }
                        );
                     }
                     if (el == "last_name") {
                        error.error.errors.shipping_address[el].forEach(
                           (el) => {
                              faultyMessages.push({
                                 title: "Last name",
                                 message: el.message,
                              });
                           }
                        );
                     }
                     if (el == "address1") {
                        error.error.errors.shipping_address[el].forEach(
                           (el) => {
                              faultyMessages.push({
                                 title: "Address",
                                 message: el.message,
                              });
                           }
                        );
                     }
                     if (el == "country_code") {
                        error.error.errors.shipping_address[el].forEach(
                           (el) => {
                              faultyMessages.push({
                                 title: "Country",
                                 message: el.message,
                              });
                           }
                        );
                     }
                  });
                  shippingValidated = true;
               }

               if (keyNames[keyIndex] == "line_items" && !lineItemsValidated) {
                  let variantNumebr = Object.keys(
                     error.error.errors.line_items
                  );
                  cartItems.forEach((element, i) => {
                     if (variantNumebr.findIndex((el) => el == i) > -1) {
                        let keyValue = Object.keys(
                           error.error.errors.line_items[i]
                        );
                        if (keyValue == "variant_id") {
                           faultyProducts.push({
                              title: element.title,
                              message: " unavailable. ",
                           });
                        } else if (keyValue == "quantity") {
                           error.error.errors.line_items[i].quantity.forEach(
                              (el) => {
                                 outOfStockProducts.push({
                                    title: element.title,
                                    message: el.message,
                                 });
                              }
                           );
                        }
                     }
                  });

                  lineItemsValidated = true;
               }
            });

            faultyMessages.forEach((element, i) => {
               errorMessage +=
                  "<p>" + element.title + " " + element.message + ". </p>";
            });

            var msg = "";
            faultyProducts.forEach((element, i) => {
               msg +=
                  element.title +
                  (i != faultyProducts.length - 1
                     ? ", "
                     : " " + element.message);
            });
            errorMessage += "<p>" + msg + "</p>";

            msg = "";
            outOfStockProducts.forEach((element, i) => {
               msg +=
                  element.title +
                  " (" +
                  element.message +
                  ")" +
                  (i != outOfStockProducts.length - 1 ? ", " : ". ");
            });
            errorMessage += "<p>" + msg + "</p>";

            if (error.message.indexOf("Unavailable Shop") > -1) {
               errorMessage =
                  "Checkout not available right now. Please contact stream owner.";
            }

            console.log("error message>>>>>>>>", error.message);
            res.send({
               error: error,
               errorMessage: errorMessage,
            });
         });
   });

   app.post("/update-checkout/:token", (req, res) => {
      const shop = req.body.body.storeDetails.shop;
      const accessToken = req.body.body.storeDetails.accessToken;
      console.log("req.body.body.checkout", req.body.body);
      const type = req.body.body.type;
      let checkoutObj = {};
      let options = {
         method: "PATCH",
         uri:
            "https://" +
            shop +
            "/admin/checkouts/" +
            req.params.token +
            ".json",
         json: true,
         resolveWithFullResponse: true, //added this to view status code
         headers: {
            "X-Shopify-Access-Token": accessToken,
            Host: shop,
            "content-type": "application/json",
            "Retry-After": 1,
         },
         body: req.body.body.checkout,
      };
      console.log(req.params);
      requestPromise
         .patch(options)
         .then(async (response) => {
            checkoutToken = response.body;
            checkoutObj = response.body;
            let shipping = "";
            maxAttempts = 20;
            // let shippingBody = {
            //     shippingResponse: response,
            //     shop: req.body.body.storeDetails.shop,
            //     accessToken: req.body.body.storeDetails.accessToken
            // }
            console.log("response.body", response.body);
            if (
               type === "discountCode" ||
               type === "billingInformation" ||
               type === "lineItems"
            ) {
               return res.send(response.body);
            }
            if (checkoutObj.checkout.requires_shipping) {
               let options2 = {
                  method: "GET",
                  uri:
                     "https://" +
                     shop +
                     "/admin/checkouts/" +
                     checkoutObj.checkout.token +
                     "/shipping_rates.json",
                  json: true,
                  resolveWithFullResponse: true, //added this to view status code
                  headers: {
                     "X-Shopify-Access-Token": accessToken,
                     "content-type": "application/json",
                     Location:
                        "https://" +
                        shop +
                        "/admin/checkouts/" +
                        checkoutObj.checkout.token +
                        "/shipping_rates.json",
                  },
               };
               console.log("options2",options2);
               for (let i = 0; i < maxAttempts; i++) {
                  shipping = await requestPromise.get(options2);
                  if (shipping.statusCode == "200") {
                     break;
                  }
               }
               if (shipping.body.shipping_rates.length) {
                  res.send({
                     shipping_rates: shipping.body.shipping_rates,
                     checkout: checkoutObj.checkout,
                     status: shipping.statusCode,
                     testCheckout: shipping.body,
                  });
               }
               if (
                  shipping.statusCode == "200" &&
                  !shipping.body.shipping_rates.length
               ) {
                  res.send({
                     shipping_rates:
                        "Shipping not available right now. Please try later.",
                     checkout: checkoutObj.checkout,
                     status: shipping.statusCode,
                  });
               }
            } else {
               res.send({
                  checkout: checkoutObj.checkout,
                  message: "No shipping required.",
                  status: shipping.statusCode,
               });
            }
         })
         .catch((error) => {
            console.log(error);

            var keyNames = Object.keys(error.error.errors);
            let errorMessage = "";
            let faultyMessages = [];
            let billingValidated = false;
            let shippingValidated = false;

            console.log("KeyNames====>>>>", keyNames);
            keyNames.forEach((key, keyIndex) => {
               if (
                  keyNames[keyIndex] == "shipping_address" &&
                  !shippingValidated
               ) {
                  let errorValues = Object.keys(
                     error.error.errors.shipping_address
                  );
                  errorValues.forEach((el) => {
                     if (el == "zip") {
                        error.error.errors.shipping_address[el].forEach(
                           (el) => {
                              faultyMessages.push({
                                 title: "Zip",
                                 message: el.message,
                              });
                           }
                        );
                     }
                     if (el == "last_name") {
                        error.error.errors.shipping_address[el].forEach(
                           (el) => {
                              faultyMessages.push({
                                 title: "Last name",
                                 message: el.message,
                              });
                           }
                        );
                     }
                     if (el == "address1") {
                        error.error.errors.shipping_address[el].forEach(
                           (el) => {
                              faultyMessages.push({
                                 title: "Address",
                                 message: el.message,
                              });
                           }
                        );
                     }
                     if (el == "country_code") {
                        error.error.errors.shipping_address[el].forEach(
                           (el) => {
                              faultyMessages.push({
                                 title: "Country",
                                 message: el.message,
                              });
                           }
                        );
                     }
                  });
                  shippingValidated = true;
               }
               if (
                  keyNames[keyIndex] == "billing_address" &&
                  !billingValidated
               ) {
                  let errorValues = Object.keys(
                     error.error.errors.billing_address
                  );
                  errorValues.forEach((el) => {
                     if (el == "zip") {
                        error.error.errors.billing_address[el].forEach((el) => {
                           faultyMessages.push({
                              title: "Zip",
                              message: el.message,
                           });
                        });
                     }
                     if (el == "last_name") {
                        error.error.errors.billing_address[el].forEach((el) => {
                           faultyMessages.push({
                              title: "Last name",
                              message: el.message,
                           });
                        });
                     }
                     if (el == "address1") {
                        error.error.errors.billing_address[el].forEach((el) => {
                           faultyMessages.push({
                              title: "Address",
                              message: el.message,
                           });
                        });
                     }
                     if (el == "country_code") {
                        error.error.errors.shipping_address[el].forEach(
                           (el) => {
                              faultyMessages.push({
                                 title: "Country",
                                 message: el.message,
                              });
                           }
                        );
                     }
                  });
                  billingValidated = true;
               }
               // if(keyNames[keyIndex] === 'discount_code'){
               //     let errorValues = Object.keys(error.error.errors.discount_code)
               //     errorValues.forEach(el => {
               //         console.log("eeeeeeeee", el);

               //         if (error.error.errors.discount_code[el].code == "discount_not_found") {
               //                 faultyMessages.push({
               //                     title: "",
               //                     message: error.error.errors.discount_code[el].message
               //             })
               //         }})
               //     console.log("errorValues", errorValues, errorValues[0]);
               // }
               if (
                  keyNames[keyIndex] === "discount_code" ||
                  keyNames[keyIndex] === "discount"
               ) {
                  faultyMessages.push({
                     title: "",
                     message: "Enter a valid discount code",
                  });
               }
            });

            faultyMessages.forEach((element, i) => {
               errorMessage +=
                  "<p>" + element.title + " " + element.message + ". </p>";
            });

            if (error.message.indexOf("Unavailable Shop") > -1) {
               errorMessage =
                  "Checkout not available right now. Please contact stream owner.";
            }
            console.log("error message>>>>>>>>", error.message);
            res.send({
               error: error,
               errorMessage: errorMessage,
            });
         });
   });
   /**
    * {
    *    body:{
    *       body:{
    *          storeDetail:{},
    *          orderObject: {},
    *          token: {},
    *          
    *          
    *       }
    *    }
    * }
    */
   app.post("/stripe", async (req, res) => {
      console.log("Stripe called: ", req.body);
      const shop = req.body.body.storeDetails.shop;
      const accessToken = req.body.body.storeDetails.accessToken;
      const recurringApplicationChargeId =
         req.body.body.storeDetails.recurringApplicationChargeId;
      const userId = req.body.body.orderObject.user;
      let orderObject = req.body.body.orderObject;

      let options0 = {
         method: "GET",
         uri: privateIp + "/api/v1/web/plans/get-plan-by-user/" + userId,
         json: true,
         headers: {
            "content-type": "application/json",
         },
      };
		console.log("Here is the option >>>>>>>>>>>>>>>>>>>>>>>>>\n", options0)
      let plan = await requestPromise.get(options0);
		console.log("Here is the plan >>>>>>>>>>>>>>>>>>>>>>>>>\n",plan)
      let transactionFee = plan.body.plan.transactionFee;
		console.log("Here is the transaction >>>>>>>>>>>>>>>>>>>>>>>>>\n",transactionFee)
      // let stripeDetails = req.body.body.stripeDetails;
      // let stripeAuth = 'Bearer '+ stripeKey
      // console.log("stripeKey===>",stripeKey)
      // console.log("stripeAuth===>",stripeAuth)
      // let options3 = {
      //     method: 'POST',
      //     uri: "https://api.stripe.com/v1/tokens",
      //     resolveWithFullResponse: true, //added this to view status code
      //     headers: {
      //         'Authorization': stripeAuth,
      //         'Host': 'api.stripe.com',
      //         'Stripe-Account': stripeDetails.shopify_payments_account_id,
      //         // 'content-type': 'application/json',
      //         'Retry-After': 1
      //     },
      //     form: {
      //         card: {
      //             number: stripeDetails.cardNumber,
      //             exp_month: stripeDetails.cardMonth,
      //             exp_year: stripeDetails.cardYear,
      //             cvc: stripeDetails.cvv
      //         }
      //     }
      // };

      // requestPromise.post(options3)
      //     .then((response2) => {
      let token = req.body.body.token;
      var unique_token = token.id.split("tok_")[1];
      console.log("TOKEN+++>>", token)
      let checkoutObj = {};
      let options = {
         method: "POST",
         uri:
            "https://" +
            shop +
            "/admin/checkouts/" +
            orderObject.checkout.token +
            "/payments.json",
         json: true,
         resolveWithFullResponse: true, //added this to view status code
         headers: {
            "X-Shopify-Access-Token": accessToken,
            Host: shop,
            "content-type": "application/json",
            "Retry-After": 1,
         },
         body: {
            payment: {
               amount: orderObject.checkout.TotalPrice,
               unique_token: unique_token,
               payment_token: {
                  payment_data: token.id,
                  type: "stripe_vault_token",
               },
               request_details: {
                  ip_address: token.client_ip,
                  accept_language: "en",
                  user_agent:
                     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36",
               },
            },
         },
      };
      console.log("options", options);
      requestPromise
         .post(options)
         .then(async (response) => {
            //     console.log("Payment has been made ================>>>>", response.body.payment.id)
            //     console.log("checkoutObj has been made ================>>>>", response.body.payment.checkout.token)
            //     console.log("checkoutObj has been made ================>>>>", checkoutToken.checkout.token)
            //     console.log("accessToken has been made ================>>>>", accessToken)

            let options1 = {
               method: "GET",
               uri:
                  "https://" +
                  shop +
                  "/admin/checkouts/" +
                  response.body.payment.checkout.token +
                  "/payments/" +
                  response.body.payment.id +
                  ".json",
               json: true,
               resolveWithFullResponse: true, //added this to view status code
               headers: {
                  "X-Shopify-Access-Token": accessToken,
                  "content-type": "application/json",
                  Location:
                     "https://" +
                     shop +
                     "/admin/checkouts/" +
                     response.body.payment.checkout.token +
                     "/payments/" +
                     response.body.payment.id +
                     ".json",
               },
            };
            console.log("In Payment====>>>>");
            let paymentInfo;
            let maxAttempts = 50;
            for (let i = 0; i < maxAttempts; i++) {
               console.log("Attempts====>>>", i);
               try {
                  paymentInfo = await requestPromise.get(options1);
                  // console.log("responseee==============>>>>", paymentInfo.body.payment)
                  console.log(
                     "response status==============>>>>",
                     paymentInfo.statusCode
                  );
               } catch (error) {
                  console.log("error==============>>>>", error.body);
                  console.log(
                     "error status==============>>>>",
                     error.statusCode
                  );
               }

               if (paymentInfo.statusCode == "200") {
                  break;
               }
            }

            if (paymentInfo.body.payment.transaction.status == "failure") {
               let error = {
                  error: paymentInfo.body,
               };
               // console.log("paymentInfo===>>", paymentInfo.body.payment.transaction)
               res.send({
                  status: paymentInfo.body.payment.transaction.status,
                  error: error,
               });
               return;
            }
            let options2 = {
               method: "POST",
               uri: privateIp + "/api/v1/web/orders/create-order",
               json: true,
               resolveWithFullResponse: true,
               headers: {
                  "content-type": "application/json",
               },
               body: orderObject,
            };

            requestPromise
               .post(options2)
               .then((response2) => {
                  var price =
                     (checkoutToken.checkout.total_price / 100) *
                     transactionFee;
                  let options3 = {
                     method: "POST",
                     uri:
                        "https://" +
                        shop +
                        "/admin/api/2019-04/recurring_application_charges/" +
                        recurringApplicationChargeId +
                        "/usage_charges.json",
                     json: true,
                     resolveWithFullResponse: true, //added this to view status code
                     headers: {
                        "X-Shopify-Access-Token": accessToken,
                        Host: shop,
                        "content-type": "application/json",
                        "Retry-After": 1,
                     },
                     body: {
                        usage_charge: {
                           price: price,
                           description:
                              "You sold 1 item for $" +
                              checkoutToken.checkout.total_price +
                              ". This is our " +
                              transactionFee +
                              "% cut.",
                        },
                     },
                  };

                  requestPromise
                     .post(options3)
                     .then((response3) => {
                        console.log(
                           "Usage Charge:==> ",
                           response3.body,
                           recurringApplicationChargeId
                        );
                        console.log(
                           "recurringApplicationChargeId:==> ",
                           recurringApplicationChargeId
                        );
                        res.send({ message: "Success!" });
                     })
                     .catch((err3) => {
                        res.send({
                           error: err3,
                           message: "Final cut unsuccessful!",
                        });
                     });
                  //  res.send(response2.body)
               })
               .catch((err2) => {
                  res.send({
                     error: err2,
                     message: "Order unsuccessful!",
                  });
               });
            // res.send(response)
         })
         .catch((error) => {
            var keyNames = Object.keys(error.error.errors);
            let errorMessage = "";
            let faultyMessages = [];
            keyNames.forEach((key, keyIndex) => {
               if (keyNames[keyIndex] === "checkout") {
                 /*   let errorValues = Object.keys(
                     error.error.errors.checkout.discount_code
                  );
                  errorValues.forEach((el) => {
                     console.log("eeeeeeeee", el);

                     if (
                        error.error.errors.checkout.discount_code[el].code ==
                        "cart_does_not_meet_discount_requirements_notice"
                     ) {
                        faultyMessages.push({
                           title: "",
                           message:
                              error.error.errors.checkout.discount_code[el]
                                 .message,
                        });
                     }
                  });
                  console.log("errorValues", errorValues, errorValues[0]); */
                  console.log('key',error); 
               }
            });

            faultyMessages.forEach((element, i) => {
               errorMessage += element.title + " " + element.message;
            });

            if (!faultyMessages.length) {
               errorMessage =
                  "<p>Payment can't be made at this time. Try again later.</p>";
            }

            res.send({
               error: error,
               message: errorMessage,
            });
         });
      // res.send(response2)
      // })
      // .catch((err2) => {
      //     console.log('------------------------------------');
      //     console.log(err2);
      //     console.log('------------------------------------');
      //     res.send("Error", err2);
      // })
   });

   app.get("/stripee", (req, res) => {
      const shop = storeName;
      let options3 = {
         method: "POST",
         uri: "stripe.com/v1/tokens",
         json: true,
         resolveWithFullResponse: true, //added this to view status code
         headers: {
            Authentication: "pk_test_LauEHXey5gF327LhkyWIONgz00RadhtQoX",
            Host: "api.stripe.com",
            "Stripe-Account": "acct_1EAFKVCY6u25oaUX",
            "content-type": "application/json",
            "Retry-After": 1,
         },
         body: {
            card: {
               number: "4242424242424242",
               exp_month: 12,
               exp_year: 2019,
               cvc: 123,
            },
         },
      };

      requestPromise
         .post(options3)
         .then((response2) => {
            res.send(response2);
         })
         .catch((err2) => {
            console.log("------------------------------------");
            console.log(err2);
            console.log("------------------------------------");
            res.send("Error", err2);
         });
   });

   // app.post('/update-checkout/:token', (req, res) => {
   //     const shop = storeName
   //     let options = {
   //         method: 'PATCH',
   //         uri: "https://" + shop + "/admin/checkouts/" + req.params.token + ".json",
   //         json: true,
   //         resolveWithFullResponse: true, //added this to view status code
   //         headers: {
   //             'X-Shopify-Access-Token': xAccessSimuStoreReal,
   //             'Host': shop,
   //             'content-type': 'application/json',
   //             'Retry-After': 1
   //         },
   //         body: req.body.body
   //     };

   //     requestPromise.patch(options)
   //         .then((response) => {
   //             res.send(response.body)
   //         })
   //         .catch((err) => {
   //             res.send("Catch error", err.statusCode);
   //         })
   // })

   app.get("/register-add-webhook", (req, res) => {
      const shop = storeName;
      let options = {
         method: "POST",
         uri: "https://" + shop + "/admin/webhooks.json",
         json: true,
         resolveWithFullResponse: true,
         headers: {
            "X-Shopify-Access-Token": req.query.accessToken,
            "content-type": "application/json",
            "Retry-After": 1,
         },
         body: {
            webhook: {
               topic: "product_listings/add",
               address: webhookAddress + "/add-product-webhook",
               format: "json",
            },
         },
      };

      requestPromise
         .post(options)
         .then((response) => {
            res.send(response.body);
         })
         .catch((err) => {
            console.log("------------------------------------");
            console.log(err);
            console.log("------------------------------------");
            res.send("Catch error", err);
         });
   });

   app.get("/register-update-webhook", (req, res) => {
      const shop = storeName;
      let options = {
         method: "POST",
         uri: "https://" + shop + "/admin/webhooks.json",
         json: true,
         resolveWithFullResponse: true,
         headers: {
            "X-Shopify-Access-Token": req.query.accessToken,
            "content-type": "application/json",
            "Retry-After": 1,
         },
         body: {
            webhook: {
               topic: "product_listings/update",
               address: webhookAddress + "/update-product-webhook",
               format: "json",
            },
         },
      };

      requestPromise
         .post(options)
         .then((response) => {
            res.send(response.body);
         })
         .catch((err) => {
            console.log("------------------------------------");
            console.log(err);
            console.log("------------------------------------");
            res.send("Catch error", err);
         });
   });

   app.get("/register-delete-webhook", (req, res) => {
      const shop = storeName;
      let options = {
         method: "POST",
         uri: "https://" + shop + "/admin/webhooks.json",
         json: true,
         resolveWithFullResponse: true,
         headers: {
            "X-Shopify-Access-Token": req.query.accessToken,
            "content-type": "application/json",
            "Retry-After": 1,
         },
         body: {
            webhook: {
               topic: "product_listings/remove",
               address: webhookAddress + "/delete-product-webhook",
               format: "json",
            },
         },
      };

      requestPromise
         .post(options)
         .then((response) => {
            res.send(response.body);
         })
         .catch((err) => {
            console.log("------------------------------------");
            console.log(err);
            console.log("------------------------------------");
            res.send("Catch error", err);
         });
   });

   app.post("/shipings/:token", (req, res) => {
      const shop = req.body.body.storeDetails.shop;
      const accessToken = req.body.body.storeDetails.accessToken;
      console.log("req.body.body.checkout", req.body.body);
      let checkoutObj = {};
      let options = {
         method: "PATCH",
         uri:
            "https://" +
            shop +
            "/admin/checkouts/" +
            req.params.token +
            ".json",
         json: true,
         resolveWithFullResponse: true, //added this to view status code
         headers: {
            "X-Shopify-Access-Token": accessToken,
            Host: shop,
            "content-type": "application/json",
            "Retry-After": 1,
         },
         body: req.body.body.checkout,
      };
      console.log(req.params);
   
      requestPromise
         .patch(options)
         .then(async (response) => {
            checkoutToken = response.body;
            checkoutObj = response.body;
            let shipping = "";
            maxAttempts = 20;
   
            console.log("response.body", response.body);
            if (checkoutObj.checkout.requires_shipping) {
               let options2 = {
                  method: "GET",
                  uri:
                     "https://" +
                     shop +
                     "/admin/checkouts/" +
                     checkoutObj.checkout.token +
                     "/shipping_rates.json",
                  json: true,
                  resolveWithFullResponse: true, //added this to view status code
                  headers: {
                     "X-Shopify-Access-Token": accessToken,
                     "content-type": "application/json",
                     Location:
                        "https://" +
                        shop +
                        "/admin/checkouts/" +
                        checkoutObj.checkout.token +
                        "/shipping_rates.json",
                  },
               };
               console.log("options2",options2);
               for (let i = 0; i < maxAttempts; i++) {
                  shipping = await requestPromise.get(options2);
                  if (shipping.statusCode == "200") {
                     break;
                  }
               }
               if (shipping.body.shipping_rates.length) {
                  res.send({
                     shipping_rates: shipping.body.shipping_rates,
                     checkout: checkoutObj.checkout,
                     status: shipping.statusCode,
                     testCheckout: shipping.body,
                  });
               }
               if (
                  shipping.statusCode == "200" &&
                  !shipping.body.shipping_rates.length
               ) {
                  res.send({
                     shipping_rates:
                        "Shipping not available right now. Please try later.",
                     checkout: checkoutObj.checkout,
                     status: shipping.statusCode,
                  });
               }
            } else {
               res.send({
                  checkout: checkoutObj.checkout,
                  message: "No shipping required.",
                  status: shipping.statusCode,
               });
            }
         })
         .catch((error) => {
   
            if (error.message.indexOf("Unavailable Shop") > -1) {
              var errorMessage =
                  "Checkout not available right now. Please contact stream owner.";
            }
            console.log("error message>>>>>>>>", error.message);
            res.send({
               error: error,
               errorMessage: errorMessage,
            });
         });
   });

   /** 
    * javascript comment 
    * @Author: andersson arellano 
    * @Date: 2021-08-14 21:54:31 
    * @Desc:  
    */

   client.on(client.Event.SDK_READY, function() {
      let treatment = client.getTreatment('user_id','google_apple_payments');
   
      if (treatment === 'on') {

         /** 
          * javascript comment 
          * @Author: andersson arellano 
          * @Date: 2021-08-14 21:55:00 
          * @Desc:  
          * @Params:  
          * retruns: 
          */
         app.post("/stripe-button",async (req, res)=>{
            
            const paymentIntent = await stripe.paymentIntents.create({
                amount: req.body.amount,
                currency: 'usd',
              });
              console.log('stripe-button: req.body',req.body);
              res.json({
                clientSecret: paymentIntent.client_secret
              });
          });

      }   else   if (treatment === 'off') {
         // insert off code here
      }   else {
         // insert control code here
      }
   
   });


   
};


