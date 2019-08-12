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
    let advisors = accounts[9];
    let bounty = accounts[0];
    let team = accounts[7];

    let thirdStageBalance = vs(3345000);

    let duration = 90*day;

    let bal1, bal2, balc1, balc2;

    describe('Invest functionality', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            third = await StageThirdContract.new({from: investOwner});
            await token.sendTokens([third.address], [thirdStageBalance], {from: tokenOwner});
            await third.setToken(token.address, {from: investOwner});
        });

        it('try to send eth', async () => {
            await web3.eth.sendTransaction({from: accounts[2], to: third.address, gas: 150000, value: 100});

            assert.equal(+(await third.investments(accounts[2])), 100);
            assert.equal(await third.investors(0), accounts[2]);
            assert.equal(+(await third.totalInvested()), 100);
        });

        it('tokens amount', async () => {
            assert.equal(+(await token.balanceOf(third.address)), thirdStageBalance);

            assert.equal(+(await third.tokensAmount(v(0.5))), vs(500));
            assert.equal(+(await third.tokensAmount(v(0.1))), vs(100));
            assert.equal(+(await third.tokensAmount(v(0.001))), v(1));
            assert.equal(+(await third.tokensAmount(v(0.0001))), v(0.1));
            assert.equal(+(await third.tokensAmount(v(0.00001))), v(0.01));
            assert.equal(+(await third.tokensAmount(v(0.000001))), 1e+15);
            assert.equal(+(await third.tokensAmount(1000000000)), 1e+12);
            assert.equal(+(await third.tokensAmount(1)), 1000);
        });
    });


    describe('Requirements and restrictions', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            third = await StageThirdContract.new({from: investOwner});
            await token.sendTokens([third.address], [thirdStageBalance], {from: tokenOwner});
            await third.setToken(token.address, {from: investOwner});
        });

        it('setting token not by owner', async () => {
            try {
                await third.setToken(team, {from: tokenOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Ownable: caller is not the owner"));}
            assert.equal(await third.token(), token.address);

            try {
                await third.setToken(team, {from: accounts[9]});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Ownable: caller is not the owner"));}
            assert.equal(await third.token(), token.address);
        });

        it('close investments (cap not reached)', async () => {
            assert.equal(+(await token.balanceOf(third.address)), vs(3345000));
            bal1 = await web3.eth.getBalance(accounts[4]);
            balc1 = await web3.eth.getBalance(third.address);

            await web3.eth.sendTransaction({from: accounts[4], to: third.address, gas: 150000, value: vs(5)});

            await increaseTime(duration + 1);

            await third.close({from: investOwner});

            assert.equal(+(await token.balanceOf(third.address)), 0);
            assert.equal(+(await token.balanceOf(token.address)), vs(100000000));
            bal2 = await web3.eth.getBalance(accounts[4]);
            balc2 = await web3.eth.getBalance(third.address);

            assert(0 < bal2 - bal1 < 0.01 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, 0);
        });

        it('close investments (not by owner)', async () => {
            await increaseTime(duration+1);

            try {
                await third.close({from: tokenOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Ownable: caller is not the owner"));}
            assert.equal(+(await token.balanceOf(third.address)), thirdStageBalance);

            try {
                await third.close({from: accounts[9]});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Ownable: caller is not the owner"));}
            assert.equal(+(await token.balanceOf(third.address)), thirdStageBalance);
        });

        it('close investments (before end)', async () => {
            try {
                await third.close({from: investOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Investing are still ongoin"));}
            assert.equal(+(await token.balanceOf(third.address)), thirdStageBalance);
        });

        it('invest (after end)', async () => {
            await increaseTime(duration);

            bal1 = await web3.eth.getBalance(accounts[2]);
            balc1 = await web3.eth.getBalance(third.address);

            try {
                await web3.eth.sendTransaction({from: accounts[2], to: third.address, gas: 150000, value: vs(1)});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Investing time is up"));}

            bal2 = await web3.eth.getBalance(accounts[2]);
            balc2 = await web3.eth.getBalance(third.address);

            assert(0 < bal2 - bal1 < 0.01 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, 0);
        });

        it('invest (zero value)', async () => {
            bal1 = await web3.eth.getBalance(accounts[2]);
            balc1 = await web3.eth.getBalance(third.address);

            try {
                await web3.eth.sendTransaction({from: accounts[2], to: third.address, gas: 150000, value: 0});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Value must be greater than 0"));}

            bal2 = await web3.eth.getBalance(accounts[2]);
            balc2 = await web3.eth.getBalance(third.address);

            assert(0 < bal2 - bal1 < 0.1 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, 0);
        });
    });
 });