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

    describe('Duration', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            first = await StageFirstContract.new({from: investOwner});
            await token.sendTokens([first.address], [firstStageBalance], {from: tokenOwner});
            await first.setToken(token.address, {from: investOwner});
        });

        it('try to close after first duration, but before second, when cap not reached', async () => {
            await web3.eth.sendTransaction({from: accounts[2], to: first.address, gas: 150000, value: 100});

            await increaseTime(fduration);

            try {
                await first.close({from: investOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Investing are still ongoing"));}

            assert.equal(+(await first.investments(accounts[2])), 100);
            assert.equal(await first.investors(0), accounts[2]);
            assert.equal(+(await first.totalInvested()), 100);
        });

        it('try to close before first duration, when cap not reached', async () => {
            await web3.eth.sendTransaction({from: accounts[2], to: first.address, gas: 150000, value: 100});

            await increaseTime(2*day);

            try {
                await first.close({from: investOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Investing are still ongoing"));}

            assert.equal(+(await first.investments(accounts[2])), 100);
            assert.equal(await first.investors(0), accounts[2]);
            assert.equal(+(await first.totalInvested()), 100);
        });

        it('try to close before first duration, when cap reached', async () => {
            assert.equal(+(await token.balanceOf(first.address)), firstStageBalance);

            await web3.eth.sendTransaction({from: accounts[2], to: first.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[3], to: first.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[4], to: first.address, gas: 150000, value: vs(35)});
            await web3.eth.sendTransaction({from: accounts[5], to: first.address, gas: 150000, value: vs(10)});

            await increaseTime(2*day);

            assert.equal(+(await first.totalInvested()), vs(225));

            assert(+(await web3.eth.getBalance(receiver)) >= vs(99));
            assert(+(await web3.eth.getBalance(receiver)) < vs(100));

            try {
                await first.close({from: investOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Investing are still ongoin"));}
            assert.equal(+(await token.balanceOf(first.address)), firstStageBalance);
        });

        it('try to close after first duration, but before second duration, when cap reached', async () => {
            assert.equal(+(await token.balanceOf(first.address)), firstStageBalance);

            await web3.eth.sendTransaction({from: accounts[4], to: first.address, gas: 150000, value: vs(50)});
            await web3.eth.sendTransaction({from: accounts[5], to: first.address, gas: 150000, value: vs(80)});
            await web3.eth.sendTransaction({from: accounts[6], to: first.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[7], to: first.address, gas: 150000, value: vs(5)});

            await increaseTime(fduration);

            assert.equal(+(await first.totalInvested()), vs(225));

            assert(+(await web3.eth.getBalance(receiver)) >= vs(99));
            assert(+(await web3.eth.getBalance(receiver)) < vs(100));

            await first.close({from: investOwner});

            assert.equal(+(await token.balanceOf(accounts[4])), vs(150000));
            assert.equal(+(await token.balanceOf(accounts[5])), vs(240000));
            assert.equal(+(await token.balanceOf(accounts[6])), vs(270000));
            assert.equal(+(await token.balanceOf(accounts[7])), vs(15000));

            assert(+(await web3.eth.getBalance(receiver)) >= vs(324));
            assert(+(await web3.eth.getBalance(receiver)) < vs(325));
        });
    });
 });