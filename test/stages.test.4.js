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

    let duration = 14*day;

    let bal1, bal2, balc1, balc2;


    describe('Manual receiving tokens', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            first = await StageFirstContract.new({from: investOwner});
            await token.sendTokens([first.address], [firstStageBalance], {from: tokenOwner});
            await first.setToken(token.address, {from: investOwner});
        });

        it('recieving tokens', async () => {
            bal1 = await web3.eth.getBalance(receiver);
            balc1 = await web3.eth.getBalance(first.address);

            await web3.eth.sendTransaction({from: accounts[2], to: first.address, gas: 150000, value: vs(10)});
            await web3.eth.sendTransaction({from: accounts[3], to: first.address, gas: 150000, value: vs(10)});
            await web3.eth.sendTransaction({from: accounts[4], to: first.address, gas: 150000, value: vs(20)});
            await web3.eth.sendTransaction({from: accounts[5], to: first.address, gas: 150000, value: vs(5)});

            balc2 = await web3.eth.getBalance(first.address);

            assert.equal(balc1, 0);
            assert.equal(balc2, vs(45));
            assert.equal(+(await first.totalInvested()), vs(45));
            assert.equal(+(await first.investments(accounts[2])), vs(10));
            assert.equal(await first.investors(0), accounts[2]);
            assert.equal(await first.investors(1), accounts[3]);
            assert.equal(await first.investors(2), accounts[4]);
            assert.equal(await first.investors(3), accounts[5]);
            assert.equal(+(await token.balanceOf(first.address)), firstStageBalance);
            assert.equal(+(await first.totalCap()), vs(225));

            await first.receiveTokens({from: accounts[2]});

            bal2 = await web3.eth.getBalance(receiver);
            balc1 = await web3.eth.getBalance(first.address);

            assert(0 < bal2 - 10 * decimals - bal1 < 0.1 * decimals);
            assert.equal(balc1, vs(35));
            assert.equal(+(await first.totalInvested()), vs(45));
            assert.equal(await first.investments(accounts[2]), 0);
            assert.equal(await first.investors(0), accounts[5]);
            assert.equal(await first.investors(1), accounts[3]);
            assert.equal(await first.investors(2), accounts[4]);
            assert.equal(+(await token.balanceOf(first.address)), vs(675000 - 30000));
            assert.equal(+(await token.balanceOf(accounts[2])), vs(30000));
            assert.equal(+(await first.totalCap()), vs(225));

            bal1 = await web3.eth.getBalance(receiver);

            await first.receiveTokens({from: accounts[3]});

            bal2 = await web3.eth.getBalance(receiver);
            balc2 = await web3.eth.getBalance(first.address);

            assert(0 < bal2 - 10 * decimals - bal1 < 0.1 * decimals);
            assert.equal(balc2, vs(25));
            assert.equal(+(await first.totalInvested()), vs(45));
            assert.equal(await first.investments(accounts[3]), 0);
            assert.equal(await first.investors(0), accounts[5]);
            assert.equal(await first.investors(1), accounts[4]);
            assert.equal(+(await token.balanceOf(first.address)), vs(675000 - 30000*2));
            assert.equal(+(await token.balanceOf(accounts[3])), vs(30000));
            assert.equal(+(await first.totalCap()), vs(225));
        });

        it('one more investment after receiving', async () => {
            await web3.eth.sendTransaction({from: accounts[2], to: first.address, gas: 150000, value: vs(10)});
            assert.equal(+(await first.totalInvested()), vs(10));
            await first.receiveTokens({from: accounts[2]});
            assert.equal(await first.investments(accounts[2]), 0);
            assert.equal(+(await first.totalCap()), vs(225));
            assert.equal(+(await first.totalInvested()), vs(10));

            await web3.eth.sendTransaction({from: accounts[2], to: first.address, gas: 150000, value: vs(10)});
            assert.equal(+(await first.totalInvested()), vs(20));
            await first.receiveTokens({from: accounts[2]});
            assert.equal(await first.investments(accounts[2]), 0);
            assert.equal(+(await first.totalCap()), vs(225));
            assert.equal(+(await first.totalInvested()), vs(20));
        });

        it('investment and closing after receiving tokens', async () => {
            await web3.eth.sendTransaction({from: accounts[2], to: first.address, gas: 150000, value: vs(60)});
            await web3.eth.sendTransaction({from: accounts[3], to: first.address, gas: 150000, value: vs(75)});
            await web3.eth.sendTransaction({from: accounts[4], to: first.address, gas: 150000, value: vs(75)});
            await web3.eth.sendTransaction({from: accounts[5], to: first.address, gas: 150000, value: vs(10)});

            assert.equal(+(await first.totalInvested()), vs(220));
            await first.receiveTokens({from: accounts[2]});
            assert.equal(+(await first.totalCap()), vs(225));
            assert.equal(+(await first.totalInvested()), vs(220));

            await web3.eth.sendTransaction({from: accounts[5], to: first.address, gas: 150000, value: vs(5)});

            await increaseTime(duration);

            await first.close({from: investOwner});

            assert.equal(+(await token.balanceOf(first.address)), 0);
            assert.equal(+(await token.balanceOf(accounts[2])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[5])), vs(45000));
        });
    });


    describe('Requirements and restrictions', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            first = await StageFirstContract.new({from: investOwner});
            await token.sendTokens([first.address], [firstStageBalance], {from: tokenOwner});
            await first.setToken(token.address, {from: investOwner});
        });

        it('try to receive tokens without investments', async () => {
            bal1 = await web3.eth.getBalance(receiver);
            balc1 = await web3.eth.getBalance(first.address);

            await web3.eth.sendTransaction({from: accounts[5], to: first.address, gas: 150000, value: vs(10)});

            balc2 = await web3.eth.getBalance(first.address);

            assert.equal(balc1, 0);
            assert.equal(balc2, vs(10));
            assert.equal(+(await first.totalInvested()), vs(10));
            assert.equal(+(await first.investments(accounts[2])), 0);
            assert.equal(await first.investors(0), accounts[5]);

            try {
                await first.receiveTokens({from: accounts[2]});
                console.log("fail.\n Exception must be thrown before");
            } catch (error) {assert(error.message.includes("Not invested"));}

            await increaseTime(duration);
            await first.close({from: investOwner});
        });
        
        it('try to close investing after all investors force tokens` receiving', async () => {
            await web3.eth.sendTransaction({from: accounts[5], to: first.address, gas: 150000, value: vs(70)});
            await web3.eth.sendTransaction({from: accounts[6], to: first.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[7], to: first.address, gas: 150000, value: vs(65)});

            assert.equal(+(await first.totalInvested()), vs(225));
            await first.receiveTokens({from: accounts[5]});
            await first.receiveTokens({from: accounts[6]});
            await first.receiveTokens({from: accounts[7]});
            assert.equal(+(await first.totalCap()), vs(225));
            assert.equal(+(await first.totalInvested()), vs(225));

            assert.equal(+(await token.balanceOf(first.address)), 0);
            assert.equal(+(await token.balanceOf(accounts[5])), vs(210000));
            assert.equal(+(await token.balanceOf(accounts[6])), vs(270000));
            assert.equal(+(await token.balanceOf(accounts[7])), vs(195000));

            await increaseTime(duration);

            try {
                await first.close({from: investOwner});
                console.log("fail.\n Exception must be thrown before");
            } catch (error) {assert(error.message.includes("Tokens out"));}

            assert.equal(+(await token.balanceOf(first.address)), 0);
            assert.equal(+(await token.balanceOf(accounts[5])), vs(210000));
            assert.equal(+(await token.balanceOf(accounts[6])), vs(270000));
            assert.equal(+(await token.balanceOf(accounts[7])), vs(195000));
        });
    });
 });