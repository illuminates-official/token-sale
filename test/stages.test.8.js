const TokenContract = artifacts.require("./Token.sol");
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


contract('StageThird', function (accounts) {

    let tokenOwner = accounts[0];
    let investOwner = accounts[1];
    let receiver = investOwner;
    let advisors = accounts[9];
    let bounty = accounts[0];
    let team = accounts[7];

    let thirdStageBalance = vs(3345000);

    let duration = 90*day;

    let bal1, bal2, balc1, balc2;

    describe('Manual receiving tokens', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            third = await StageThirdContract.new({from: investOwner});
            await token.sendTokens([third.address], [thirdStageBalance], {from: tokenOwner});
            await third.setToken(token.address, {from: investOwner});
        });

        it('recieving tokens', async () => {
            bal1 = await web3.eth.getBalance(receiver);
            balc1 = await web3.eth.getBalance(third.address);

            await web3.eth.sendTransaction({from: accounts[2], to: third.address, gas: 150000, value: vs(10)});
            await web3.eth.sendTransaction({from: accounts[3], to: third.address, gas: 150000, value: vs(10)});
            await web3.eth.sendTransaction({from: accounts[4], to: third.address, gas: 150000, value: vs(20)});
            await web3.eth.sendTransaction({from: accounts[5], to: third.address, gas: 150000, value: vs(5)});

            balc2 = await web3.eth.getBalance(third.address);

            assert.equal(balc1, 0);
            assert.equal(balc2, vs(45));
            assert.equal(+(await third.totalInvested()), vs(45));
            assert.equal(+(await third.investments(accounts[2])), vs(10));
            assert.equal(await third.investors(0), accounts[2]);
            assert.equal(await third.investors(1), accounts[3]);
            assert.equal(await third.investors(2), accounts[4]);
            assert.equal(await third.investors(3), accounts[5]);
            assert.equal(+(await token.balanceOf(third.address)), thirdStageBalance);
            assert.equal(+(await third.totalCap()), vs(3345));

            await third.receiveTokens({from: accounts[2]});

            bal2 = await web3.eth.getBalance(receiver);
            balc1 = await web3.eth.getBalance(third.address);

            assert(0 < bal2 - 10 * decimals - bal1 < 0.1 * decimals);
            assert.equal(balc1, vs(35));
            assert.equal(+(await third.totalInvested()), vs(45));
            assert.equal(await third.investments(accounts[2]), 0);
            assert.equal(await third.investors(0), accounts[5]);
            assert.equal(await third.investors(1), accounts[3]);
            assert.equal(await third.investors(2), accounts[4]);
            assert.equal(+(await token.balanceOf(third.address)), vs(3345000 - 10000));
            assert.equal(+(await token.balanceOf(accounts[2])), vs(10000));
            assert.equal(+(await third.totalCap()), vs(3345));

            bal1 = await web3.eth.getBalance(receiver);

            await third.receiveTokens({from: accounts[3]});

            bal2 = await web3.eth.getBalance(receiver);
            balc2 = await web3.eth.getBalance(third.address);

            assert(0 < bal2 - 10 * decimals - bal1 < 0.1 * decimals);
            assert.equal(balc2, vs(25));
            assert.equal(+(await third.totalInvested()), vs(45));
            assert.equal(await third.investments(accounts[3]), 0);
            assert.equal(await third.investors(0), accounts[5]);
            assert.equal(await third.investors(1), accounts[4]);
            assert.equal(+(await token.balanceOf(third.address)), vs(3345000 - 10000*2));
            assert.equal(+(await token.balanceOf(accounts[3])), vs(10000));
            assert.equal(+(await third.totalCap()), vs(3345));
        });

        it('one more investment after receiving', async () => {
            await web3.eth.sendTransaction({from: accounts[2], to: third.address, gas: 150000, value: vs(10)});
            assert.equal(+(await third.totalInvested()), vs(10));
            await third.receiveTokens({from: accounts[2]});
            assert.equal(await third.investments(accounts[2]), 0);
            assert.equal(+(await third.totalCap()), vs(3345));
            assert.equal(+(await third.totalInvested()), vs(10));

            await web3.eth.sendTransaction({from: accounts[2], to: third.address, gas: 150000, value: vs(10)});
            assert.equal(+(await third.totalInvested()), vs(20));
            await third.receiveTokens({from: accounts[2]});
            assert.equal(await third.investments(accounts[2]), 0);
            assert.equal(+(await third.totalCap()), vs(3345));
            assert.equal(+(await third.totalInvested()), vs(20));
        });
    });


    describe('Requirements and restrictions', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            third = await StageThirdContract.new({from: investOwner});
            await token.sendTokens([third.address], [thirdStageBalance], {from: tokenOwner});
            await third.setToken(token.address, {from: investOwner});
        });

        it('try to receive tokens without investments', async () => {
            bal1 = await web3.eth.getBalance(receiver);
            balc1 = await web3.eth.getBalance(third.address);

            await web3.eth.sendTransaction({from: accounts[5], to: third.address, gas: 150000, value: vs(10)});

            balc2 = await web3.eth.getBalance(third.address);

            assert.equal(balc1, 0);
            assert.equal(balc2, vs(10));
            assert.equal(+(await third.totalInvested()), vs(10));
            assert.equal(+(await third.investments(accounts[2])), 0);
            assert.equal(await third.investors(0), accounts[5]);

            try {
                await third.receiveTokens({from: accounts[2]});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Not invested"));}

            await increaseTime(duration);
            await third.close({from: investOwner});
        });
    });
 });