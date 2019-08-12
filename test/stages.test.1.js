const TokenContract = artifacts.require("./Token.sol");
const StageFirstContract = artifacts.require("./StageFirst.sol");


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


contract('StageFirst', function (accounts) {

    let tokenOwner = accounts[0];
    let investOwner = accounts[1];
    let receiver = investOwner;
    let advisors = accounts[9];
    let bounty = accounts[0];
    let team = accounts[7];

    let firstStageBalance = vs(675000);

    let fduration = 13*day;
    let sduration = 14*day;

    let bal1, bal2, balc1, balc2;

    describe('Invest functionality', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            first = await StageFirstContract.new({from: investOwner});
            await token.sendTokens([first.address], [firstStageBalance], {from: tokenOwner});
            await first.setToken(token.address, {from: investOwner});
        });

        it('try to send eth', async () => {
            await web3.eth.sendTransaction({from: accounts[2], to: first.address, gas: 150000, value: 100});

            assert.equal(+(await first.investments(accounts[2])), 100);
            assert.equal(await first.investors(0), accounts[2]);
            assert.equal(+(await first.totalInvested()), 100);
        });

        it('tokens amount', async () => {
            assert.equal(+(await token.balanceOf(first.address)), firstStageBalance);

            assert.equal(+(await first.tokensAmount(v(0.5))), vs(1500));
            assert.equal(+(await first.tokensAmount(v(0.1))), vs(300));
            assert.equal(+(await first.tokensAmount(v(0.001))), v(3));
            assert.equal(+(await first.tokensAmount(v(0.0001))), v(0.3));
            assert.equal(+(await first.tokensAmount(v(0.00001))), v(0.03));
            assert.equal(+(await first.tokensAmount(v(0.000001))), 3.0e+15);
            assert.equal(+(await first.tokensAmount(1000000000)), v(0.000003));
            assert.equal(+(await first.tokensAmount(1)), v(0.000000000000003));
        });

        it('normal close investing', async () => {
            assert.equal(+(await token.balanceOf(first.address)), firstStageBalance);

            await web3.eth.sendTransaction({from: accounts[2], to: first.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[3], to: first.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[4], to: first.address, gas: 150000, value: vs(35)});
            await web3.eth.sendTransaction({from: accounts[5], to: first.address, gas: 150000, value: vs(10)});

            await increaseTime(fduration);

            assert.equal(+(await first.totalInvested()), vs(225));

            assert(+(await web3.eth.getBalance(receiver)) >= vs(99));
            assert(+(await web3.eth.getBalance(receiver)) < vs(100));

            await first.close({from: investOwner});

            assert.equal(+(await token.balanceOf(accounts[2])), vs(270000));
            assert.equal(+(await token.balanceOf(accounts[3])), vs(270000));
            assert.equal(+(await token.balanceOf(accounts[4])), vs(105000));
            assert.equal(+(await token.balanceOf(accounts[5])), vs(30000));

            assert(+(await web3.eth.getBalance(receiver)) >= vs(324));
            assert(+(await web3.eth.getBalance(receiver)) < vs(325));
        });
    });


    describe('Requirements and restrictions', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            first = await StageFirstContract.new({from: investOwner});
            await token.sendTokens([first.address], [firstStageBalance], {from: tokenOwner});
            await first.setToken(token.address, {from: investOwner});
        });

        it('setting token not by owner', async () => {
            try {
                await first.setToken(team, {from: tokenOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Ownable: caller is not the owner"));}
            assert.equal(await first.token(), token.address);

            try {
                await first.setToken(team, {from: accounts[9]});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Ownable: caller is not the owner"));}
            assert.equal(await first.token(), token.address);
        });

        it('close investments (cap not reached)', async () => {
            assert.equal(+(await token.balanceOf(first.address)), vs(675000));
            bal1 = await web3.eth.getBalance(accounts[4]);
            balc1 = await web3.eth.getBalance(first.address);

            await web3.eth.sendTransaction({from: accounts[4], to: first.address, gas: 150000, value: vs(5)});

            await increaseTime(fduration + sduration);

            await first.close({from: investOwner});

            assert.equal(+(await token.balanceOf(first.address)), 0);
            assert.equal(+(await token.balanceOf(token.address)), vs(100000000));
            bal2 = await web3.eth.getBalance(accounts[4]);
            balc2 = await web3.eth.getBalance(first.address);

            assert(0 < bal2 - bal1 < 0.01 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, 0);
        });

        it('close investments (not by owner)', async () => {
            await increaseTime(fduration);

            try {
                await first.close({from: tokenOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Ownable: caller is not the owner"));}
            assert.equal(+(await token.balanceOf(first.address)), firstStageBalance);

            try {
                await first.close({from: accounts[9]});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Ownable: caller is not the owner"));}
            assert.equal(+(await token.balanceOf(first.address)), firstStageBalance);
        });

        it('close investments (before end)', async () => {
            try {
                await first.close({from: investOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Investing are still ongoin"));}
            assert.equal(+(await token.balanceOf(first.address)), firstStageBalance);
        });

        it('invest (after end)', async () => {
            await increaseTime(fduration + sduration);

            bal1 = await web3.eth.getBalance(accounts[2]);
            balc1 = await web3.eth.getBalance(first.address);

            try {
                await web3.eth.sendTransaction({from: accounts[2], to: first.address, gas: 150000, value: vs(1)});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Investing time is up"));}

            bal2 = await web3.eth.getBalance(accounts[2]);
            balc2 = await web3.eth.getBalance(first.address);

            assert(0 < bal2 - bal1 < 0.01 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, 0);
        });

        it('invest (zero value)', async () => {
            bal1 = await web3.eth.getBalance(accounts[2]);
            balc1 = await web3.eth.getBalance(first.address);

            try {
                await web3.eth.sendTransaction({from: accounts[2], to: first.address, gas: 150000, value: 0});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Value must be greater than 0"));}

            bal2 = await web3.eth.getBalance(accounts[2]);
            balc2 = await web3.eth.getBalance(first.address);

            assert(0 < bal2 - bal1 < 0.1 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, 0);
        });

        it('invest (overcap)', async () => {
            bal1 = await web3.eth.getBalance(accounts[7]);
            balc1 = await web3.eth.getBalance(first.address);

            await web3.eth.sendTransaction({from: accounts[4], to: first.address, gas: 150000, value: vs(50)});
            await web3.eth.sendTransaction({from: accounts[5], to: first.address, gas: 150000, value: vs(80)});
            await web3.eth.sendTransaction({from: accounts[6], to: first.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[7], to: first.address, gas: 150000, value: vs(5)});

            try {
                await web3.eth.sendTransaction({from: accounts[7], to: first.address, gas: 150000, value: vs(5)});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Cap already reached"));}

            bal2 = await web3.eth.getBalance(accounts[7]);
            balc2 = await web3.eth.getBalance(first.address);

            assert(0 < bal2 - 5 * decimals - bal1 < 0.01 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, vs(225));
        });

        it('invest (overcap, but while transaction)', async () => {
            bal1 = await web3.eth.getBalance(accounts[9]);
            balc1 = await web3.eth.getBalance(first.address);

            await web3.eth.sendTransaction({from: accounts[7], to: first.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[8], to: first.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[9], to: first.address, gas: 150000, value: vs(40)});

            bal2 = await web3.eth.getBalance(accounts[9]);
            balc2 = await web3.eth.getBalance(first.address);

            assert(0 < bal2 - 40 * decimals - bal1 < 0.01 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, vs(220));

            await web3.eth.sendTransaction({from: accounts[9], to: first.address, gas: 150000, value: vs(10)});

            bal2 = await web3.eth.getBalance(accounts[9]);
            balc2 = await web3.eth.getBalance(first.address);

            assert(0 < bal2 - 45 * decimals - bal1 < 0.01 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, vs(225));
        });
    });
 });