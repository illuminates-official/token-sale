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

    let bal1, bal2, balc1, balc2;


    describe('Manual receiving tokens', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            second = await StageSecondContract.new({from: investOwner});
            await token.sendTokens([second.address], [secondStageBalance], {from: tokenOwner});
            await second.setToken(token.address, {from: investOwner});
        });

        it('recieving tokens', async () => {
            bal1 = await web3.eth.getBalance(receiver);
            balc1 = await web3.eth.getBalance(second.address);

            await web3.eth.sendTransaction({from: accounts[2], to: second.address, gas: 150000, value: vs(10)});
            await web3.eth.sendTransaction({from: accounts[3], to: second.address, gas: 150000, value: vs(10)});
            await web3.eth.sendTransaction({from: accounts[4], to: second.address, gas: 150000, value: vs(20)});
            await web3.eth.sendTransaction({from: accounts[5], to: second.address, gas: 150000, value: vs(5)});

            balc2 = await web3.eth.getBalance(second.address);

            assert.equal(balc1, 0);
            assert.equal(balc2, vs(45));
            assert.equal(+(await second.totalInvested()), vs(45));
            assert.equal(+(await second.investments(accounts[2])), vs(10));
            assert.equal(await second.investors(0), accounts[2]);
            assert.equal(await second.investors(1), accounts[3]);
            assert.equal(await second.investors(2), accounts[4]);
            assert.equal(await second.investors(3), accounts[5]);
            assert.equal(+(await token.balanceOf(second.address)), secondStageBalance);
            assert.equal(+(await second.totalCap()), vs(450));

            await second.receiveTokens({from: accounts[2]});

            bal2 = await web3.eth.getBalance(receiver);
            balc1 = await web3.eth.getBalance(second.address);

            assert(0 < bal2 - 10 * decimals - bal1 < 0.1 * decimals);
            assert.equal(balc1, vs(35));
            assert.equal(+(await second.totalInvested()), vs(45));
            assert.equal(await second.investments(accounts[2]), 0);
            assert.equal(await second.investors(0), accounts[5]);
            assert.equal(await second.investors(1), accounts[3]);
            assert.equal(await second.investors(2), accounts[4]);
            assert.equal(+(await token.balanceOf(second.address)), vs(900000 - 20000));
            assert.equal(+(await token.balanceOf(accounts[2])), vs(20000));
            assert.equal(+(await second.totalCap()), vs(450));

            bal1 = await web3.eth.getBalance(receiver);

            await second.receiveTokens({from: accounts[3]});

            bal2 = await web3.eth.getBalance(receiver);
            balc2 = await web3.eth.getBalance(second.address);

            assert(0 < bal2 - 10 * decimals - bal1 < 0.1 * decimals);
            assert.equal(balc2, vs(25));
            assert.equal(+(await second.totalInvested()), vs(45));
            assert.equal(await second.investments(accounts[3]), 0);
            assert.equal(await second.investors(0), accounts[5]);
            assert.equal(await second.investors(1), accounts[4]);
            assert.equal(+(await token.balanceOf(second.address)), vs(900000 - 20000*2));
            assert.equal(+(await token.balanceOf(accounts[3])), vs(20000));
            assert.equal(+(await second.totalCap()), vs(450));
        });

        it('one more investment after receiving', async () => {
            await web3.eth.sendTransaction({from: accounts[2], to: second.address, gas: 150000, value: vs(10)});
            assert.equal(+(await second.totalInvested()), vs(10));
            await second.receiveTokens({from: accounts[2]});
            assert.equal(await second.investments(accounts[2]), 0);
            assert.equal(+(await second.totalCap()), vs(450));
            assert.equal(+(await second.totalInvested()), vs(10));

            await web3.eth.sendTransaction({from: accounts[2], to: second.address, gas: 150000, value: vs(10)});
            assert.equal(+(await second.totalInvested()), vs(20));
            await second.receiveTokens({from: accounts[2]});
            assert.equal(await second.investments(accounts[2]), 0);
            assert.equal(+(await second.totalCap()), vs(450));
            assert.equal(+(await second.totalInvested()), vs(20));
        });

        it('investment and closing after receiving tokens', async () => {
            await web3.eth.sendTransaction({from: accounts[2], to: second.address, gas: 150000, value: vs(60)});
            await web3.eth.sendTransaction({from: accounts[3], to: second.address, gas: 150000, value: vs(75)});
            await web3.eth.sendTransaction({from: accounts[4], to: second.address, gas: 150000, value: vs(75)});
            await web3.eth.sendTransaction({from: accounts[5], to: second.address, gas: 150000, value: vs(10)});

            assert.equal(+(await second.totalInvested()), vs(220));
            await second.receiveTokens({from: accounts[2]});
            assert.equal(+(await second.totalCap()), vs(450));
            assert.equal(+(await second.totalInvested()), vs(220));

            await web3.eth.sendTransaction({from: accounts[5], to: second.address, gas: 150000, value: vs(70)});
            await web3.eth.sendTransaction({from: accounts[6], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[7], to: second.address, gas: 150000, value: vs(70)});

            await increaseTime(duration);

            await second.close({from: investOwner});

            assert.equal(+(await token.balanceOf(second.address)), 0);
            assert.equal(+(await token.balanceOf(accounts[2])), vs(120000));
            assert.equal(+(await token.balanceOf(accounts[5])), vs(160000));
        });
    });


    describe('Requirements and restrictions', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            second = await StageSecondContract.new({from: investOwner});
            await token.sendTokens([second.address], [secondStageBalance], {from: tokenOwner});
            await second.setToken(token.address, {from: investOwner});
        });

        it('try to receive tokens without investments', async () => {
            bal1 = await web3.eth.getBalance(receiver);
            balc1 = await web3.eth.getBalance(second.address);

            await web3.eth.sendTransaction({from: accounts[7], to: second.address, gas: 150000, value: vs(10)});

            balc2 = await web3.eth.getBalance(second.address);

            assert.equal(balc1, 0);
            assert.equal(balc2, vs(10));
            assert.equal(+(await second.totalInvested()), vs(10));
            assert.equal(+(await second.investments(accounts[2])), 0);
            assert.equal(await second.investors(0), accounts[7]);

            try {
                await second.receiveTokens({from: accounts[2]});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Not invested"));}

            await increaseTime(duration);
            await second.close({from: investOwner});
        });
    });
 });