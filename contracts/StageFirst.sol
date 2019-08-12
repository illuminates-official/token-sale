pragma solidity ^0.5.10;

import "./IERC20.sol";
import "./SafeMath.sol";
import "./Ownable.sol";

contract StageFirst is Ownable {

    using SafeMath for uint;

    IERC20 public token;
    address payable public receiver;

    uint constant firstDuration = 13 days;
    uint constant secondDuration = 14 days;
    uint private deployTime;
    uint private initTokens;
    uint private currentBalance;

    mapping (address => uint) public investments;
    address payable[] public investors;
    uint public totalInvested;
    uint private currentInvested;
    uint public totalCap;
    uint private currentCap;

    event Investment(address indexed sender, uint indexed value);
    event Receive(address indexed receiver, uint indexed amount);

    modifier capReached() {
        require(totalInvested == totalCap, "Cap not reached yet");
        _;
    }

    modifier capNotReached() {
        require(totalInvested < totalCap, "Cap already reached");
        _;
    }

    modifier fundraisingTimeOut() {
        require(now >= deployTime.add(firstDuration), "Investing are still ongoing");
        _;
    }

    modifier timeOut() {
        require(now >= deployTime.add(firstDuration.add(secondDuration)), "Investing are still ongoing");
        _;
    }

    modifier inTime() {
        require(now < deployTime.add(firstDuration.add(secondDuration)), "Investing time is up");
        _;
    }

    constructor() public {
        receiver = msg.sender;
        deployTime = now;

        totalCap = 225 ether;
        currentCap = totalCap;

        initTokens = 675000 * 10**18;
        currentBalance = initTokens;
    }

    function() external payable {
        invest();
    }

    function invest() private inTime capNotReached {
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

        emit Investment(msg.sender, value);
    }

    function setToken(address _token) public onlyOwner {
        token = IERC20(_token);
    }

    function close() public onlyOwner fundraisingTimeOut {
        if(totalInvested == totalCap) {
            sendTokens();
            receiveEther();
        }
        else if(now < deployTime.add(firstDuration.add(secondDuration))) {
            revert("Investing are still ongoing");
        }
        else {
            returnTokens();
            returnEther();
        }
    }

    function sendTokens() private {
        for (uint i = 0; i < investors.length; i++) {
            _transfer(investors[i], tokensAmount(investments[investors[i]]));
        }
    }

    function returnTokens() private {
        _transfer(address(token), currentBalance);
    }

    function receiveEther() private {
        _sendEther(receiver, address(this).balance);
    }

    function returnEther() private {
        for (uint i = 0; i < investors.length; i++) {
            _sendEther(investors[i], investments[investors[i]]);
        }
    }

    function _sendEther(address payable _receiver, uint _value) private {
        _receiver.transfer(_value);
    }

    function _transfer(address to, uint amount) private {
        token.transfer(to, amount);
    }

    function tokensAmount(uint value) public view returns(uint) {
        return currentBalance.mul(value).div(currentCap);
    }
}