const TokenContract = artifacts.require("./Token.sol");
const StageSecondContract = artifacts.require("./StageSecond.sol");
const StageThirdContract = artifacts.require("./StageThird.sol");


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
const day = hour * 24;
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
    let receiver = investOwner;
    let advisors = accounts[9];
    let bounty = accounts[0];
    let team = accounts[7];

    let secondStageBalance = vs(900000);

    let duration = 90*day;

    let balances1 = [];
    let balances2 = [];

    describe('Invest functionality', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            second = await StageSecondContract.new({from: investOwner});
            await token.sendTokens([second.address], [secondStageBalance], {from: tokenOwner});
            await second.setToken(token.address, {from: investOwner});
        });

        it('close investment after tokens receiving and when cap not reached', async () => {
            balances1.push(await web3.eth.getBalance(receiver));
            balances1.push(await web3.eth.getBalance(second.address));
            balances1.push(await web3.eth.getBalance(accounts[2]));
            balances1.push(await web3.eth.getBalance(accounts[3]));
            balances1.push(await web3.eth.getBalance(accounts[4]));
            balances1.push(await web3.eth.getBalance(accounts[5]));

            await web3.eth.sendTransaction({from: accounts[2], to: second.address, gas: 150000, value: vs(10)});
            await web3.eth.sendTransaction({from: accounts[3], to: second.address, gas: 150000, value: vs(10)});
            await web3.eth.sendTransaction({from: accounts[4], to: second.address, gas: 150000, value: vs(20)});
            await web3.eth.sendTransaction({from: accounts[5], to: second.address, gas: 150000, value: vs(5)});

            balances2.push(await web3.eth.getBalance(receiver));
            balances2.push(await web3.eth.getBalance(second.address));
            balances2.push(await web3.eth.getBalance(accounts[2]));
            balances2.push(await web3.eth.getBalance(accounts[3]));
            balances2.push(await web3.eth.getBalance(accounts[4]));
            balances2.push(await web3.eth.getBalance(accounts[5]));

            assert.equal(balances1[1], 0);
            assert.equal(balances2[1], vs(45));

            await second.receiveTokens({from: accounts[2]});

            balances2 = [];
            balances2.push(await web3.eth.getBalance(receiver));
            balances2.push(await web3.eth.getBalance(second.address));
            balances2.push(await web3.eth.getBalance(accounts[2]));
            balances2.push(await web3.eth.getBalance(accounts[3]));
            balances2.push(await web3.eth.getBalance(accounts[4]));
            balances2.push(await web3.eth.getBalance(accounts[5]));

            assert(0 < balances2[0] - 10 * decimals - balances1[0] < 0.001 * decimals);
            assert.equal(balances2[1], vs(35));
            assert.equal(+(await token.balanceOf(accounts[2])), vs(20000));
            assert(0 < balances1[2] - 10 * decimals - balances2[2] < 0.001 * decimals);
            assert(0 < balances1[3] - 10 * decimals - balances2[3] < 0.001 * decimals);
            assert(0 < balances1[4] - 20 * decimals - balances2[4] < 0.001 * decimals);
            assert(0 < balances1[5] - 5 * decimals - balances2[5] < 0.001 * decimals);

            await increaseTime(duration);
            await second.close({from: investOwner});
            
            balances2 = [];
            balances2.push(await web3.eth.getBalance(receiver));
            balances2.push(await web3.eth.getBalance(second.address));
            balances2.push(await web3.eth.getBalance(accounts[2]));
            balances2.push(await web3.eth.getBalance(accounts[3]));
            balances2.push(await web3.eth.getBalance(accounts[4]));
            balances2.push(await web3.eth.getBalance(accounts[5]));

            assert(0 < balances2[0] - 10 * decimals - balances1[0] < 0.001 * decimals);
            assert.equal(balances2[1], 0);
            assert.equal(+(await token.balanceOf(accounts[2])), vs(20000));
            assert(0 < balances1[2] - 10 * decimals - balances2[2] < 0.001 * decimals);
            assert(0 < balances1[3] - balances2[3] < 0.001 * decimals);
            assert(0 < balances1[4] - balances2[4] < 0.001 * decimals);
            assert(0 < balances1[5] - balances2[5] < 0.001 * decimals);

            balances1 = [];
            balances2 = [];
        });
    });
 });

 
