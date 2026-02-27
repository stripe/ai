// Fetch publishable key from server config
let stripe;

async function initializeStripe() {
  const config = await fetch("/config").then(r => r.json());
  stripe = Stripe(config.publishableKey);
}

initializeStripe();

const fetchClientSecret = async () => {
const response = await fetch("/account", {
    method: "POST",
}).then(response => response.json())
.then(json => {
    const {account, error} = json;
    if (account) {
        createAccountLink(account);
        return account;
    }
    if (error) {
        document.getElementById('error').innerText = "Error creating account";
        return error;
    }

});
};

const createAccountLink =  async (account_id) => {
    const response = await fetch("/account_link", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            account: account_id
        })
    }).then(response => response.json())
    .then(json => {
        const {url, error} = json;
        if (url) {
            window.location.href = url;
            return url;
        }

        if (error) {
            document.getElementById('error').innerText = "Error creating account link";
            return error;
        }
    });
}
//   const create = fetchClientSecret

