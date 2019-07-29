pragma solidity ^0.5.10;

import "./ERC20.sol";
import "./Ownable.sol";
import "./SafeMath.sol";

contract Token is ERC20, Ownable {

    using SafeMath for uint;

    string public constant name = "Test token";
    string public constant symbol = "TEST";
    uint public constant decimals = 18;

    constructor() public {
        _mint(address(this), 100000000 * 10 ** decimals);
    }

    function() external {
        revert();
    }

    function sendTokens(address[] memory _receivers, uint[] memory _amounts) public onlyOwner {
        require(_receivers.length == _amounts.length, "The length of the arrays must be equal");

        for (uint i = 0; i < _receivers.length; i++) {
            _transfer(address(this), _receivers[i], _amounts[i]);
        }
    }
}