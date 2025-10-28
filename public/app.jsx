
'use strict';
const e = React.createElement;
class MainApplication extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      connect: "Connect",
      disConnect: "Disconnect",
      isConnect: false,
      hostDashboard: "",
      base_path: "",
      shopName: "",
      isShopConnected: false,
      accessToken: "",
      publishedProductsCount: 0,
      interval: '',
    };
  }

  redirectToPortal(shopName) {
    window.open(this.state.hostDashboard + "/sign-in?shop=" + shopName, 'newwindow',
      'width=850,height=650')
    let status = true
    this.setState({
      interval: setInterval(() => { this.checkStoreConnection(status) }, 5000)
    })

    return false;
  }
  componentDidMount() {
    this.getCommonSettings();
  }

  async getCommonSettings() {
    let commonSettings = await fetch("/get-common-settings",
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(res => res.json())
      .then(response => {
        this.setState({ hostDashboard: response.redirect_dashboard_url, base_path: response.base_path })
        this.checkStoreConnection();
      })
  }

  async getProductListing(shop, accessToken) {
    let productListing = await fetch("/product-listing-shop",
      {
        method: 'POST',
        body: JSON.stringify({ shop: shop, accessToken: accessToken }), // data can be `string` or {object}!
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(res => res.json())
      .then(response => {
        this.setState({ publishedProductsCount: response.count })
      })
  }

  async checkStoreConnection(status) {
    if (typeof window !== 'undefined') {
      var patparamsString1 = location.href // (or whatever)
      var searchParams1 = new URLSearchParams(patparamsString1);
      var path = searchParams1.get("shop")
      this.setState({ shopName: path })
    } else {
      // work out what you want to do server-side...
    }
    let account = await fetch(this.state.base_path + "/api/v1/web/accounts/check-shop-connection?shop=" + this.state.shopName, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(response => {
        this.setState({ isShopConnected: response.body.isShopConnected, shopName: response.body.account.domain, accessToken: response.body.account.accessToken })
        if (status && response.body.isShopConnected) {
          clearInterval(this.state.interval);
        }
        let shop = response.body.account.domain
        let accessToken = response.body.account.accessToken
        this.getProductListing(shop, accessToken);
      })
  }

  async disconnectStoreFromDashboard() {
    let account = await fetch(this.state.base_path + "/api/v1/web/accounts/disconnect-shop", {
      method: 'PUT', // or 'PUT'
      body: JSON.stringify({ shop: "simustream-store.myshopify.com" }), // data can be `string` or {object}!
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(response => {
        this.setState({ isShopConnected: response.body.isShopConnected })
      })
  }
  render() {
    return (
      <div className="Polaris-Page">
        <div className="Polaris-Page__Content">
          <div className="Polaris-Layout">
            <div className="Polaris-Layout__AnnotatedSection">
              <div className="Polaris-Layout__AnnotationWrapper">
                <div className="Polaris-Layout__Annotation">
                  <div className="Polaris-TextContainer">
                    <h2 className="Polaris-Heading">Simustream account</h2>
                    <p>Connect your account to your Shopify store.</p>
                  </div>
                </div>
                <div className="Polaris-Layout__AnnotationContent">
                  <div className="Polaris-Card">
                    <div className="Polaris-Card__Section">
                      <div className="Polaris-SettingAction">
                        <div className="Polaris-SettingAction__Setting">
                          <div className="Polaris-Stack">
                            <div className="Polaris-Stack__Item Polaris-Stack__Item--fill">
                              <div className="Polaris-AccountConnection__Content">
                                <div>
                                  {
                                    this.state.isShopConnected ?
                                      <span className="Polaris-TextStyle--variationSubdued">Account connected</span>
                                      :
                                      <span className="Polaris-TextStyle--variationSubdued">No account connected</span>
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="Polaris-SettingAction__Action">
                          {
                            !this.state.isShopConnected ?
                              <button type="button" className="Polaris-Button Polaris-Button--primary" onClick={() => { this.setState({ isConnect: true }), this.redirectToPortal(path) }}><span
                                className="Polaris-Button__Content"><span> {this.state.connect}</span></span></button>
                              :
                              <button type="button" className="Polaris-Button Polaris-Button--primary" onClick={() => { this.setState({ isConnect: false }), this.disconnectStoreFromDashboard() }}><span
                                className="Polaris-Button__Content"><span> {this.state.disConnect}</span></span></button>
                          }
                        </div>
                      </div>
                      <div className="Polaris-AccountConnection__TermsOfService">
                        <p>
                          By clicking Connect, you are accepting Sample’s <a className="Polaris-Link" href="https://polaris.shopify.com"
                            data-polaris-unstyled="true">Terms and Conditions</a>, including a commission rate of 15% on sales.
                    </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="Polaris-Layout__AnnotatedSection">
              <div className="Polaris-Layout__AnnotationWrapper">
                <div className="Polaris-Layout__Annotation">
                  <div className="Polaris-TextContainer">
                    <h2 className="Polaris-Heading">Publishing</h2>
                    <p>Products that are being published to Simustream, or have errors preventing their publication, are shown here.</p>
                  </div>
                </div>
                <div className="Polaris-Layout__AnnotationContent">
                  <div className="Polaris-Card">
                    <div className="Polaris-Card__Section">
                      <div className="Polaris-SettingAction">
                        <div className="Polaris-SettingAction__Setting">
                          <div className="Polaris-Stack">
                            <div className="Polaris-Stack__Item Polaris-Stack__Item--fill">
                              <div className="Polaris-AccountConnection__Content">
                                <h2 className="Polaris-Heading">Status</h2>
                                <p>
                                  {this.state.publishedProductsCount} {this.state.publishedProductsCount == 1 ? "product is" : "products are"} being published to Simustream.
                          </p>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="Polaris-Layout__AnnotatedSection">
              <div className="Polaris-Layout__AnnotationWrapper">
                <div className="Polaris-Layout__Annotation">
                  <div className="Polaris-TextContainer">
                    <h2 className="Polaris-Heading">Terms and Conditions</h2>
                    <p>You can view the terms and conditions here at anytime.</p>
                  </div>
                </div>
                <div className="Polaris-Layout__AnnotationContent">
                  <div className="Polaris-Card">
                    <div className="Polaris-Card__Section">
                      <div className="Polaris-SettingAction">
                        <div className="Polaris-SettingAction__Setting">
                          <div className="Polaris-Stack">
                            <div className="Polaris-Stack__Item Polaris-Stack__Item--fill">
                              <div className="Polaris-AccountConnection__Content">
                                <div>
                                  <a className="Polaris-Link" href={this.state.hostDashboard} target="_blank">Terms and conditions</a>
                                </div>
                                <div>
                                  <a className="Polaris-Link" href={this.state.hostDashboard} target="_blank">Seller accountPolicy</a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="Polaris-Layout__Section">
              <div className="Polaris-FooterHelp">
                <div className="Polaris-FooterHelp__Content">
                  <div className="Polaris-FooterHelp__Icon"><span className="Polaris-Icon Polaris-Icon--colorTeal Polaris-Icon--isColored Polaris-Icon--hasBackdrop"><svg viewBox="0 0 20 20" className="Polaris-Icon__Svg" focusable="false" aria-hidden="true">
                    <circle cx="10" cy="10" r="9" fill="currentColor"></circle>
                    <path d="M10 0C4.486 0 0 4.486 0 10s4.486 10 10 10 10-4.486 10-10S15.514 0 10 0m0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8m0-4a1 1 0 1 0 0 2 1 1 0 1 0 0-2m0-10C8.346 4 7 5.346 7 7a1 1 0 1 0 2 0 1.001 1.001 0 1 1 1.591.808C9.58 8.548 9 9.616 9 10.737V11a1 1 0 1 0 2 0v-.263c0-.653.484-1.105.773-1.317A3.013 3.013 0 0 0 13 7c0-1.654-1.346-3-3-3"></path>
                  </svg></span></div>
                  <div className="Polaris-FooterHelp__Text">
                    Learn more about selling on Simustream at the  <a className="Polaris-Link" href={this.state.hostDashboard}
                      data-polaris-unstyled="true"> Simustream Help Center</a>.
              </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
const domContainer = document.querySelector('#main');
ReactDOM.render(e(MainApplication), domContainer);
