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
    let receiver = investOwner;
    let advisors = accounts[9];
    let bounty = accounts[0];
    let team = accounts[7];

    let secondStageBalance = vs(900000);

    let duration = 90*days;

    let bal1, bal2, balc1, balc2;

    
    describe('Requirements and restrictions', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            second = await StageSecondContract.new({from: investOwner});
            await token.sendTokens([second.address], [secondStageBalance], {from: tokenOwner});
            await second.setToken(token.address, {from: investOwner});
        });

        it('setting token not by owner', async () => {
            try {
                await second.setToken(team, {from: tokenOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Ownable: caller is not the owner"));}
            assert.equal(await second.token(), token.address);

            try {
                await second.setToken(team, {from: accounts[9]});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Ownable: caller is not the owner"));}
            assert.equal(await second.token(), token.address);
        });

        it('close investments (cap not reached)', async () => {
            assert.equal(+(await token.balanceOf(second.address)), vs(900000));
            bal1 = await web3.eth.getBalance(accounts[4]);
            balc1 = await web3.eth.getBalance(second.address);

            await web3.eth.sendTransaction({from: accounts[4], to: second.address, gas: 150000, value: vs(5)});

            await increaseTime(duration + 1);

            await second.close({from: investOwner});

            assert.equal(+(await token.balanceOf(second.address)), 0);
            assert.equal(+(await token.balanceOf(token.address)), vs(100000000));
            bal2 = await web3.eth.getBalance(accounts[4]);
            balc2 = await web3.eth.getBalance(second.address);

            assert(0 < bal2 - bal1 < 0.01 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, 0);
        });

        it('close investments (not by owner)', async () => {
            await increaseTime(duration+1);

            try {
                await second.close({from: tokenOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Ownable: caller is not the owner"));}
            assert.equal(+(await token.balanceOf(second.address)), secondStageBalance);

            try {
                await second.close({from: accounts[9]});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Ownable: caller is not the owner"));}
            assert.equal(+(await token.balanceOf(second.address)), secondStageBalance);
        });

        it('close investments (before end)', async () => {
            try {
                await second.close({from: investOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Investing are still ongoin"));}
            assert.equal(+(await token.balanceOf(second.address)), secondStageBalance);
        });

        it('invest (after end)', async () => {
            await increaseTime(duration);

            bal1 = await web3.eth.getBalance(accounts[2]);
            balc1 = await web3.eth.getBalance(second.address);

            try {
                await web3.eth.sendTransaction({from: accounts[2], to: second.address, gas: 150000, value: vs(1)});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Investing time is up"));}

            bal2 = await web3.eth.getBalance(accounts[2]);
            balc2 = await web3.eth.getBalance(second.address);

            assert(0 < bal2 - bal1 < 0.01 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, 0);
        });

        it('invest (zero value)', async () => {
            bal1 = await web3.eth.getBalance(accounts[2]);
            balc1 = await web3.eth.getBalance(second.address);

            try {
                await web3.eth.sendTransaction({from: accounts[2], to: second.address, gas: 150000, value: 0});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Value must be greater than 0"));}

            bal2 = await web3.eth.getBalance(accounts[2]);
            balc2 = await web3.eth.getBalance(second.address);

            assert(0 < bal2 - bal1 < 0.1 * decimals);

            assert.equal(balc1, 0);
            assert.equal(balc2, 0);
        });
    });


    describe('Invest functionality', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            second = await StageSecondContract.new({from: investOwner});
            await token.sendTokens([second.address], [secondStageBalance], {from: tokenOwner});
            await second.setToken(token.address, {from: investOwner});
        });

        it('try to send eth', async () => {
            await web3.eth.sendTransaction({from: accounts[2], to: second.address, gas: 150000, value: 100});

            assert.equal(+(await second.investments(accounts[2])), 100);
            assert.equal(await second.investors(0), accounts[2]);
            assert.equal(+(await second.totalInvested()), 100);
        });

        it('normal close investing (and overcap check)', async () => {
            assert.equal(+(await token.balanceOf(second.address)), secondStageBalance);
            bal1 = await web3.eth.getBalance(accounts[7]);

            await web3.eth.sendTransaction({from: accounts[2], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[3], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[4], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[5], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[6], to: second.address, gas: 150000, value: vs(90)});

            try {
                await web3.eth.sendTransaction({from: accounts[7], to: second.address, gas: 150000, value: vs(10)});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Cap already reached"));}
            bal2 = await web3.eth.getBalance(accounts[7]);
            assert(0 < bal2 - bal1 < 0.1 * decimals);

            await increaseTime(duration);

            assert.equal(+(await second.totalInvested()), vs(450));
            
            assert(+(await web3.eth.getBalance(receiver)) >= vs(99));
            assert(+(await web3.eth.getBalance(receiver)) < vs(100));

            await second.close({from: investOwner});

            assert.equal(+(await token.balanceOf(accounts[2])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[3])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[4])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[5])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[6])), vs(180000));

            assert(+(await web3.eth.getBalance(receiver)) >= vs(549));
            assert(+(await web3.eth.getBalance(receiver)) < vs(550));
        });
    });
 });