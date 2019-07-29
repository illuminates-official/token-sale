const TokenContract = artifacts.require("./Token.sol");
const StageSecondContract = artifacts.require("./StageSecond.sol");


const increaseTime = function (duration) {
    const id = Date.now();
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [duration],
            id: id,
        }, err1 => {
            if (err1) return reject(err1);

            web3.currentProvider.send({
                jsonrpc: '2.0',
                method: 'evm_mine',
                id: id + 1,
            }, (err2, res) => {
                return err2 ? reject(err2) : resolve(res);
            });
        });
    });
};

const hour = 3600;
const days = hour * 24;
const decimals = 10**18;

function v(value){
    return (value * decimals).toString();
}

function dec(decimals){
    return '0'.repeat(decimals);
}

function vs(value){
    return (value.toString() + dec(18));
}


contract('StageSecond', function (accounts) {

    let tokenOwner = accounts[0];
    let investOwner = accounts[1];
    let advisors = accounts[9];
    let bounty = accounts[0];
    let team = accounts[7];

    let secondStageBalance = vs(900000);

    let bal1, bal2, balc1, balc2;


    describe('Ether returning', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            second = await StageSecondContract.new({from: investOwner});
            await token.sendTokens([second.address], [secondStageBalance], {from: tokenOwner});
            await second.setToken(token.address, {from: investOwner});
        });

        it('invest (overcap, but while transaction)', async () => {
            bal1 = await web3.eth.getBalance(accounts[7]);
            balc1 = await web3.eth.getBalance(second.address);

            await web3.eth.sendTransaction({from: accounts[2], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[3], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[4], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[5], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[6], to: second.address, gas: 150000, value: vs(80)});
            await web3.eth.sendTransaction({from: accounts[7], to: second.address, gas: 150000, value: vs(20)});

            bal2 = await web3.eth.getBalance(accounts[7]);
            balc2 = await web3.eth.getBalance(second.address);

            assert(0 < bal2 - 10 * decimals - bal1 < 0.1 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, vs(450));

            assert.equal(+(await second.totalInvested()), vs(450));
            assert.equal(await second.investments(accounts[7]), vs(10));
        });
    });
 });