contract('StageThird', function (accounts) {

    let tokenOwner = accounts[0];
    let investOwner = accounts[1];
    let receiver = investOwner;
    let advisors = accounts[9];
    let bounty = accounts[0];
    let team = accounts[7];

    let thirdStageBalance = vs(3345000);

    let duration = 90*day;

    let balances1 = [];
    let balances2 = [];

    describe('Invest functionality', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            third = await StageThirdContract.new({from: investOwner});
            await token.sendTokens([third.address], [thirdStageBalance], {from: tokenOwner});
            await third.setToken(token.address, {from: investOwner});
        });

        it('close investment after tokens receiving and when cap not reached', async () => {
            balances1.push(await web3.eth.getBalance(receiver));
            balances1.push(await web3.eth.getBalance(third.address));
            balances1.push(await web3.eth.getBalance(accounts[2]));
            balances1.push(await web3.eth.getBalance(accounts[3]));
            balances1.push(await web3.eth.getBalance(accounts[4]));
            balances1.push(await web3.eth.getBalance(accounts[5]));

            await web3.eth.sendTransaction({from: accounts[2], to: third.address, gas: 150000, value: vs(10)});
            await web3.eth.sendTransaction({from: accounts[3], to: third.address, gas: 150000, value: vs(10)});
            await web3.eth.sendTransaction({from: accounts[4], to: third.address, gas: 150000, value: vs(20)});
            await web3.eth.sendTransaction({from: accounts[5], to: third.address, gas: 150000, value: vs(5)});

            balances2.push(await web3.eth.getBalance(receiver));
            balances2.push(await web3.eth.getBalance(third.address));
            balances2.push(await web3.eth.getBalance(accounts[2]));
            balances2.push(await web3.eth.getBalance(accounts[3]));
            balances2.push(await web3.eth.getBalance(accounts[4]));
            balances2.push(await web3.eth.getBalance(accounts[5]));

            assert.equal(balances1[1], 0);
            assert.equal(balances2[1], vs(45));

            await third.receiveTokens({from: accounts[2]});

            balances2 = [];
            balances2.push(await web3.eth.getBalance(receiver));
            balances2.push(await web3.eth.getBalance(third.address));
            balances2.push(await web3.eth.getBalance(accounts[2]));
            balances2.push(await web3.eth.getBalance(accounts[3]));
            balances2.push(await web3.eth.getBalance(accounts[4]));
            balances2.push(await web3.eth.getBalance(accounts[5]));

            assert(0 < balances2[0] - 10 * decimals - balances1[0] < 0.001 * decimals);
            assert.equal(balances2[1], vs(35));
            assert.equal(+(await token.balanceOf(accounts[2])), vs(10000));
            assert(0 < balances1[2] - 10 * decimals - balances2[2] < 0.001 * decimals);
            assert(0 < balances1[3] - 10 * decimals - balances2[3] < 0.001 * decimals);
            assert(0 < balances1[4] - 20 * decimals - balances2[4] < 0.001 * decimals);
            assert(0 < balances1[5] - 5 * decimals - balances2[5] < 0.001 * decimals);

            await increaseTime(duration);
            await third.close({from: investOwner});
            
            balances2 = [];
            balances2.push(await web3.eth.getBalance(receiver));
            balances2.push(await web3.eth.getBalance(third.address));
            balances2.push(await web3.eth.getBalance(accounts[2]));
            balances2.push(await web3.eth.getBalance(accounts[3]));
            balances2.push(await web3.eth.getBalance(accounts[4]));
            balances2.push(await web3.eth.getBalance(accounts[5]));

            assert(0 < balances2[0] - 10 * decimals - balances1[0] < 0.001 * decimals);
            assert.equal(balances2[1], 0);
            assert.equal(+(await token.balanceOf(accounts[2])), vs(10000));
            assert(0 < balances1[2] - 10 * decimals - balances2[2] < 0.001 * decimals);
            assert(0 < balances1[3] - balances2[3] < 0.001 * decimals);
            assert(0 < balances1[4] - balances2[4] < 0.001 * decimals);
            assert(0 < balances1[5] - balances2[5] < 0.001 * decimals);

            balances1 = [];
            balances2 = [];
        });
    });
 });