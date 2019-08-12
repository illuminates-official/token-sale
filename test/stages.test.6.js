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
    let advisors = accounts[9];
    let bounty = accounts[0];
    let team = accounts[7];

    let secondStageBalance = vs(900000);

    let duration = 90*day;

    describe('Requirements and restrictions', async () => {
        beforeEach('init', async () => {
            token = await TokenContract.new({from: tokenOwner});
            second = await StageSecondContract.new({from: investOwner});
            await token.sendTokens([second.address], [secondStageBalance], {from: tokenOwner});
            await second.setToken(token.address, {from: investOwner});
        });

        it('try to close investing after all investors force tokens` receiving', async () => {
            await web3.eth.sendTransaction({from: accounts[2], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[3], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[4], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[5], to: second.address, gas: 150000, value: vs(90)});
            await web3.eth.sendTransaction({from: accounts[6], to: second.address, gas: 150000, value: vs(90)});

            assert.equal(+(await second.totalInvested()), vs(450));
            await second.receiveTokens({from: accounts[2]});
            await second.receiveTokens({from: accounts[3]});
            await second.receiveTokens({from: accounts[4]});
            await second.receiveTokens({from: accounts[5]});
            await second.receiveTokens({from: accounts[6]});
            assert.equal(+(await second.totalCap()), vs(450));
            assert.equal(+(await second.totalInvested()), vs(450));

            assert.equal(+(await token.balanceOf(second.address)), 0);
            assert.equal(+(await token.balanceOf(accounts[2])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[3])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[4])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[5])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[6])), vs(180000));

            await increaseTime(duration);

            try {
                await second.close({from: investOwner});
                throw "Fail!\n Exception must be thrown before";
            } catch (error) {assert(error.message.includes("Tokens out"));}

            assert.equal(+(await token.balanceOf(second.address)), 0);
            assert.equal(+(await token.balanceOf(accounts[2])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[3])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[4])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[5])), vs(180000));
            assert.equal(+(await token.balanceOf(accounts[6])), vs(180000));
        });
    });
 });