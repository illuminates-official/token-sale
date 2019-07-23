pragma solidity ^0.5.10;

import "./IERC20.sol";
import "./Ownable.sol";
import "./SafeMath.sol";
import "./ReentrancyGuard.sol";

contract StageSecond is Ownable, ReentrancyGuard {

    using SafeMath for uint;

    IERC20 public token;
    address payable public reciever;

    uint constant public duration = 90 days;
    uint public deployTime;
    uint private initTokens;
    uint private currentBalance;

    mapping (address => uint) public investments;
    address payable[] public investors;
    uint public totalInvested;
    uint public currentInvested;
    uint public totalCap;
    uint public currentCap;

    modifier capReached() {
        require(totalInvested == totalCap, "Cap not reached yet");
        _;
    }

    modifier capNotReached() {
        require(totalInvested < totalCap, "Cap already reached");
        _;
    }

    modifier timeOut() {
        require(now >= deployTime.add(duration), "Investing are still ongoing");
        _;
    }

    modifier inTime() {
        require(now < deployTime.add(duration), "Investing time is up");
        _;
    }

    constructor() public {
        reciever = msg.sender;
        deployTime = now;

        totalCap = 450 ether;
        currentCap = totalCap;

        initTokens = 900000 * 10**18;
        currentBalance = initTokens;
    }

    function() external payable {
        invest();
    }

    function invest() public payable nonReentrant inTime capNotReached {
        require(msg.value > 0, "Value must be greater than 0");
        uint value;
        if(totalInvested + msg.value > totalCap) {
            value = totalCap.sub(totalInvested);
            msg.sender.transfer(msg.value.sub(value));
        } else value = msg.value;

        if(investments[msg.sender] <= 0) investors.push(msg.sender);
        investments[msg.sender] = investments[msg.sender].add(value);
        totalInvested = totalInvested.add(value);
        currentInvested = currentInvested.add(value);
    }

    function setToken(address _token) public onlyOwner {
        token = IERC20(_token);
        // initTokens = balance();
    }

    function close() public onlyOwner timeOut {
        require(currentBalance > 0, "Tokens out");
        if(totalInvested >= totalCap) {
            sendTokens();
            recieveEther();
        }
        else {
            returnTokens();
            returnEther();
        }
    }

    function recieveTokens() public nonReentrant {
        require(investments[msg.sender] > 0, "Not invested");

        uint amount = tokensAmount(investments[msg.sender]);
        _transfer(msg.sender, amount);
        currentBalance = currentBalance.sub(amount);

        _sendEther(reciever, investments[msg.sender]);
        currentInvested = currentInvested.sub(investments[msg.sender]);
        currentCap = currentCap.sub(investments[msg.sender]);
        investments[msg.sender] = 0;

        for (uint i = 0; i < investors.length; i++){
            if (investors[i] == msg.sender){
                investors[i] = investors[investors.length - 1];
                investors.pop();
                return;
            }
        }
        revert("Tokens already received");
    }

    function sendTokens() private {
        for (uint i = 0; i < investors.length; i++) {
            _transfer(investors[i], tokensAmount(investments[investors[i]]));
        }
    }

    function returnTokens() private {
        _transfer(address(token), currentBalance);
    }

    function recieveEther() private {
        _sendEther(reciever, address(this).balance);
    }

    function returnEther() private {
        for (uint i = 0; i < investors.length; i++) {
            _sendEther(investors[i], investments[investors[i]]);
        }
    }

    function _sendEther(address payable _reciever, uint _value) private {
        _reciever.transfer(_value);
    }

    function _transfer(address to, uint amount) private {
        token.transfer(to, amount);
    }

    function tokensAmount(uint value) public view returns(uint) {
        return currentBalance.mul(value).div(currentCap);
    }
}